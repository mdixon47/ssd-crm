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
import type { AuditReport, Campaign, Lead, SearchTerm, NegativeKeyword, GAOverview, DataMode } from '~/types'
import { CLAUDE_HAIKU } from '~/lib/models'

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

Remember: You analyze and recommend. Humans decide and act. Submit your full audit via the submit_audit tool.`

const STR_ARRAY = { type: 'array' as const, items: { type: 'string' as const } }

const SUBMIT_AUDIT: Anthropic.Tool = {
  name: 'submit_audit',
  description: 'Submit the completed weekly audit report.',
  input_schema: {
    type: 'object' as const,
    properties: {
      campaigns_to_scale: STR_ARRAY,
      campaigns_to_pause: STR_ARRAY,
      keywords_to_keep: STR_ARRAY,
      keywords_to_remove: STR_ARRAY,
      negative_keyword_suggestions: STR_ARRAY,
      landing_page_issues: STR_ARRAY,
      budget_recommendations: STR_ARRAY,
      tracking_issues: STR_ARRAY,
      questions_for_review: STR_ARRAY,
      summary: { type: 'string' },
      overall_health: { type: 'string', enum: ['strong', 'moderate', 'needs_attention'] },
    },
    required: ['summary', 'overall_health'],
  },
}

export async function runWeeklyAuditAgent(
  client: Anthropic,
  context: {
    campaigns: Campaign[]
    leads: Lead[]
    searchTerms: SearchTerm[]
    negativeKeywords: NegativeKeyword[]
    webAnalytics?: GAOverview
    weekDate?: string
    dataMode?: DataMode
  },
): Promise<AuditReport> {
  const { campaigns, leads, searchTerms, negativeKeywords, webAnalytics, weekDate, dataMode = 'mock' } = context
  const modelUsed = CLAUDE_HAIKU

  // Every audit "tool" is a pure function of the injected context — compute them
  // all up front and inject, so ONE forced-tool call replaces the old 5-iteration
  // serial loop + separate JSON-conversion call (which together 504'd).
  const tool = (name: string) => handleAuditTool(name, campaigns, leads, searchTerms, negativeKeywords, webAnalytics)
  const data = {
    campaign_performance: tool('get_campaign_performance'),
    lead_quality: tool('get_lead_quality_breakdown'),
    search_term_waste: tool('get_search_term_waste'),
    negative_keyword_gaps: tool('get_negative_keyword_gaps'),
    offline_conversion_candidates: tool('get_offline_conversion_candidates'),
    budget_optimization: tool('get_budget_optimization_analysis'),
    website_analytics: tool('get_website_analytics'),
  }

  const modeNote = dataMode === 'mock'
    ? 'IMPORTANT: The campaign/ads figures below are SAMPLE/MOCK data, not live ad-platform performance. Keep findings illustrative and do NOT present these numbers as real, verified results.\n\n'
    : ''

  const userPrompt = `${modeNote}Run the weekly paid acquisition audit for SSD Consulting, then submit it via submit_audit.
Week: ${weekDate || new Date().toISOString().slice(0, 10)}
Total campaigns: ${campaigns.length}
Leads this period: ${leads.filter(l => new Date(l.lead_date) > new Date(Date.now() - 7 * 86400 * 1000)).length}

DATA (already gathered for you across all channels):
${JSON.stringify(data)}

Analyze all of it and produce the structured audit report — be specific and name campaigns, keywords, and landing pages. Keep it concise: short phrases over paragraphs, highest-impact items only.`

  const response = await client.messages.create({
    model: modelUsed,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_AUDIT],
    tool_choice: { type: 'tool', name: 'submit_audit' },
    messages: [{ role: 'user', content: userPrompt }],
  }).catch((err: unknown) => {
    // Timeout/429/529 → null, which falls through to the structured fallback
    // below instead of surfacing an opaque 500 to the caller.
    console.warn('[weekly-audit] AI call failed — using fallback report:', err instanceof Error ? err.message : err)
    return null
  })

  const generatedAt = new Date().toISOString()
  const block = response?.content.find(b => b.type === 'tool_use')

  if (!block || block.type !== 'tool_use') {
    return {
      generated_at: generatedAt,
      campaigns_to_scale: [],
      campaigns_to_pause: [],
      keywords_to_keep: [],
      keywords_to_remove: [],
      negative_keyword_suggestions: [],
      landing_page_issues: [],
      budget_recommendations: [],
      tracking_issues: ['Audit agent did not return a structured result — please retry'],
      questions_for_review: ['Review raw audit output manually'],
      summary: '',
      overall_health: 'needs_attention',
    }
  }

  const out = block.input as Partial<AuditReport>
  return {
    generated_at: generatedAt,
    campaigns_to_scale: out.campaigns_to_scale ?? [],
    campaigns_to_pause: out.campaigns_to_pause ?? [],
    keywords_to_keep: out.keywords_to_keep ?? [],
    keywords_to_remove: out.keywords_to_remove ?? [],
    negative_keyword_suggestions: out.negative_keyword_suggestions ?? [],
    landing_page_issues: out.landing_page_issues ?? [],
    budget_recommendations: out.budget_recommendations ?? [],
    tracking_issues: out.tracking_issues ?? [],
    questions_for_review: out.questions_for_review ?? [],
    summary: out.summary ?? '',
    overall_health: out.overall_health ?? 'moderate',
  }
}

// ── Tool implementations ──────────────────────────────────
function handleAuditTool(
  name: string,
  campaigns: Campaign[],
  leads: Lead[],
  searchTerms: SearchTerm[],
  negativeKeywords: NegativeKeyword[],
  webAnalytics?: GAOverview,
): unknown {
  switch (name) {
    case 'get_website_analytics':
      return webAnalytics
        ? {
            mode: webAnalytics.mode,
            range: webAnalytics.range,
            totals: webAnalytics.totals,
            channels: webAnalytics.channels,
            top_landing_pages: webAnalytics.topLandingPages,
            conversion_events: webAnalytics.conversionEvents,
          }
        : { error: 'Website analytics not available for this audit run.' }

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
