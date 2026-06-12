// ============================================================
// Campaign Optimizer Agent
// Uses Claude with tool use to analyze all campaign data and
// return structured scaling/pausing/optimization recommendations.
//
// ⚠️  Human approval required before acting on any output.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { Campaign, Lead } from '~/types'
import { CLAUDE_OPUS } from '~/lib/models'

export interface CampaignRecommendation {
  campaign: string
  action: 'scale' | 'hold' | 'pause' | 'review'
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface OptimizerOutput {
  recommendations: CampaignRecommendation[]
  budget_shifts: Array<{ from: string; to: string; amount: string }>
  keyword_actions: Array<{ keyword: string; action: 'keep' | 'pause' | 'remove'; campaign: string }>
  landing_page_flags: string[]
  tracking_issues: string[]
  summary: string
  model_used: string
  tokens_used: number
}

const SYSTEM_PROMPT = `You are a Google Ads optimization expert for SSD Consulting, a firm offering:
- Grant Writing courses (free intro + paid GW101)
- Grants Management Consulting
- Behavioral Health Consulting

Your job is to analyze campaign performance data and provide clear, actionable recommendations.

CRITICAL RULES:
1. Never recommend automatic pauses or budget changes — always flag for human review
2. Base recommendations on ROAS (revenue ÷ spend), not just clicks or impressions
3. A ROAS below 1.5 needs immediate review. Above 3 is scalable.
4. Consider that Grants Management and BH Consulting leads have higher average contract values
5. Always flag if qualified lead rate drops below 40%
6. Suggest negative keywords based on waste patterns but do NOT add them automatically`

export async function runCampaignOptimizerAgent(
  client: Anthropic,
  campaigns: Campaign[],
  leads: Lead[],
): Promise<OptimizerOutput> {
  const tools: Anthropic.Tool[] = [
    {
      name: 'get_campaign_metrics',
      description: 'Returns performance metrics for all Google Ads and social campaigns',
      input_schema: {
        type: 'object' as const,
        properties: {
          include_social: { type: 'boolean', description: 'Include Facebook/Instagram/LinkedIn data' },
        },
        required: [],
      },
    },
    {
      name: 'get_lead_quality_report',
      description: 'Returns lead qualification rates, conversion rates, and revenue by campaign',
      input_schema: {
        type: 'object' as const,
        properties: {
          campaign: { type: 'string', description: 'Filter by specific campaign name (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'get_waste_analysis',
      description: 'Identifies keywords, placements, or audiences spending money without conversions',
      input_schema: {
        type: 'object' as const,
        properties: {
          min_spend: { type: 'number', description: 'Minimum spend threshold to flag (default: 50)' },
        },
        required: [],
      },
    },
  ]

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Analyze SSD Consulting's current campaign performance and provide optimization recommendations.

Current data summary:
- Total campaigns: ${campaigns.length}
- Total leads in CRM: ${leads.length}
- Qualified leads: ${leads.filter(l => l.qualified === 'yes').length}
- Total revenue tracked: $${leads.reduce((s, l) => s + (l.revenue || 0), 0).toLocaleString()}

Please use the available tools to get detailed data, then provide structured recommendations.`,
    },
  ]

  let totalTokens = 0
  const modelUsed = CLAUDE_OPUS

  // Agentic loop — runs until Claude stops calling tools (capped)
  const MAX_ITERATIONS = 10
  let iteration = 0
  let lastText = ''
  while (iteration < MAX_ITERATIONS) {
    iteration++
    const response = await client.messages.create({
      model: modelUsed,
      max_tokens: 4096,
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
        const result = handleToolCall(block.name, block.input as Record<string, unknown>, campaigns, leads)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })
    }
    else {
      // Model finished — extract final text
      const textBlock = response.content.find(b => b.type === 'text')
      lastText = textBlock && textBlock.type === 'text' ? textBlock.text : ''
      break
    }
  }

  // Ask for structured JSON output (also handles iteration-cap exit)
  const structuredResponse = await client.messages.create({
    model: modelUsed,
    max_tokens: 2048,
    system: 'Return ONLY valid JSON, no markdown. Follow the exact schema provided.',
    messages: [
      {
        role: 'user',
        content: `Convert this analysis into the following JSON schema:
{
  "recommendations": [{ "campaign": string, "action": "scale"|"hold"|"pause"|"review", "reason": string, "priority": "high"|"medium"|"low" }],
  "budget_shifts": [{ "from": string, "to": string, "amount": string }],
  "keyword_actions": [{ "keyword": string, "action": "keep"|"pause"|"remove", "campaign": string }],
  "landing_page_flags": [string],
  "tracking_issues": [string],
  "summary": string
}

Analysis to convert:
${lastText || 'No analysis produced before reaching tool-call iteration cap.'}`,
      },
    ],
  })

  totalTokens += (structuredResponse.usage?.input_tokens ?? 0) + (structuredResponse.usage?.output_tokens ?? 0)

  try {
    const jsonText = structuredResponse.content[0]?.type === 'text'
      ? structuredResponse.content[0].text
      : '{}'
    const cleaned = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { ...parsed, model_used: modelUsed, tokens_used: totalTokens } as OptimizerOutput
  }
  catch {
    return {
      recommendations: [],
      budget_shifts: [],
      keyword_actions: [],
      landing_page_flags: [],
      tracking_issues: iteration >= MAX_ITERATIONS
        ? [`Agent reached max iterations (${MAX_ITERATIONS}) — review raw response`]
        : ['Failed to parse structured output — review raw response'],
      summary: lastText.slice(0, 500),
      model_used: modelUsed,
      tokens_used: totalTokens,
    }
  }
}

// ── Tool handlers (mock data — swap for real API calls) ────
function handleToolCall(
  name: string,
  input: Record<string, unknown>,
  campaigns: Campaign[],
  leads: Lead[],
): unknown {
  switch (name) {
    case 'get_campaign_metrics':
      return campaigns.map(c => ({
        name: c.name,
        platform: c.platform,
        spend: c.spend,
        leads: c.leads,
        qualified: c.qualified,
        conversions: c.conversions,
        revenue: c.revenue,
        cpl: c.leads > 0 ? (c.spend / c.leads).toFixed(2) : 'N/A',
        roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
        status: c.status,
      }))

    case 'get_lead_quality_report':
      return {
        total_leads: leads.length,
        by_campaign: campaigns.map(c => {
          const cLeads = leads.filter(l => l.campaign === c.name)
          const qualified = cLeads.filter(l => l.qualified === 'yes').length
          const revenue = cLeads.reduce((s, l) => s + (l.revenue || 0), 0)
          return {
            campaign: c.name,
            leads: cLeads.length,
            qualified,
            qualification_rate: cLeads.length > 0 ? `${Math.round(qualified / cLeads.length * 100)}%` : '0%',
            revenue,
            avg_deal_size: qualified > 0 ? `$${(revenue / qualified).toFixed(0)}` : '$0',
          }
        }),
      }

    case 'get_waste_analysis': {
      const minSpend = (input.min_spend as number) || 50
      return {
        waste_note: 'Based on CRM data — for search term level waste, run search term report export',
        campaigns_below_roas: campaigns
          .filter(c => c.spend > minSpend && c.revenue / c.spend < 1.5)
          .map(c => ({
            campaign: c.name,
            spend: c.spend,
            revenue: c.revenue,
            roas: (c.revenue / c.spend).toFixed(2),
          })),
        not_a_fit_leads: leads.filter(l => l.qualified === 'no').map(l => ({
          campaign: l.campaign,
          keyword: l.keyword,
          notes: l.notes,
        })),
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
