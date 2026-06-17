// ============================================================
// A2A (Agent-to-Agent) Router
// Allows registered agents to send structured task messages
// to other agents by name. Each agent handles a set of tasks.
//
// Protocol:
//   POST /api/a2a/{agent-name}
//   Body: { task, payload, from?, context? }
//   Response: { success, agent, result, error? }
//
// Registered agents:
//   content-publisher  → ContentPublishingAgent
//   crm-operations     → CRM lead context queries (read-only subset)
// ============================================================
import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runContentPublishingAgent } from '~/agents/ContentPublishingAgent'

const schema = z.object({
  task: z.string().min(1),
  payload: z.record(z.unknown()),
  from: z.string().optional(),
  context: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'agent')
  if (!agentId) throw createError({ statusCode: 400, message: 'Missing agent name' })

  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const { task, payload, from, context } = parsed.data
  const supabase = createSupabaseClient()

  // ── content-publisher ─────────────────────────────────────
  if (agentId === 'content-publisher') {
    const anthropic = getAnthropicClient()

    // Supported tasks: create_content
    if (task === 'create_content') {
      const topicSchema = z.object({
        topic: z.string().min(1),
        platform: z.enum(['linkedin', 'facebook', 'instagram', 'email', 'all']).default('linkedin'),
        offer: z.enum(['gw101', 'grants_consulting', 'bh_consulting', 'free_course', 'general']).optional(),
        tone: z.enum(['educational', 'promotional', 'testimonial', 'story', 'announcement']).optional(),
        context: z.string().optional(),
      })

      const req = topicSchema.safeParse(payload)
      if (!req.success) {
        return { success: false, agent: agentId, result: null, error: req.error.message }
      }

      const result = await runContentPublishingAgent(anthropic, supabase, {
        ...req.data,
        context: req.data.context ?? (context ? JSON.stringify(context) : undefined),
      })

      return { success: true, agent: agentId, result }
    }

    return { success: false, agent: agentId, result: null, error: `Unknown task: ${task}` }
  }

  // ── crm-operations ────────────────────────────────────────
  // Read-only subset exposed to other agents: lead counts and campaign data.
  if (agentId === 'crm-operations') {
    if (task === 'get_lead_context') {
      const days = Number((payload.days as number) ?? 30)
      const since = new Date(Date.now() - days * 86_400_000).toISOString()

      const { data: leads } = await supabase
        .from('leads')
        .select('stage, source, campaign, qualified, interest')
        .gte('created_at', since)

      const bySource: Record<string, number> = {}
      const byStage: Record<string, number> = {}
      let qualified = 0
      const topics = new Set<string>()

      for (const l of (leads ?? [])) {
        bySource[l.source || 'unknown'] = (bySource[l.source || 'unknown'] || 0) + 1
        byStage[l.stage] = (byStage[l.stage] || 0) + 1
        if (l.qualified === 'yes') qualified++
        if (l.interest) topics.add(l.interest)
      }

      return {
        success: true,
        agent: agentId,
        result: {
          requested_by: from,
          period_days: days,
          total_leads: leads?.length ?? 0,
          qualified_leads: qualified,
          leads_by_source: bySource,
          leads_by_stage: byStage,
          common_interests: [...topics].slice(0, 10),
        },
      }
    }

    if (task === 'get_campaign_context') {
      const { data } = await supabase
        .from('leads')
        .select('campaign, source, revenue, qualified')

      const byCampaign: Record<string, { leads: number; revenue: number; qualified: number }> = {}
      for (const l of (data ?? [])) {
        const key = l.campaign || 'Unknown'
        if (!byCampaign[key]) byCampaign[key] = { leads: 0, revenue: 0, qualified: 0 }
        byCampaign[key].leads++
        byCampaign[key].revenue += l.revenue ?? 0
        if (l.qualified === 'yes') byCampaign[key].qualified++
      }

      return { success: true, agent: agentId, result: { requested_by: from, campaigns: byCampaign } }
    }

    return { success: false, agent: agentId, result: null, error: `Unknown task: ${task}` }
  }

  throw createError({ statusCode: 404, message: `Unknown agent: ${agentId}. Available: content-publisher, crm-operations` })
})
