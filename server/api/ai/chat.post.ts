// General-purpose AI chat endpoint used by the AIPanel component
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'

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
  const body = await readBody(event)
  if (!body.message) throw createError({ statusCode: 400, message: 'message is required' })

  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Fetch quick context
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('fname, lname, org, stage, campaign, revenue, qualified')
    .order('created_at', { ascending: false })
    .limit(10)

  const contextBlock = `
Current campaign data: ${JSON.stringify(GOOGLE_CAMPAIGNS.map(c => ({
    name: c.name, spend: c.spend, leads: c.leads, revenue: c.revenue,
    roas: (c.revenue / c.spend).toFixed(2),
  })))}

Recent leads: ${JSON.stringify(recentLeads ?? [])}
`

  const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = (body.history || [])
    .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
    .slice(-8)
    .map((m: { role: 'user' | 'assistant'; content: string }) => ({ role: m.role, content: m.content }))

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT + '\n\nCurrent CRM snapshot:\n' + contextBlock,
    messages: [
      ...historyMessages,
      { role: 'user', content: body.message },
    ],
  })

  const reply = response.content[0]?.type === 'text' ? response.content[0].text : ''

  return { data: { reply } }
})
