// ============================================================
// Content Publishing Agent
// Creates platform-optimised content for LinkedIn, Facebook,
// Instagram, and Email based on topic, offer, tone, and live
// CRM context (recent lead volume, top campaigns, winning angles).
//
// Architecture: ONE forced-tool Sonnet call per platform, run in
// PARALLEL. CRM context is prefetched server-side (no model
// round-trips), so even `platform: 'all'` (4 pieces) finishes well
// within the serverless function timeout instead of 504-ing.
// Content creation happens in the model's response — no auto-post.
//
// A2A: This agent is callable from the CRM Operations Agent
// via POST /api/a2a/content-publisher.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { ContentPublishResult, ContentPlatform, ContentOffer, ContentTone, GeneratedContent, ContentType } from '~/types'
import { CLAUDE_SONNET } from '~/lib/models'
import type { createSupabaseClient } from '~/server/utils/supabase'

type SupabaseClient = ReturnType<typeof createSupabaseClient>

const PLATFORM_GUIDELINES: Record<string, string> = {
  linkedin: 'Professional tone. 150–300 words. Lead with insight or question. Use line breaks for scannability. 3–5 relevant hashtags at the end. End with a single CTA.',
  facebook: 'Conversational and warm. 100–250 words. Story-first or question hook. Include a clear CTA and link placeholder. 2–3 hashtags.',
  instagram: 'Visual-first caption. 50–150 words. Hook in first line (no truncation). Heavy emoji use. 10–15 hashtags in first comment (list them separately).',
  email: 'Subject line (≤60 chars) + preview text (≤100 chars) + full body. 200–400 word body. Sections: hook → value → offer → CTA. Sign off as Malik from SSD Consulting.',
}

const OFFER_DESCRIPTIONS: Record<string, string> = {
  gw101: 'Grant Writing 101: Foundations — paid online course ~$597, teaches nonprofits to write winning grant proposals',
  grants_consulting: 'Grants Management Consulting — $5K–$25K engagements, hands-on grant writing and management for nonprofits',
  bh_consulting: 'Behavioral Health Consulting — $8K–$30K engagements, compliance and workforce training for BH agencies',
  free_course: 'Free Grant Writing Mini-Course — top-of-funnel lead magnet, 5-day email course on grant writing basics',
  general: 'SSD Consulting — grant writing and behavioral health consulting for nonprofits and government agencies',
}

const SYSTEM_PROMPT = `You are SSD Consulting's Content Publishing Agent. You create high-converting, platform-native content that builds authority and drives leads for SSD Consulting's programs.

SSD CONSULTING OFFERINGS:
${Object.entries(OFFER_DESCRIPTIONS).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

YOUR TASK:
Write ONE platform-native content piece for the requested platform, then submit it with the submit_content tool. Live CRM context is provided in the user message — use it to sharpen your angle. Do not write anything outside the tool call.

CONTENT QUALITY STANDARDS:
- Every piece must have a scroll-stopping hook in the first line
- Reference real pain points: "Your grant proposal was rejected" / "Nonprofits leave millions on the table"
- Use specific numbers when possible: "85% of first-time grant applicants get rejected"
- CTAs must be specific: "DM me 'GRANT' to get the free guide" / "Link in bio to enroll"
- Never sound generic or corporate — speak to nonprofit executive directors and program managers
- Sign off on LinkedIn/Facebook/email as "Malik | SSD Consulting"`

const SUBMIT_TOOL: Anthropic.Tool = {
  name: 'submit_content',
  description: 'Submit the finished content piece.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Short descriptive title for this piece' },
      body: { type: 'string', description: 'Full content body (the actual post/email copy)' },
      content_type: { type: 'string', enum: ['post', 'email', 'carousel', 'reel', 'article'], description: 'Content format' },
      hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags / tags for this piece' },
      angle: { type: 'string', description: 'One sentence explaining the creative angle and hook you chose' },
      suggested_schedule: { type: 'string', description: 'Optional: best day/time to publish' },
    },
    required: ['title', 'body', 'content_type'],
  },
}

const ALL_PLATFORMS: ContentPlatform[] = ['linkedin', 'facebook', 'instagram', 'email']

/** Prefetch live CRM + recent-content context once, server-side (no model calls). */
async function prefetchContext(supabase: SupabaseClient, platform: ContentPlatform): Promise<string> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const calendarPlatform = platform === 'all' ? null : platform

  const [{ data: leads }, { data: recentContent }] = await Promise.all([
    supabase.from('leads').select('stage, source, qualified').gte('created_at', since),
    supabase
      .from('content_items')
      .select('title, platform, topic')
      .in('status', ['published', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const bySource: Record<string, number> = {}
  let qualified = 0
  for (const l of (leads ?? [])) {
    bySource[l.source || 'unknown'] = (bySource[l.source || 'unknown'] || 0) + 1
    if (l.qualified === 'yes') qualified++
  }

  const recent = (recentContent ?? [])
    .filter(c => !calendarPlatform || c.platform === calendarPlatform)
    .map(c => `- ${c.platform}: ${c.topic || c.title}`)
    .slice(0, 6)

  return [
    `Leads (last 30d): ${leads?.length ?? 0} total, ${qualified} qualified. By source: ${JSON.stringify(bySource)}.`,
    recent.length ? `Recent/scheduled content (avoid repeating):\n${recent.join('\n')}` : 'No recent content on record.',
  ].join('\n')
}

/** One forced-tool Sonnet call → one finished content piece for a single platform. */
async function generatePiece(
  anthropic: Anthropic,
  platform: ContentPlatform,
  request: { topic: string, offer?: ContentOffer, tone?: ContentTone, context?: string },
  contextSummary: string,
): Promise<GeneratedContent | null> {
  const offerDesc = request.offer ? OFFER_DESCRIPTIONS[request.offer] : OFFER_DESCRIPTIONS.general
  const guide = PLATFORM_GUIDELINES[platform] ?? PLATFORM_GUIDELINES.linkedin

  const userPrompt = `Create ONE ${platform.toUpperCase()} content piece.

TOPIC: ${request.topic}
OFFER: ${offerDesc}
TONE: ${request.tone ?? 'educational'}
PLATFORM GUIDE: ${guide}
${request.context ? `\nADDITIONAL CONTEXT:\n${request.context}\n` : ''}
LIVE CRM CONTEXT (use to sharpen the angle; do not quote verbatim):
${contextSummary}

Write the piece and submit it via submit_content.`

  const response = await anthropic.messages.create({
    model: CLAUDE_SONNET,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    tools: [SUBMIT_TOOL],
    tool_choice: { type: 'tool', name: 'submit_content' },
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = response.content.find(b => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return null
  const input = block.input as Record<string, unknown>
  if (!input.body || !input.title) return null

  return {
    platform,
    title: String(input.title),
    body: String(input.body),
    content_type: ((input.content_type as ContentType) ?? (platform === 'email' ? 'email' : 'post')),
    tone: request.tone ?? 'educational',
    hashtags: Array.isArray(input.hashtags) ? (input.hashtags as string[]) : [],
    suggested_schedule: input.suggested_schedule ? String(input.suggested_schedule) : undefined,
    notes: input.angle ? String(input.angle) : undefined,
  }
}

export async function runContentPublishingAgent(
  anthropic: Anthropic,
  supabase: SupabaseClient,
  request: {
    topic: string
    platform: ContentPlatform
    offer?: ContentOffer
    tone?: ContentTone
    context?: string
  },
): Promise<ContentPublishResult & { savedIds: string[] }> {
  const contextSummary = await prefetchContext(supabase, request.platform)

  const platforms = request.platform === 'all' ? ALL_PLATFORMS : [request.platform]

  // Generate every platform's piece concurrently — wall-clock ≈ slowest single
  // call, not the sum. A failure on one platform won't sink the others.
  const settled = await Promise.allSettled(
    platforms.map(p => generatePiece(anthropic, p, request, contextSummary)),
  )
  const pieces = settled
    .map(s => (s.status === 'fulfilled' ? s.value : null))
    .filter((p): p is GeneratedContent => p !== null)

  // Persist each piece (errors per-row are skipped, not fatal).
  const savedIds: string[] = []
  for (const piece of pieces) {
    const { data, error } = await supabase
      .from('content_items')
      .insert({
        title: piece.title,
        body: piece.body,
        content_type: piece.content_type,
        platform: piece.platform,
        status: 'draft',
        topic: request.topic,
        offer: request.offer ?? null,
        tone: piece.tone,
        tags: piece.hashtags ?? [],
        performance: {},
      })
      .select()
      .single()
    if (!error && data) savedIds.push(data.id)
  }

  const failed = platforms.length - pieces.length
  const strategyNotes = pieces.length
    ? pieces.map(p => `${p.platform.toUpperCase()}: ${p.notes ?? 'created'}`).join('\n')
      + (failed > 0 ? `\n(${failed} platform piece(s) could not be generated this run.)` : '')
    : 'No content could be generated — please retry.'

  return {
    items: pieces,
    strategy_notes: strategyNotes,
    model_used: CLAUDE_SONNET,
    savedIds,
  }
}
