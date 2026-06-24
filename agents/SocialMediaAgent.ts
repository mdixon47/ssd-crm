// ============================================================
// Social Media Agent
// Analyzes a single platform's campaigns + content, recommends
// audience / budget / creative / format / tracking changes, and
// generates fresh post ideas tailored to SSD Consulting's offers.
//
// Architecture: the four data "tools" are pure functions of the
// platform object, so they're computed server-side up front and
// injected into the prompt. A SINGLE forced-tool call then returns
// the structured strategy directly — no agentic loop and no separate
// JSON-conversion call.
//
// Model + output size are tuned for the 26s serverless wall: Sonnet
// generating the full strategy measured 32-57s (over the limit, often
// truncated at the token cap) -> 504. Haiku with a leaner output target
// (~750-810 tokens) completes in ~6-8s with comfortable margin. The
// output is advisory and human-approved, so Haiku's quality is ample.
//
// ⚠️  READ ONLY. Recommendations require human approval before
// any spend, audience, or campaign change is implemented.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { SocialPlatformData, SocialStrategyOutput } from '~/types'
import { CLAUDE_HAIKU } from '~/lib/models'

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

Recommendations must reference the named campaign or post when applicable. Never recommend automatic changes — flag for human approval. Keep rationales concise. Submit your full analysis via the submit_strategy tool.`

const SUBMIT_STRATEGY: Anthropic.Tool = {
  name: 'submit_strategy',
  description: 'Submit the completed platform strategy.',
  input_schema: {
    type: 'object' as const,
    properties: {
      health: { type: 'string', enum: ['strong', 'moderate', 'needs_attention'] },
      recommendations: {
        type: 'array',
        description: 'Up to 4, highest priority first. Keep each rationale to one short sentence.',
        items: {
          type: 'object',
          properties: {
            area: { type: 'string', enum: ['audience', 'budget', 'creative', 'format', 'tracking'] },
            action: { type: 'string' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            rationale: { type: 'string' },
          },
          required: ['area', 'action', 'priority'],
        },
      },
      post_ideas: {
        type: 'array',
        description: 'Up to 3 platform-tailored ideas',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            format: { type: 'string' },
            hook: { type: 'string' },
            audience: { type: 'string' },
            cta: { type: 'string' },
          },
          required: ['title', 'format', 'hook'],
        },
      },
      scale_candidates: { type: 'array', items: { type: 'string' }, description: 'Campaign names to scale' },
      pause_candidates: { type: 'array', items: { type: 'string' }, description: 'Campaign names to pause/review' },
      summary: { type: 'string' },
    },
    required: ['health', 'recommendations', 'post_ideas', 'summary'],
  },
}

export async function runSocialMediaAgent(
  client: Anthropic,
  platformKey: 'fb' | 'ig' | 'li',
  platform: SocialPlatformData,
): Promise<SocialStrategyOutput> {
  const modelUsed = CLAUDE_HAIKU
  const name = PLATFORM_NAMES[platformKey]

  // Compute every "tool" result up front — they're pure functions of `platform`.
  const metrics = computeMetrics(platform)
  const breakdown = computeCampaignBreakdown(platform)
  const engagement = computePostEngagement(platform)
  const inventory = { audiences: platform.audiences, ad_formats: platform.adFormats }

  const userPrompt = `Analyze SSD Consulting's ${name} performance, then submit the strategy via submit_strategy.

PLATFORM: ${name}
TAGLINE: ${platform.tagline}

AGGREGATE METRICS:
${JSON.stringify(metrics)}

CAMPAIGN BREAKDOWN:
${JSON.stringify(breakdown)}

POST ENGAGEMENT (top / bottom by leads-per-reach):
${JSON.stringify(engagement)}

AUDIENCES & AD FORMATS:
${JSON.stringify(inventory)}

Produce: an overall health rating, up to 4 prioritized recommendations (one-sentence rationales), up to 3 fresh post ideas tailored to ${name}, lists of campaigns to scale and to pause/review, and a 2-sentence summary. Be concise. Reference campaigns/posts by name.`

  const base = {
    generated_at: new Date().toISOString(),
    platform: platformKey,
    model_used: modelUsed,
    tokens_used: 0,
  }

  // The shared client bounds this at 23s / no-retry (see server/utils/anthropic.ts),
  // so a slow/overloaded upstream returns the graceful fallback below instead of a 504.
  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: modelUsed,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: [SUBMIT_STRATEGY],
      tool_choice: { type: 'tool', name: 'submit_strategy' },
      messages: [{ role: 'user', content: userPrompt }],
    })
  }
  catch (err) {
    console.error('[social-strategy] Anthropic call failed:', err)
    return {
      ...base,
      health: 'needs_attention',
      recommendations: [],
      post_ideas: [],
      scale_candidates: [],
      pause_candidates: [],
      summary: 'The strategist timed out or the AI service was unavailable — please retry in a moment.',
    }
  }

  base.tokens_used = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
  const block = response.content.find(b => b.type === 'tool_use')

  if (!block || block.type !== 'tool_use') {
    return {
      ...base,
      health: 'needs_attention',
      recommendations: [],
      post_ideas: [],
      scale_candidates: [],
      pause_candidates: [],
      summary: 'The strategist did not return a structured result — please retry.',
    }
  }

  const out = block.input as Partial<SocialStrategyOutput>
  return {
    ...base,
    health: out.health ?? 'moderate',
    recommendations: out.recommendations ?? [],
    post_ideas: out.post_ideas ?? [],
    scale_candidates: out.scale_candidates ?? [],
    pause_candidates: out.pause_candidates ?? [],
    summary: out.summary ?? '',
  }
}

// ── Data computations (pure functions of the platform object) ──
function computeMetrics(platform: SocialPlatformData) {
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

function computeCampaignBreakdown(platform: SocialPlatformData) {
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
}

function computePostEngagement(platform: SocialPlatformData) {
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
