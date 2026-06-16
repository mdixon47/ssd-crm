// ============================================================
// CRM Operations Agent
// Central orchestrator for SSD Consulting's CRM. Understands
// natural language commands and uses tool_use to read/write
// leads, draft emails, query campaigns, and schedule follow-ups.
//
// Architecture: Sonnet + agentic tool-use loop (max 8 turns).
// All writes go through Supabase; email drafts call EmailAgent.
// ⚠️  Appointments and leads created here are real DB writes.
//     Email drafts are returned for human review — never auto-sent.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_SONNET } from '~/lib/models'
import { runEmailAgent } from '~/agents/EmailAgent'
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'
import type { createSupabaseClient } from '~/server/utils/supabase'

type SupabaseClient = ReturnType<typeof createSupabaseClient>

const MAX_ITER = 8

export interface CRMActionLog {
  tool: string
  summary: string
}

export interface CRMAgentResponse {
  reply: string
  actions: CRMActionLog[]
}

const SYSTEM_PROMPT = `You are the SSD CRM Operations Agent — the central AI for SSD Consulting's CRM.
You understand natural language commands and use your tools to act on CRM data.

SSD CONSULTING OFFERINGS:
- Free Grant Writing Course (lead magnet / top-of-funnel)
- Grant Writing 101: Foundations (~$597 paid course)
- Grants Management Consulting ($5K–$25K contracts)
- Behavioral Health Consulting ($8K–$30K contracts)

PIPELINE STAGES (in order):
New Lead → Contacted → Booked Consultation → Sales Call → Qualified →
Proposal Sent → Contract Signed → Contract Paid → Purchased Course →
Became Consulting Client → Not a Fit → Lost/No Response

TRAFFIC SOURCES: google, facebook, instagram, linkedin, email, organic, bark

YOUR TOOLS:
- search_leads: Filter leads by stage, source, campaign, date range, or keyword
- get_lead_detail: Get full lead record + email history
- create_lead: Add a new lead with full UTM/attribution data
- update_lead: Update stage, notes, or assignment for a lead
- draft_email: AI-draft a follow-up email for a lead (human reviews before sending)
- get_campaign_performance: Aggregated campaign stats (spend, leads, qualified, revenue)
- create_appointment: Schedule a follow-up task or appointment for a lead

RULES:
- Always call tools to read real CRM data. Never invent lead names, stats, or campaign numbers.
- When adding a lead, capture all available attribution: source, campaign, keyword, landing page.
- Present drafted emails clearly for human review — never say an email was sent.
- For social media post writing requests, write the post content directly in your response — no tool needed.
- For "summarize leads" requests, call search_leads first, then synthesize from the results.
- Be concise, specific, and action-oriented. Format lists with bullet points.`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_leads',
    description: 'Search and filter leads from the CRM. Supports filtering by stage, source, campaign, date range, or keyword in interest/notes/org.',
    input_schema: {
      type: 'object' as const,
      properties: {
        stage: { type: 'string', description: 'Pipeline stage (e.g. "Qualified", "Proposal Sent", "New Lead")' },
        source: { type: 'string', description: 'Traffic source: google, facebook, instagram, linkedin, email, organic, bark' },
        campaign: { type: 'string', description: 'Campaign name (partial match)' },
        since_date: { type: 'string', description: 'ISO date — return leads created on or after this date (e.g. "2026-06-08")' },
        keyword: { type: 'string', description: 'Case-insensitive search in interest, notes, or org fields' },
        qualified: { type: 'string', enum: ['yes', 'no', 'partial'], description: 'Qualification status filter' },
        limit: { type: 'number', description: 'Max results to return (default 25, max 100)' },
      },
    },
  },
  {
    name: 'get_lead_detail',
    description: 'Get complete details for one lead including all fields and their full email history.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Lead UUID' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'create_lead',
    description: 'Add a new lead to the CRM. Capture all available attribution data (source, campaign, keyword, landing page).',
    input_schema: {
      type: 'object' as const,
      properties: {
        fname: { type: 'string', description: 'First name' },
        lname: { type: 'string', description: 'Last name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        org: { type: 'string', description: 'Organization name' },
        title: { type: 'string', description: 'Job title' },
        interest: { type: 'string', description: 'What they are interested in (e.g. "Grant Writing 101", "Grants Management Consulting")' },
        source: { type: 'string', enum: ['google', 'facebook', 'instagram', 'linkedin', 'email', 'organic', 'bark', ''], description: 'Traffic source' },
        campaign: { type: 'string', description: 'Ad campaign name (e.g. "Grant Writing 101 Promo")' },
        keyword: { type: 'string', description: 'Search keyword that triggered the ad' },
        landing: { type: 'string', description: 'Landing page path (e.g. "/grant-writing-101")' },
        notes: { type: 'string', description: 'Additional notes about this lead' },
        assignee: { type: 'string', description: 'Team member name to assign this lead to' },
      },
      required: ['fname', 'lname'],
    },
  },
  {
    name: 'update_lead',
    description: 'Update a lead\'s pipeline stage, append notes, or change assignment. Notes are appended, not replaced.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Lead UUID' },
        stage: { type: 'string', description: 'New pipeline stage' },
        notes: { type: 'string', description: 'Note to append to existing notes (timestamped automatically)' },
        assignee: { type: 'string', description: 'Team member to assign this lead to' },
        qualified: { type: 'string', enum: ['yes', 'no', 'partial', ''], description: 'Update qualification status' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'draft_email',
    description: 'Draft a personalized follow-up email for a lead using AI. Returns subject + body for human review — does NOT send.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Lead UUID' },
        purpose: { type: 'string', description: 'Purpose of the email (e.g. "follow up on consultation booking", "send proposal", "course re-engagement")' },
      },
      required: ['lead_id'],
    },
  },
  {
    name: 'get_campaign_performance',
    description: 'Get aggregated campaign performance data: spend, leads, qualified rate, and revenue broken down by campaign.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'create_appointment',
    description: 'Schedule a follow-up appointment or task for a lead. Creates a real record in the appointments table.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: { type: 'string', description: 'Lead UUID (optional — omit if no specific lead)' },
        lead_name: { type: 'string', description: 'Lead display name' },
        title: { type: 'string', description: 'Appointment or task title (e.g. "Follow-up call", "Send proposal", "Proposal review")' },
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime for when this is scheduled (e.g. "2026-06-20T14:00:00Z")' },
        type: { type: 'string', enum: ['consultation', 'sales_call', 'follow_up', 'other'], description: 'Appointment type' },
        notes: { type: 'string', description: 'Additional notes or context' },
        duration_minutes: { type: 'number', description: 'Duration in minutes (default 30)' },
      },
      required: ['title', 'scheduled_at', 'type'],
    },
  },
]

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  anthropic: Anthropic,
  supabase: SupabaseClient,
): Promise<{ result: string; summary: string }> {
  // ── search_leads ──────────────────────────────────────────
  if (name === 'search_leads') {
    const { stage, source, campaign, since_date, keyword, qualified, limit = 25 } = input as {
      stage?: string; source?: string; campaign?: string; since_date?: string
      keyword?: string; qualified?: string; limit?: number
    }

    let query = supabase.from('leads').select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit), 100))

    if (stage) query = query.eq('stage', stage)
    if (source) query = query.eq('source', source)
    if (campaign) query = query.ilike('campaign', `%${campaign}%`)
    if (qualified) query = query.eq('qualified', qualified)
    if (since_date) query = query.gte('created_at', since_date)
    if (keyword) {
      query = query.or(
        `interest.ilike.%${keyword}%,notes.ilike.%${keyword}%,org.ilike.%${keyword}%`,
      )
    }

    const { data, error } = await query
    if (error) return { result: `Error: ${error.message}`, summary: 'Lead search failed' }

    const leads = data ?? []
    const filters = [stage && `stage="${stage}"`, source && `source=${source}`, since_date && `since ${since_date}`].filter(Boolean).join(', ')
    return {
      result: JSON.stringify({ count: leads.length, leads }),
      summary: `Found ${leads.length} lead${leads.length === 1 ? '' : 's'}${filters ? ` (${filters})` : ''}`,
    }
  }

  // ── get_lead_detail ───────────────────────────────────────
  if (name === 'get_lead_detail') {
    const { lead_id } = input as { lead_id: string }

    const [{ data: lead, error: leadErr }, { data: emails }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', lead_id).single(),
      supabase.from('email_messages').select('*').eq('lead_id', lead_id).order('created_at', { ascending: false }),
    ])

    if (leadErr) return { result: `Error: ${leadErr.message}`, summary: 'Lead lookup failed' }
    return {
      result: JSON.stringify({ lead, emails: emails ?? [] }),
      summary: `Retrieved ${lead?.fname} ${lead?.lname} with ${emails?.length ?? 0} email(s)`,
    }
  }

  // ── create_lead ───────────────────────────────────────────
  if (name === 'create_lead') {
    const i = input as Record<string, string | undefined>
    const { data, error } = await supabase
      .from('leads')
      .insert({
        fname: i.fname ?? '',
        lname: i.lname ?? '',
        email: i.email ?? '',
        phone: i.phone,
        org: i.org ?? '',
        title: i.title,
        interest: i.interest,
        stage: 'New Lead',
        qualified: '',
        source: i.source,
        campaign: i.campaign,
        keyword: i.keyword,
        landing: i.landing,
        notes: i.notes,
        assignee: i.assignee,
        revenue: 0,
        lead_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) return { result: `Error: ${error.message}`, summary: 'Lead creation failed' }
    return {
      result: JSON.stringify(data),
      summary: `Created lead: ${data?.fname} ${data?.lname}${data?.org ? ` (${data.org})` : ''} — stage: New Lead`,
    }
  }

  // ── update_lead ───────────────────────────────────────────
  if (name === 'update_lead') {
    const { lead_id, stage, notes, assignee, qualified } = input as {
      lead_id: string; stage?: string; notes?: string; assignee?: string; qualified?: string
    }

    const updates: Record<string, unknown> = {}
    if (stage) updates.stage = stage
    if (assignee) updates.assignee = assignee
    if (qualified !== undefined) updates.qualified = qualified

    if (notes) {
      const { data: existing } = await supabase
        .from('leads').select('notes').eq('id', lead_id).single()
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      updates.notes = existing?.notes
        ? `${existing.notes}\n\n[${timestamp}] ${notes}`
        : `[${timestamp}] ${notes}`
    }

    const { data, error } = await supabase
      .from('leads').update(updates).eq('id', lead_id).select().single()

    if (error) return { result: `Error: ${error.message}`, summary: 'Lead update failed' }
    return {
      result: JSON.stringify(data),
      summary: `Updated ${data?.fname} ${data?.lname}${stage ? ` → "${stage}"` : ''}${notes ? ' + note added' : ''}`,
    }
  }

  // ── draft_email ───────────────────────────────────────────
  if (name === 'draft_email') {
    const { lead_id, purpose } = input as { lead_id: string; purpose?: string }

    const { data: lead, error } = await supabase
      .from('leads').select('*').eq('id', lead_id).single()
    if (error || !lead) return { result: 'Error: Lead not found', summary: 'Email draft failed — lead not found' }

    const draft = await runEmailAgent(anthropic, lead, purpose)
    return {
      result: JSON.stringify({ subject: draft.subject, body: draft.body }),
      summary: `Drafted email for ${lead.fname} ${lead.lname}: "${draft.subject}"`,
    }
  }

  // ── get_campaign_performance ──────────────────────────────
  if (name === 'get_campaign_performance') {
    const { data, error } = await supabase
      .from('leads')
      .select('campaign, source, revenue, qualified, stage')

    if (error) return { result: `Error: ${error.message}`, summary: 'Campaign data fetch failed' }

    const byCampaign: Record<string, { leads: number; revenue: number; qualified: number }> = {}
    for (const lead of (data ?? [])) {
      const key = lead.campaign || 'Unknown'
      if (!byCampaign[key]) byCampaign[key] = { leads: 0, revenue: 0, qualified: 0 }
      byCampaign[key].leads++
      byCampaign[key].revenue += lead.revenue ?? 0
      if (lead.qualified === 'yes') byCampaign[key].qualified++
    }

    const platformData = GOOGLE_CAMPAIGNS.map(c => ({
      name: c.name,
      platform: c.platform,
      spend: c.spend,
      ad_leads: c.leads,
      revenue: c.revenue,
      status: c.status,
      roas: c.spend > 0 ? Number((c.revenue / c.spend).toFixed(2)) : 0,
      cpl: c.leads > 0 ? Number((c.spend / c.leads).toFixed(2)) : 0,
    }))

    return {
      result: JSON.stringify({ crm_by_campaign: byCampaign, ad_platform_data: platformData }),
      summary: `Retrieved performance data for ${Object.keys(byCampaign).length} CRM campaigns + ${platformData.length} ad platform campaigns`,
    }
  }

  // ── create_appointment ────────────────────────────────────
  if (name === 'create_appointment') {
    const i = input as {
      lead_id?: string; lead_name?: string; title: string
      scheduled_at: string; type: string; notes?: string; duration_minutes?: number
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        lead_id: i.lead_id ?? null,
        lead_name: i.lead_name ?? null,
        title: i.title,
        scheduled_at: i.scheduled_at,
        type: i.type ?? 'follow_up',
        status: 'scheduled',
        notes: i.notes ?? null,
        duration_minutes: i.duration_minutes ?? 30,
        location: null,
      })
      .select()
      .single()

    if (error) return { result: `Error: ${error.message}`, summary: 'Appointment creation failed' }
    return {
      result: JSON.stringify(data),
      summary: `Scheduled ${i.type}: "${i.title}" on ${new Date(i.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    }
  }

  return { result: `Unknown tool: ${name}`, summary: 'Unknown tool' }
}

export async function runCRMOperationsAgent(
  anthropic: Anthropic,
  supabase: SupabaseClient,
  message: string,
  history: Anthropic.MessageParam[] = [],
): Promise<CRMAgentResponse> {
  const actions: CRMActionLog[] = []

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-6),
    { role: 'user', content: message },
  ]

  let iter = 0
  while (iter < MAX_ITER) {
    iter++

    const response = await anthropic.messages.create({
      model: CLAUDE_SONNET,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text')
      return {
        reply: textBlock?.type === 'text' ? textBlock.text : 'Done.',
        actions,
      }
    }

    if (response.stop_reason !== 'tool_use') break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const { result, summary } = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        anthropic,
        supabase,
      )
      actions.push({ tool: block.name, summary })
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: result,
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return {
    reply: 'I was unable to complete that request within the iteration limit. Please try a more specific command.',
    actions,
  }
}
