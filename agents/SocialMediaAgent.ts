// ============================================================
// Social Media Agent
// Analyzes a single platform's campaigns + content, recommends
// audience / budget / creative / format / tracking changes, and
// generates fresh post ideas tailored to SSD Consulting's offers.
//
// ⚠️  READ ONLY. Recommendations require human approval before
// any spend, audience, or campaign change is implemented.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { SocialPlatformData, SocialStrategyOutput } from '~/types'

const PLATFORM_NAMES: Record<string, string> = { fb: 'Facebook', ig: 'Instagram', li: 'LinkedIn' }

const SYSTEM_PROMPT = `You are SSD Consulting's paid social strategist. You analyze one platform at a time and produce concrete, evidence-based recommendations plus fresh creative ideas.

OFFERINGS:
- Grant Writing 101 Course (~$597) — lower-ticket, top-of-funnel
- Grants Management Consulting ($5K–$25K) — mid-ticket B2B
- Behavioral Health Consulting ($8K–$30K) — high-ticket B2B

DECISION FRAMEWORK:
- ROAS ≥ 3x → scale candidate
- ROAS 1.5–3x → hold, optimize creative or audience
- ROAS < 1.5x → flag for pause/review
- CPL > 2× platform target → bid or audience issue
- High reach + low leads → creative/CTA issue
- Low reach + decent CPL → budget-constrained, candidate for scale

CONTENT IDEA RULES:
- Match the platform's format strengths (Reels/Stories for IG, Lead Gen Forms for LI, Lead Ads + Carousel for FB).
- Use a tight, scroll-stopping hook (≤80 chars).
- Each idea has a clear audience and CTA tied to one offering.
- Avoid generic "tips" — be specific to grant writing, grants management, or behavioral health.

Recommendations must reference the named campaign or post when applicable. Never recommend automatic changes — flag for human approval. Return ONLY valid JSON. No markdown.`

export async function runSocialMediaAgent(
  client: Anthropic,
  platformKey: 'fb' | 'ig' | 'li',
  platform: SocialPlatformData,
): Promise<SocialStrategyOutput> {
  const modelUsed = 'claude-opus-4-6'
  let totalTokens = 0

  const tools: Anthropic.Tool[] = [
    {
      name: 'get_platform_metrics',
      description: 'Returns aggregate spend, leads, revenue, ROAS for the active platform',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_campaign_breakdown',
      description: 'Returns per-campaign performance with ROAS, CPL, audience, ad format, and a recommended action',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_post_engagement',
      description: 'Returns top + bottom performing posts/content by leads-per-reach',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
    {
      name: 'get_audience_format_inventory',
      description: 'Returns the current audience segments and ad formats configured for the platform',
      input_schema: { type: 'object' as const, properties: {}, required: [] },
    },
  ]

  const totalSpend = platform.campaigns.reduce((s, c) => s + c.spend, 0)
  const totalRevenue = platform.campaigns.reduce((s, c) => s + c.revenue, 0)
  const totalLeads = platform.campaigns.reduce((s, c) => s + c.leads, 0)

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Analyze SSD Consulting's ${PLATFORM_NAMES[platformKey]} performance.
Active campaigns: ${platform.campaigns.length}
Total spend: $${totalSpend.toLocaleString()}
Total leads: ${totalLeads}
Total revenue: $${totalRevenue.toLocaleString()}
Tagline: ${platform.tagline}

Use the tools to gather data, then return:
- An overall health rating
- Up to 6 prioritized recommendations
- Up to 5 fresh post ideas tailored to this platform
- Lists of campaigns to scale and to pause/review`,
    },
  ]

  let rawAnalysis = ''
  const MAX_ITERATIONS = 8
  let iteration = 0
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
        const result = handleSocialTool(block.name, platform)
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

  // Structured JSON conversion
  const structuredResponse = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: 'Return ONLY valid JSON. No markdown. Follow the schema exactly.',
    messages: [
      {
        role: 'user',
        content: `Convert this ${PLATFORM_NAMES[platformKey]} analysis into JSON matching exactly:
{
  "health": "strong"|"moderate"|"needs_attention",
  "recommendations": [{
    "area": "audience"|"budget"|"creative"|"format"|"tracking",
    "action": string,
    "priority": "high"|"medium"|"low",
    "rationale": string
  }],
  "post_ideas": [{
    "title": string,
    "format": string,
    "hook": string,
    "audience": string,
    "cta": string
  }],
  "scale_candidates": [string],
  "pause_candidates": [string],
  "summary": string
}

Analysis to convert:
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
      platform: platformKey,
      health: parsed.health ?? 'moderate',
      recommendations: parsed.recommendations ?? [],
      post_ideas: parsed.post_ideas ?? [],
      scale_candidates: parsed.scale_candidates ?? [],
      pause_candidates: parsed.pause_candidates ?? [],
      summary: parsed.summary ?? rawAnalysis.slice(0, 500),
      model_used: modelUsed,
      tokens_used: totalTokens,
    }
  }
  catch {
    return {
      generated_at: new Date().toISOString(),
      platform: platformKey,
      health: 'needs_attention',
      recommendations: [],
      post_ideas: [],
      scale_candidates: [],
      pause_candidates: [],
      summary: iteration >= MAX_ITERATIONS
        ? `Agent reached max iterations (${MAX_ITERATIONS}) — review raw output`
        : rawAnalysis.slice(0, 500),
      model_used: modelUsed,
      tokens_used: totalTokens,
    }
  }
}

// ── Tool implementations ──────────────────────────────────
function handleSocialTool(name: string, platform: SocialPlatformData): unknown {
  switch (name) {
    case 'get_platform_metrics': {
      const spend = platform.campaigns.reduce((s, c) => s + c.spend, 0)
      const revenue = platform.campaigns.reduce((s, c) => s + c.revenue, 0)
      const leads = platform.campaigns.reduce((s, c) => s + c.leads, 0)
      const reach = platform.campaigns.reduce((s, c) => s + c.reach, 0)
      return {
        spend,
        revenue,
        leads,
        reach,
        roas: spend > 0 ? Number.parseFloat((revenue / spend).toFixed(2)) : 0,
        avg_cpl: leads > 0 ? Number.parseFloat((spend / leads).toFixed(2)) : 0,
      }
    }
    case 'get_campaign_breakdown':
      return platform.campaigns.map((c) => {
        const roas = c.spend > 0 ? c.revenue / c.spend : 0
        return {
          name: c.name,
          objective: c.objective,
          audience: c.audience,
          ad_format: c.adFormat,
          spend: c.spend,
          leads: c.leads,
          revenue: c.revenue,
          cpl: c.cpl,
          roas: Number.parseFloat(roas.toFixed(2)),
          status: c.status,
          recommended_action: roas >= 3 ? 'scale' : roas >= 1.5 ? 'hold' : 'review',
          notes: c.notes,
        }
      })
    case 'get_post_engagement': {
      const ranked = [...platform.posts]
        .map((p) => {
          const reach = p.reach ?? 0
          const leads = p.leads ?? 0
          return { ...p, reach, leads, leads_per_reach: reach > 0 ? leads / reach : 0 }
        })
        .sort((a, b) => b.leads_per_reach - a.leads_per_reach)
      return {
        top: ranked.slice(0, 3).map(p => ({ title: p.title, format: p.format, reach: p.reach, leads: p.leads })),
        bottom: ranked.slice(-3).map(p => ({ title: p.title, format: p.format, reach: p.reach, leads: p.leads })),
      }
    }
    case 'get_audience_format_inventory':
      return { audiences: platform.audiences, ad_formats: platform.adFormats }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
