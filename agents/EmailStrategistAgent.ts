// ============================================================
// Email Strategist Agent
// Plans a batch of outreach emails: picks priority leads from
// the CRM (dormant, qualified, stage-based), drafts each one,
// and returns a structured outreach plan.
//
// Architecture: pre-compute all filtered lead views in JS, then
// make ONE structured Claude call (tool_choice: any) so the
// response is immediate JSON — no agentic loop, no second call.
// This keeps the route well within Netlify's 10 s function limit.
//
// ⚠️  READ ONLY. The agent never sends email. Suggestions
// must be reviewed and explicitly sent by a human via the
// existing /api/email/send endpoint.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { Lead, EmailStrategyOutput } from '~/types'
import { CLAUDE_HAIKU } from '~/lib/models'

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

SKIP: leads with no email address, stage "Not a Fit" or "Lost/No Response" unless a clear re-engagement angle exists.`

export async function runEmailStrategistAgent(
  client: Anthropic,
  leads: Lead[],
  options?: { maxRecipients?: number, focus?: string },
): Promise<EmailStrategyOutput> {
  // Capped at 5 (was 8) so the batch of email drafts completes within Netlify's
  // 26s wall — each draft is ~150 tokens, and N drafts dominate generation time.
  const maxRecipients = options?.maxRecipients ?? 5
  const focus = options?.focus
  const modelUsed = CLAUDE_HAIKU

  // ── Pre-compute filtered views in JS (replaces tool-use loop) ──
  const now = Date.now()
  const daysSince = (iso: string) => (now - new Date(iso).getTime()) / 86_400_000

  const slim = (l: Lead) => ({
    id: l.id,
    name: `${l.fname} ${l.lname}`.trim(),
    email: l.email,
    org: l.org,
    title: l.title ?? '',
    stage: l.stage,
    qualified: l.qualified,
    interest: l.interest ?? '',
    notes: l.notes ?? '',
    days_dormant: Math.floor(daysSince(l.updated_at)),
  })

  const contactable = leads.filter(l => l.email && l.stage !== 'Not a Fit' && l.stage !== 'Lost/No Response')

  const highPriority = contactable
    .filter(l => daysSince(l.updated_at) > 7 && ['Qualified', 'Proposal Sent', 'Booked Consultation'].includes(l.stage))
    .sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at))
    .slice(0, 12)
    .map(slim)

  const mediumPriority = contactable
    .filter(l => daysSince(l.updated_at) > 3 && ['New Lead', 'Contacted'].includes(l.stage))
    .sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at))
    .slice(0, 12)
    .map(slim)

  const highValue = contactable
    .filter(l => l.qualified === 'yes' || (l.interest ?? '').toLowerCase().includes('consult'))
    .slice(0, 10)
    .map(slim)

  const stageDist: Record<string, number> = {}
  leads.forEach(l => { stageDist[l.stage] = (stageDist[l.stage] || 0) + 1 })

  // ── Single structured call — tool_choice forces immediate JSON output ──
  const outputTool: Anthropic.Tool = {
    name: 'plan_outreach',
    description: 'Return the complete prioritized email outreach plan.',
    input_schema: {
      type: 'object' as const,
      properties: {
        suggestions: {
          type: 'array',
          description: `Up to ${maxRecipients} prioritized outreach suggestions with full email drafts.`,
          items: {
            type: 'object',
            properties: {
              lead_id: { type: 'string' },
              lead_name: { type: 'string' },
              lead_email: { type: 'string' },
              lead_org: { type: 'string' },
              current_stage: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              reason: { type: 'string' },
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['lead_name', 'lead_email', 'current_stage', 'priority', 'reason', 'subject', 'body'],
          },
        },
        segment_summary: {
          type: 'array',
          items: { type: 'string' },
          description: '2–4 bullet observations about the current lead mix.',
        },
        skipped: {
          type: 'array',
          items: {
            type: 'object',
            properties: { lead_name: { type: 'string' }, reason: { type: 'string' } },
            required: ['lead_name', 'reason'],
          },
        },
        summary: { type: 'string', description: 'One paragraph summarising the batch strategy.' },
      },
      required: ['suggestions', 'segment_summary', 'skipped', 'summary'],
    },
  }

  const response = await client.messages.create({
    model: modelUsed,
    max_tokens: 1800,
    system: SYSTEM_PROMPT,
    tools: [outputTool],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content: `Plan the next wave of outreach for SSD Consulting. Select up to ${maxRecipients} leads and draft a personalized email for each.
${focus ? `\nFocus: ${focus}` : ''}

STAGE DISTRIBUTION: ${JSON.stringify(stageDist)}

HIGH PRIORITY (qualified/proposal/booked, dormant >7 days):
${JSON.stringify(highPriority)}

MEDIUM PRIORITY (new/contacted, dormant >3 days):
${JSON.stringify(mediumPriority)}

HIGH VALUE CANDIDATES (qualified or consulting interest):
${JSON.stringify(highValue)}

Keep each email body under ~90 words. Call plan_outreach with the complete plan.`,
      },
    ],
  })

  const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
  const toolBlock = response.content.find(b => b.type === 'tool_use' && b.name === 'plan_outreach')

  if (!toolBlock || toolBlock.type !== 'tool_use') {
    return {
      generated_at: new Date().toISOString(),
      suggestions: [],
      segment_summary: [],
      skipped: [],
      summary: 'Agent did not return a plan — please try again.',
      model_used: modelUsed,
      tokens_used: tokens,
    }
  }

  const parsed = toolBlock.input as {
    suggestions: EmailStrategyOutput['suggestions']
    segment_summary: string[]
    skipped: Array<{ lead_name: string; reason: string }>
    summary: string
  }

  return {
    generated_at: new Date().toISOString(),
    suggestions: (parsed.suggestions ?? []).slice(0, maxRecipients),
    segment_summary: parsed.segment_summary ?? [],
    skipped: parsed.skipped ?? [],
    summary: parsed.summary ?? '',
    model_used: modelUsed,
    tokens_used: tokens,
  }
}
