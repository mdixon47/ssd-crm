// General-purpose AI chat endpoint used by the AIPanel component
import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { getGoogleCampaigns } from '~/server/utils/campaigns'
import { CLAUDE_HAIKU } from '~/lib/models'

const schema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
})

const SYSTEM_PROMPT = `You are the SSD Consulting CRM AI Assistant. You help analyze paid acquisition performance, answer questions about leads and campaigns, and provide strategic guidance.

SSD Consulting offers:
- Free Grant Writing Course (lead magnet)
- Grant Writing 101: Foundations (paid course ~$597)
- Grants Management Consulting ($5K–$25K contracts)
- Behavioral Health Consulting ($8K–$30K contracts)

You have access to campaign data, lead pipeline information, and search term reports. You can:
- Analyze ROAS, CPL, and qualification rates
- Suggest negative keywords based on poor-fit searches
- Recommend budget allocation adjustments (for human approval)
- Identify high-value leads worth prioritizing
- Help write ad copy variations

⚠️ IMPORTANT: You make recommendations only. You cannot and should not automatically change campaigns, budgets, or ad platform settings. All changes require explicit human approval.`

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }
  const { message, history } = parsed.data

  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Fetch quick context (campaign data is live when configured, else mock)
  const [{ data: recentLeads }, { mode: campaignMode, campaigns }] = await Promise.all([
    supabase
      .from('leads')
      .select('fname, lname, org, stage, campaign, revenue, qualified')
      .order('created_at', { ascending: false })
      .limit(10),
    getGoogleCampaigns(),
  ])

  const campaignLabel = campaignMode === 'mock'
    ? 'SAMPLE/MOCK — not live Google Ads; do not present as real performance'
    : 'live Google Ads'
  const contextBlock = `
Campaign data (${campaignLabel}): ${JSON.stringify(campaigns.map(c => ({
    name: c.name, spend: c.spend, leads: c.leads, revenue: c.revenue,
    roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
  })))}

Recent leads: ${JSON.stringify(recentLeads ?? [])}
`

  const historyMessages = (history ?? []).slice(-8)

  const response = await client.messages.create({
    model: CLAUDE_HAIKU,
    max_tokens: 1024,
    system: SYSTEM_PROMPT + '\n\nCurrent CRM snapshot:\n' + contextBlock,
    messages: [
      ...historyMessages,
      { role: 'user', content: message },
    ],
  }).catch((err: unknown) => {
    // Timeout/429/529 → null so we return a friendly message, not an opaque 500.
    console.warn('[ai-chat] Anthropic call failed:', err instanceof Error ? err.message : err)
    return null
  })

  const reply = response?.content[0]?.type === 'text'
    ? response.content[0].text
    : 'Sorry — the AI assistant is temporarily unavailable (the request may have timed out). Please try again in a moment.'

  return { data: { reply } }
})
