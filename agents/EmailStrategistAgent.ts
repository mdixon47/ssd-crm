// ============================================================
// Email Strategist Agent
// Plans a batch of outreach emails: picks priority leads from
// the CRM (dormant, qualified, stage-based), drafts each one,
// and returns a structured outreach plan.
//
// ⚠️  READ ONLY. The agent never sends email. Suggestions
// must be reviewed and explicitly sent by a human via the
// existing /api/email/send endpoint.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { Lead, EmailStrategyOutput } from '~/types'
import { CLAUDE_OPUS, CLAUDE_SONNET } from '~/lib/models'

const SYSTEM_PROMPT = `You are SSD Consulting's outreach strategist. Your job is to plan the next wave of outreach emails to leads in the CRM.

OFFERINGS:
- Grant Writing 101 Course (~$597)
- Grants Management Consulting ($5K–$25K)
- Behavioral Health Consulting ($8K–$30K)

PRIORITIZATION FRAMEWORK:
- HIGH: Qualified leads with no recent contact (>7 days), Proposal Sent leads, Booked Consultation leads
- MEDIUM: New Lead / Contacted leads (>3 days dormant), warm leads who haven't moved stage
- LOW: Cold leads, Lost/No Response (only if explicit re-engagement angle), Not a Fit (skip unless reason exists)

WRITING RULES:
- Warm, professional, never salesy. Use lead's first name and reference their organization when known.
- Match tone to stage: casual for new leads, more direct for qualified/proposal leads.
- 3–5 short paragraphs max. End with a single clear CTA.
- Sign off as "Malik" from "SSD Consulting".

SKIP (do not draft for):
- Leads with stage "Not a Fit" unless re-engagement angle is explicit.
- Leads with no email address.

Return ONLY valid JSON. No markdown.`

export async function runEmailStrategistAgent(
  client: Anthropic,
  leads: Lead[],
  options?: { maxRecipients?: number, focus?: string },
): Promise<EmailStrategyOutput> {
  const maxRecipients = options?.maxRecipients ?? 8
  const focus = options?.focus
  // Sonnet is fast enough for email strategy and avoids serverless timeouts.
  // Reserve Opus for tasks that genuinely need deeper reasoning.
  const modelUsed = CLAUDE_SONNET
  let totalTokens = 0

  const tools: Anthropic.Tool[] = [
    {
      name: 'get_dormant_leads',
      description: 'Returns leads that have not been updated in the last N days, sorted by dormancy',
      input_schema: {
        type: 'object' as const,
        properties: {
          days: { type: 'number', description: 'Minimum days since last update (default 3)' },
        },
        required: [],
      },
    },
    {
      name: 'get_leads_by_stage',
      description: 'Returns leads at a specific pipeline stage',
      input_schema: {
        type: 'object' as const,
        properties: { stage: { type: 'string' } },
        required: ['stage'],
      },
    },
    {
      name: 'get_high_value_candidates',
      description: 'Returns qualified leads (qualified=yes) and leads with high revenue potential (consulting interest)',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_stage_distribution',
      description: 'Returns count of leads at each pipeline stage for context',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
  ]

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Plan the next wave of outreach emails for SSD Consulting.
Total leads in CRM: ${leads.length}
Max recipients in this batch: ${maxRecipients}
${focus ? `Focus: ${focus}` : 'Focus: balanced — pick across stages by priority framework'}

Use the tools to find the best recipients, then draft a personalized email for each. Return a prioritized plan.`,
    },
  ]

  let rawAnalysis = ''
  const MAX_ITERATIONS = 4
  let iteration = 0
  while (iteration < MAX_ITERATIONS) {
    iteration++
    const isLastIteration = iteration === MAX_ITERATIONS
    const response = await client.messages.create({
      model: modelUsed,
      // Tool-call turns only need a short response; save tokens for the final text turn.
      max_tokens: isLastIteration ? 4096 : 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })
    totalTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue
        const result = handleEmailTool(block.name, block.input as Record<string, unknown>, leads)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
      }
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }
    else {
      const textBlock = response.content.find(b => b.type === 'text')
      rawAnalysis = textBlock && textBlock.type === 'text' ? textBlock.text : ''
      break
    }
  }

  // Convert to structured JSON
  const structuredResponse = await client.messages.create({
    model: CLAUDE_SONNET,
    max_tokens: 4096,
    system: 'Return ONLY valid JSON. No markdown. Follow the schema exactly.',
    messages: [
      {
        role: 'user',
        content: `Convert this outreach plan into JSON matching exactly:
{
  "suggestions": [{
    "lead_id": string|null,
    "lead_name": string,
    "lead_email": string,
    "lead_org": string|null,
    "current_stage": string,
    "priority": "high"|"medium"|"low",
    "reason": string,
    "subject": string,
    "body": string
  }],
  "segment_summary": [string],
  "skipped": [{ "lead_name": string, "reason": string }],
  "summary": string
}

Cap suggestions at ${maxRecipients}. Plan to convert:
${rawAnalysis}`,
      },
    ],
  })
  totalTokens += (structuredResponse.usage?.input_tokens ?? 0) + (structuredResponse.usage?.output_tokens ?? 0)

  try {
    const raw = structuredResponse.content[0]?.type === 'text' ? structuredResponse.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      generated_at: new Date().toISOString(),
      suggestions: parsed.suggestions ?? [],
      segment_summary: parsed.segment_summary ?? [],
      skipped: parsed.skipped ?? [],
      summary: parsed.summary ?? rawAnalysis.slice(0, 500),
      model_used: modelUsed,
      tokens_used: totalTokens,
    }
  }
  catch {
    return {
      generated_at: new Date().toISOString(),
      suggestions: [],
      segment_summary: [],
      skipped: [],
      summary: iteration >= MAX_ITERATIONS
        ? `Agent reached max iterations (${MAX_ITERATIONS}) — review raw output`
        : rawAnalysis.slice(0, 500),
      model_used: modelUsed,
      tokens_used: totalTokens,
    }
  }
}

// ── Tool implementations ──────────────────────────────────
function handleEmailTool(
  name: string,
  input: Record<string, unknown>,
  leads: Lead[],
): unknown {
  const projectLead = (l: Lead) => ({
    id: l.id,
    name: `${l.fname} ${l.lname}`.trim(),
    email: l.email,
    org: l.org,
    title: l.title,
    stage: l.stage,
    qualified: l.qualified,
    interest: l.interest,
    source: l.source,
    notes: l.notes,
    revenue: l.revenue,
    updated_at: l.updated_at,
  })

  switch (name) {
    case 'get_dormant_leads': {
      const days = (input.days as number) || 3
      const cutoff = Date.now() - days * 86400 * 1000
      return leads
        .filter(l => l.email && new Date(l.updated_at).getTime() < cutoff && l.stage !== 'Not a Fit')
        .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
        .slice(0, 25)
        .map(projectLead)
    }
    case 'get_leads_by_stage':
      return leads.filter(l => l.email && l.stage === input.stage).map(projectLead)
    case 'get_high_value_candidates':
      return leads
        .filter(l => l.email && (l.qualified === 'yes' || (l.interest ?? '').toLowerCase().includes('consult')))
        .map(projectLead)
    case 'get_stage_distribution': {
      const dist: Record<string, number> = {}
      leads.forEach(l => { dist[l.stage] = (dist[l.stage] || 0) + 1 })
      return { distribution: dist, total: leads.length }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
