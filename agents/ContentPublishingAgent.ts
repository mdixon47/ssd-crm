// ============================================================
// Content Publishing Agent
// Creates platform-optimised content for LinkedIn, Facebook,
// Instagram, and Email based on topic, offer, tone, and live
// CRM context (recent lead volume, top campaigns, winning angles).
//
// Architecture: Sonnet + tool_use loop (max 5 iterations).
// Tools are read-only (CRM context, content calendar).
// Content creation happens in the model's response — no auto-post.
//
// A2A: This agent is callable from the CRM Operations Agent
// via POST /api/a2a/content-publisher.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { ContentPublishResult, ContentPlatform, ContentOffer, ContentTone } from '~/types'
import { CLAUDE_SONNET } from '~/lib/models'
import type { createSupabaseClient } from '~/server/utils/supabase'

type SupabaseClient = ReturnType<typeof createSupabaseClient>

const MAX_ITER = 5

const PLATFORM_GUIDELINES: Record<string, string> = {
  linkedin: 'Professional tone. 150–300 words. Lead with insight or question. Use line breaks for scannability. 3–5 relevant hashtags at the end. End with a single CTA.',
  facebook: 'Conversational and warm. 100–250 words. Story-first or question hook. Include a clear CTA and link placeholder. 2–3 hashtags.',
  instagram: 'Visual-first caption. 50–150 words. Hook in first line (no truncation). Heavy emoji use. 10–15 hashtags in first comment (list them separately).',
  email: 'Subject line (≤60 chars) + preview text (≤100 chars) + full body. 200–400 word body. Sections: hook → value → offer → CTA. Sign off as Malik from SSD Consulting.',
  all: 'Create one piece per platform: LinkedIn, Facebook, Instagram, and Email. Each must be independently complete and platform-native.',
}

const OFFER_DESCRIPTIONS: Record<string, string> = {
  gw101: 'Grant Writing 101: Foundations — paid online course ~$597, teaches nonprofits to write winning grant proposals',
  grants_consulting: 'Grants Management Consulting — $5K–$25K engagements, hands-on grant writing and management for nonprofits',
  bh_consulting: 'Behavioral Health Consulting — $8K–$30K engagements, compliance and workforce training for BH agencies',
  free_course: 'Free Grant Writing Mini-Course — top-of-funnel lead magnet, 5-day email course on grant writing basics',
  general: 'SSD Consulting — grant writing and behavioral health consulting for nonprofits and government agencies',
}

const SYSTEM_PROMPT = `You are SSD Consulting's Content Publishing Agent. You create high-converting, platform-native content that builds authority and drives leads for SSD Consulting's programs.

SSD CONSULTING OFFERINGS:
${Object.entries(OFFER_DESCRIPTIONS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

YOUR PROCESS:
1. Call get_crm_context to understand what's working in the pipeline right now.
2. Optionally call get_content_calendar to avoid repeating recent topics.
3. Write platform-optimized content and call save_content for each piece.
4. Return a strategy summary explaining the creative angles you chose.

CONTENT QUALITY STANDARDS:
- Every piece must have a scroll-stopping hook in the first line
- Reference real pain points: "Your grant proposal was rejected" / "Nonprofits leave millions on the table"
- Use specific numbers when possible: "85% of first-time grant applicants get rejected"
- CTAs must be specific: "DM me 'GRANT' to get the free guide" / "Link in bio to enroll"
- Never sound generic or corporate — speak to nonprofit executive directors and program managers
- Sign off on LinkedIn/Facebook/email as "Malik | SSD Consulting"

PLATFORM GUIDELINES:
${Object.entries(PLATFORM_GUIDELINES).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n\n')}`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_crm_context',
    description: 'Get live CRM context: recent lead counts by source, top performing campaigns, current pipeline stages. Use this to personalize content angles.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Look back this many days (default 30)' },
      },
    },
  },
  {
    name: 'get_content_calendar',
    description: 'Get recently published and scheduled content to avoid topic duplication.',
    input_schema: {
      type: 'object' as const,
      properties: {
        platform: { type: 'string', description: 'Filter by platform (optional)' },
        limit: { type: 'number', description: 'Max items to return (default 10)' },
      },
    },
  },
  {
    name: 'save_content',
    description: 'Save a completed content piece to the content calendar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short descriptive title for this piece' },
        body: { type: 'string', description: 'Full content body (the actual post/email copy)' },
        content_type: { type: 'string', enum: ['post', 'email', 'carousel', 'reel', 'article'], description: 'Content format' },
        platform: { type: 'string', enum: ['linkedin', 'facebook', 'instagram', 'email', 'all'], description: 'Target platform' },
        offer: { type: 'string', enum: ['gw101', 'grants_consulting', 'bh_consulting', 'free_course', 'general'], description: 'Which offer this promotes' },
        tone: { type: 'string', enum: ['educational', 'promotional', 'testimonial', 'story', 'announcement'], description: 'Content tone' },
        topic: { type: 'string', description: 'The core topic or angle (e.g. "grant rejection mistakes", "ROI of grant writing")' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Content tags for filtering' },
      },
      required: ['title', 'body', 'content_type', 'platform'],
    },
  },
]

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  savedIds: string[],
): Promise<string> {
  if (name === 'get_crm_context') {
    const days = Number(input.days ?? 30)
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const [{ data: leads }, { data: recent }] = await Promise.all([
      supabase.from('leads').select('stage, source, campaign, qualified').gte('created_at', since),
      supabase.from('leads').select('stage, source, campaign, qualified').order('created_at', { ascending: false }).limit(5),
    ])

    const bySource: Record<string, number> = {}
    const byStage: Record<string, number> = {}
    let qualified = 0
    for (const l of (leads ?? [])) {
      bySource[l.source || 'unknown'] = (bySource[l.source || 'unknown'] || 0) + 1
      byStage[l.stage] = (byStage[l.stage] || 0) + 1
      if (l.qualified === 'yes') qualified++
    }

    return JSON.stringify({
      period_days: days,
      total_leads: leads?.length ?? 0,
      qualified,
      leads_by_source: bySource,
      leads_by_stage: byStage,
      recent_lead_orgs: recent?.map(l => l.campaign).filter(Boolean).slice(0, 3),
    })
  }

  if (name === 'get_content_calendar') {
    const limit = Number(input.limit ?? 10)
    let query = supabase
      .from('content_items')
      .select('title, platform, topic, status, created_at')
      .in('status', ['published', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(limit)

    if (input.platform && input.platform !== 'all') {
      query = query.eq('platform', input.platform as string)
    }

    const { data } = await query
    return JSON.stringify({ recent_content: data ?? [], count: data?.length ?? 0 })
  }

  if (name === 'save_content') {
    const { data, error } = await supabase
      .from('content_items')
      .insert({
        title: input.title as string,
        body: input.body as string,
        content_type: (input.content_type as string) ?? 'post',
        platform: (input.platform as string) ?? 'linkedin',
        status: 'draft',
        topic: (input.topic as string) ?? null,
        offer: (input.offer as string) ?? null,
        tone: (input.tone as string) ?? null,
        tags: (input.tags as string[]) ?? [],
        performance: {},
      })
      .select()
      .single()

    if (error) return JSON.stringify({ error: error.message })
    savedIds.push(data.id)
    return JSON.stringify({ saved: true, id: data.id, platform: data.platform })
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

export async function runContentPublishingAgent(
  anthropic: Anthropic,
  supabase: SupabaseClient,
  request: {
    topic: string
    platform: ContentPlatform
    offer?: ContentOffer
    tone?: ContentTone
    context?: string
  },
): Promise<ContentPublishResult & { savedIds: string[] }> {
  const savedIds: string[] = []

  const platformGuide = PLATFORM_GUIDELINES[request.platform] ?? PLATFORM_GUIDELINES.linkedin
  const offerDesc = request.offer ? OFFER_DESCRIPTIONS[request.offer] : OFFER_DESCRIPTIONS.general

  const userPrompt = `Create content for the following request:

TOPIC: ${request.topic}
PLATFORM: ${request.platform.toUpperCase()}
OFFER: ${offerDesc}
TONE: ${request.tone ?? 'educational'}
PLATFORM GUIDE: ${platformGuide}
${request.context ? `\nADDITIONAL CONTEXT:\n${request.context}` : ''}

Start by checking CRM context and the content calendar, then create and save the content.
After saving, return your strategy_notes explaining the creative angles, hooks, and distribution timing you recommend.`

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userPrompt },
  ]

  let finalText = ''
  let iter = 0

  while (iter < MAX_ITER) {
    iter++

    const response = await anthropic.messages.create({
      model: CLAUDE_SONNET,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') {
      finalText = response.content.find(b => b.type === 'text')?.type === 'text'
        ? (response.content.find(b => b.type === 'text') as Anthropic.TextBlock).text
        : ''
      break
    }

    if (response.stop_reason !== 'tool_use') break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const result = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
        supabase,
        savedIds,
      )
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return {
    items: savedIds.length > 0
      ? [{ platform: request.platform, title: request.topic, body: '', content_type: 'post', tone: request.tone ?? 'educational' }]
      : [],
    strategy_notes: finalText || `Created ${savedIds.length} content piece(s) for ${request.platform}.`,
    model_used: CLAUDE_SONNET,
    savedIds,
  }
}
