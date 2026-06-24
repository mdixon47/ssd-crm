// ============================================================
// Campaign Optimizer Agent
// Uses Claude with tool use to analyze all campaign data and
// return structured scaling/pausing/optimization recommendations.
//
// ⚠️  Human approval required before acting on any output.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { Campaign, Lead } from '~/types'
import { CLAUDE_HAIKU } from '~/lib/models'

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

Your job is to analyze campaign performance data and provide clear, actionable recommendations, then submit them via the submit_optimization tool.

CRITICAL RULES:
1. Never recommend automatic pauses or budget changes — always flag for human review
2. Base recommendations on ROAS (revenue ÷ spend), not just clicks or impressions
3. A ROAS below 1.5 needs immediate review. Above 3 is scalable.
4. Consider that Grants Management and BH Consulting leads have higher average contract values
5. Always flag if qualified lead rate drops below 40%
6. Suggest negative keywords based on waste patterns but do NOT add them automatically`

const SUBMIT_OPTIMIZATION: Anthropic.Tool = {
  name: 'submit_optimization',
  description: 'Submit the completed campaign optimization analysis.',
  input_schema: {
    type: 'object' as const,
    properties: {
      recommendations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            campaign: { type: 'string' },
            action: { type: 'string', enum: ['scale', 'hold', 'pause', 'review'] },
            reason: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['campaign', 'action', 'reason', 'priority'],
        },
      },
      budget_shifts: {
        type: 'array',
        items: {
          type: 'object',
          properties: { from: { type: 'string' }, to: { type: 'string' }, amount: { type: 'string' } },
          required: ['from', 'to', 'amount'],
        },
      },
      keyword_actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            action: { type: 'string', enum: ['keep', 'pause', 'remove'] },
            campaign: { type: 'string' },
          },
          required: ['keyword', 'action', 'campaign'],
        },
      },
      landing_page_flags: { type: 'array', items: { type: 'string' } },
      tracking_issues: { type: 'array', items: { type: 'string' } },
      summary: { type: 'string' },
    },
    required: ['recommendations', 'summary'],
  },
}

export async function runCampaignOptimizerAgent(
  client: Anthropic,
  campaigns: Campaign[],
  leads: Lead[],
): Promise<OptimizerOutput> {
  const modelUsed = CLAUDE_HAIKU

  // The three tools are pure functions of (campaigns, leads) — compute up front
  // and inject, so a single forced-tool call replaces the old serial loop +
  // separate JSON-conversion call (which together blew past the 26s limit).
  const metrics = handleToolCall('get_campaign_metrics', {}, campaigns, leads)
  const quality = handleToolCall('get_lead_quality_report', {}, campaigns, leads)
  const waste = handleToolCall('get_waste_analysis', { min_spend: 50 }, campaigns, leads)

  const userPrompt = `Analyze SSD Consulting's campaign performance and submit recommendations via submit_optimization.

SUMMARY:
- Total campaigns: ${campaigns.length}
- Total leads in CRM: ${leads.length}
- Qualified leads: ${leads.filter(l => l.qualified === 'yes').length}
- Total revenue tracked: $${leads.reduce((s, l) => s + (l.revenue || 0), 0).toLocaleString()}

CAMPAIGN METRICS:
${JSON.stringify(metrics)}

LEAD QUALITY BY CAMPAIGN:
${JSON.stringify(quality)}

WASTE ANALYSIS:
${JSON.stringify(waste)}

Provide scaling/pausing/optimization recommendations, budget shifts, keyword actions, landing-page flags, and tracking issues.`

  const response = await client.messages.create({
    model: modelUsed,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_OPTIMIZATION],
    tool_choice: { type: 'tool', name: 'submit_optimization' },
    messages: [{ role: 'user', content: userPrompt }],
  })

  const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
  const block = response.content.find(b => b.type === 'tool_use')

  if (!block || block.type !== 'tool_use') {
    return {
      recommendations: [],
      budget_shifts: [],
      keyword_actions: [],
      landing_page_flags: [],
      tracking_issues: ['Optimizer did not return a structured result — please retry'],
      summary: '',
      model_used: modelUsed,
      tokens_used: tokensUsed,
    }
  }

  const out = block.input as Partial<OptimizerOutput>
  return {
    recommendations: out.recommendations ?? [],
    budget_shifts: out.budget_shifts ?? [],
    keyword_actions: out.keyword_actions ?? [],
    landing_page_flags: out.landing_page_flags ?? [],
    tracking_issues: out.tracking_issues ?? [],
    summary: out.summary ?? '',
    model_used: modelUsed,
    tokens_used: tokensUsed,
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
