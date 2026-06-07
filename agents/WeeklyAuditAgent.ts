// ============================================================
// Weekly Audit Agent
// The most comprehensive agent — runs a full agentic loop
// that pulls data from all MCP sources, analyzes performance,
// and produces a structured weekly report.
//
// ⚠️  IMPORTANT: This agent can READ and ANALYZE data.
// It CANNOT and SHOULD NOT automatically change campaigns,
// budgets, keywords, or any ad platform settings.
// All recommendations require explicit human approval.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { AuditReport, Campaign, Lead, SearchTerm, NegativeKeyword  } from '~/types'

const SYSTEM_PROMPT = `You are SSD Consulting's senior paid acquisition strategist. Your job is to run a comprehensive weekly audit of all paid channels.

WEEKLY AUDIT SCOPE:
1. Campaign Performance — spend, leads, qualified leads, ROAS, cost per lead
2. Lead Quality — what types of people came in, how many were good fits
3. Search Term Health — what people actually searched for, waste signals
4. Negative Keyword Gaps — searches spending money on wrong audience
5. Landing Page Performance — conversion rate signals
6. Social Media Channels — Facebook, Instagram, LinkedIn performance
7. Offline Conversion Signals — leads that became paying clients (upload to Google Ads)
8. Budget Allocation — is money going to the right places

DECISION FRAMEWORK:
- ROAS ≥ 4x → Candidate to scale (flag for human approval)
- ROAS 1.5–4x → Hold, optimize landing page
- ROAS < 1.5x → Flag for human review — possible pause
- Qualification rate < 40% → Negative keyword problem
- Cost per lead 2x target → Bid or quality score issue

OUTPUT REQUIREMENTS:
- Be specific. Name the campaign, keyword, or landing page.
- Separate "what the data shows" from "what I recommend"
- Flag anything that requires human judgment separately
- Do not recommend automatic changes to live campaigns

Remember: You analyze and recommend. Humans decide and act.`

export async function runWeeklyAuditAgent(
  client: Anthropic,
  context: {
    campaigns: Campaign[]
    leads: Lead[]
    searchTerms: SearchTerm[]
    negativeKeywords: NegativeKeyword[]
    weekDate?: string
  },
): Promise<AuditReport> {
  const { campaigns, leads, searchTerms, negativeKeywords, weekDate } = context
  const modelUsed = 'claude-opus-4-6'
  let _totalTokens = 0

  const tools: Anthropic.Tool[] = [
    {
      name: 'get_campaign_performance',
      description: 'Gets detailed performance metrics for all campaigns including ROAS, CPL, and trends',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_lead_quality_breakdown',
      description: 'Analyzes lead quality, stage distribution, and revenue attribution by source',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_search_term_waste',
      description: 'Identifies search terms spending budget on non-converting or wrong-audience queries',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_negative_keyword_gaps',
      description: 'Cross-references search terms labeled "negative" against the current negative keyword list to find gaps',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_offline_conversion_candidates',
      description: 'Returns leads that have converted to paying clients and are candidates for offline conversion upload to Google Ads',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_budget_optimization_analysis',
      description: 'Analyzes budget allocation efficiency across campaigns and recommends shifts',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
  ]

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Run the weekly paid acquisition audit for SSD Consulting.
Week: ${weekDate || new Date().toISOString().slice(0, 10)}
Total campaigns: ${campaigns.length}
Total leads this period: ${leads.filter(l => new Date(l.lead_date) > new Date(Date.now() - 7 * 86400 * 1000)).length}
Search terms to review: ${searchTerms.length}

Use all available tools to gather data, then produce a comprehensive audit report.`,
    },
  ]

  let rawAnalysis = ''

  // Agentic loop (capped)
  const MAX_ITERATIONS = 12
  let iteration = 0
  while (iteration < MAX_ITERATIONS) {
    iteration++
    const response = await client.messages.create({
      model: modelUsed,
      max_tokens: 8096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    })

    _totalTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of toolUseBlocks) {
        if (block.type !== 'tool_use') continue
        const result = handleAuditTool(block.name, campaigns, leads, searchTerms, negativeKeywords)
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
      const textBlock = response.content.find(b => b.type === 'text')
      rawAnalysis = textBlock && textBlock.type === 'text' ? textBlock.text : ''
      break
    }
  }

  // Convert to structured AuditReport
  const structuredResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: 'Return ONLY valid JSON. No markdown. Follow the schema exactly.',
    messages: [
      {
        role: 'user',
        content: `Convert this audit into this exact JSON schema:
{
  "generated_at": "${new Date().toISOString()}",
  "campaigns_to_scale": [string],
  "campaigns_to_pause": [string],
  "keywords_to_keep": [string],
  "keywords_to_remove": [string],
  "negative_keyword_suggestions": [string],
  "landing_page_issues": [string],
  "budget_recommendations": [string],
  "tracking_issues": [string],
  "questions_for_review": [string],
  "summary": string,
  "overall_health": "strong"|"moderate"|"needs_attention"
}

Audit analysis to convert:
${rawAnalysis}`,
      },
    ],
  })

  _totalTokens += (structuredResponse.usage?.input_tokens ?? 0) + (structuredResponse.usage?.output_tokens ?? 0)

  try {
    const raw = structuredResponse.content[0]?.type === 'text' ? structuredResponse.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned) as AuditReport
  }
  catch {
    return {
      generated_at: new Date().toISOString(),
      campaigns_to_scale: [],
      campaigns_to_pause: [],
      keywords_to_keep: [],
      keywords_to_remove: [],
      negative_keyword_suggestions: [],
      landing_page_issues: [],
      budget_recommendations: [],
      tracking_issues: iteration >= MAX_ITERATIONS
        ? [`Agent reached max iterations (${MAX_ITERATIONS}) — review raw response`]
        : ['Failed to parse structured audit output'],
      questions_for_review: ['Review raw audit output manually'],
      summary: rawAnalysis.slice(0, 1000),
      overall_health: 'needs_attention',
    }
  }
}

// ── Tool implementations ──────────────────────────────────
function handleAuditTool(
  name: string,
  campaigns: Campaign[],
  leads: Lead[],
  searchTerms: SearchTerm[],
  negativeKeywords: NegativeKeyword[],
): unknown {
  switch (name) {
    case 'get_campaign_performance':
      return campaigns.map(c => ({
        name: c.name,
        platform: c.platform,
        spend: c.spend,
        leads: c.leads,
        qualified: c.qualified,
        conversions: c.conversions,
        revenue: c.revenue,
        roas: c.spend > 0 ? Number.parseFloat((c.revenue / c.spend).toFixed(2)) : 0,
        cpl: c.leads > 0 ? Number.parseFloat((c.spend / c.leads).toFixed(2)) : 0,
        qualification_rate: c.leads > 0 ? `${Math.round(c.qualified / c.leads * 100)}%` : '0%',
        status: c.status,
        health: c.revenue / c.spend >= 3 ? 'strong' : c.revenue / c.spend >= 1.5 ? 'moderate' : 'weak',
      }))

    case 'get_lead_quality_breakdown': {
      const stageCount: Record<string, number> = {}
      const sourceRevenue: Record<string, number> = {}
      leads.forEach((l) => {
        stageCount[l.stage] = (stageCount[l.stage] || 0) + 1
        const src = l.source || 'unknown'
        sourceRevenue[src] = (sourceRevenue[src] || 0) + (l.revenue || 0)
      })
      return {
        total_leads: leads.length,
        qualified: leads.filter(l => l.qualified === 'yes').length,
        not_a_fit: leads.filter(l => l.qualified === 'no').length,
        pending_qualification: leads.filter(l => l.qualified === '').length,
        stage_distribution: stageCount,
        revenue_by_source: sourceRevenue,
        total_revenue: leads.reduce((s, l) => s + (l.revenue || 0), 0),
      }
    }

    case 'get_search_term_waste': {
      const wasteTerms = searchTerms.filter(t => t.conversions === 0 && t.cost > 50)
      const totalWaste = wasteTerms.reduce((s, t) => s + t.cost, 0)
      return {
        waste_terms: wasteTerms.map(t => ({ term: t.term, campaign: t.campaign, cost: t.cost, clicks: t.clicks })),
        total_waste_spend: totalWaste,
        negative_labeled: searchTerms.filter(t => t.label === 'negative').length,
      }
    }

    case 'get_negative_keyword_gaps': {
      const negTerms = searchTerms.filter(t => t.label === 'negative').map(t => t.term)
      const existingNeg = negativeKeywords.map(k => k.keyword.toLowerCase())
      const gaps = negTerms.filter(t => !existingNeg.includes(t.toLowerCase()))
      return {
        new_negatives_needed: gaps,
        existing_negative_count: existingNeg.length,
        gap_count: gaps.length,
      }
    }

    case 'get_offline_conversion_candidates':
      return {
        candidates: leads
          .filter(l => l.revenue > 0 && l.gclid)
          .map(l => ({
            gclid: l.gclid,
            campaign: l.campaign,
            conversion_name: l.stage,
            conversion_value: l.revenue,
            conversion_time: l.updated_at,
          })),
        note: 'Upload these to Google Ads > Conversions > Upload to close the attribution loop',
      }

    case 'get_budget_optimization_analysis':
      return {
        allocation: campaigns.map(c => ({
          campaign: c.name,
          current_share: c.budgetShare,
          roas: Number.parseFloat((c.revenue / c.spend).toFixed(2)),
          recommended_action: c.revenue / c.spend >= 3 ? 'increase' : c.revenue / c.spend < 1.5 ? 'decrease' : 'hold',
        })),
        note: 'All budget changes require explicit human approval before implementation',
      }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
