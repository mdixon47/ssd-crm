// ============================================================
// CRM MCP Server
// Exposes SSD Consulting's CRM data as MCP tools so Claude
// agents can read leads, campaigns, and search term data
// without direct database access.
//
// Transport: HTTP POST at /api/mcp/crm
// ============================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'

export function createCRMMCPServer() {
  const server = new McpServer({
    name: 'ssd-crm',
    version: '1.0.0',
  })

  // ── get_leads ────────────────────────────────────────────
  server.registerTool(
    'get_leads',
    {
      description: 'Retrieve leads from the CRM with optional filters',
      inputSchema: {
        stage: z.string().optional().describe('Filter by pipeline stage'),
        campaign: z.string().optional().describe('Filter by campaign name'),
        source: z.string().optional().describe('Filter by traffic source (google, facebook, etc.)'),
        qualified: z.string().optional().describe('Filter by qualification status (yes, no, partial)'),
        limit: z.number().optional().describe('Maximum number of leads to return (default: 50)'),
      },
    },
    async ({ stage, campaign, source, qualified, limit = 50 }) => {
      const supabase = createSupabaseClient()
      let query = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(limit)

      if (stage) query = query.eq('stage', stage)
      if (campaign) query = query.eq('campaign', campaign)
      if (source) query = query.eq('source', source)
      if (qualified) query = query.eq('qualified', qualified)

      const { data, error } = await query
      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ leads: data, count: data?.length ?? 0 }),
        }],
      }
    },
  )

  // ── get_lead ──────────────────────────────────────────────
  server.registerTool(
    'get_lead',
    {
      description: 'Get a single lead by ID',
      inputSchema: { id: z.string().describe('Lead UUID') },
    },
    async ({ id }) => {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase.from('leads').select('*').eq('id', id).single()
      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
    },
  )

  // ── get_campaign_summary ──────────────────────────────────
  server.registerTool(
    'get_campaign_summary',
    {
      description: 'Get aggregated performance summary for all campaigns with spend, leads, and revenue from both Google Ads and social platforms',
    },
    async () => {
      const supabase = createSupabaseClient()
      // Get revenue and lead counts from CRM grouped by campaign
      const { data, error } = await supabase
        .from('leads')
        .select('campaign, source, revenue, qualified, stage')

      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }

      // Aggregate
      const byCampaign: Record<string, { leads: number; revenue: number; qualified: number }> = {}
      for (const lead of (data ?? [])) {
        const key = lead.campaign || 'Unknown'
        if (!byCampaign[key]) byCampaign[key] = { leads: 0, revenue: 0, qualified: 0 }
        byCampaign[key].leads++
        byCampaign[key].revenue += lead.revenue ?? 0
        if (lead.qualified === 'yes') byCampaign[key].qualified++
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            crm_summary: byCampaign,
            ad_platform_data: GOOGLE_CAMPAIGNS.map(c => ({
              name: c.name,
              platform: c.platform,
              spend: c.spend,
              status: c.status,
            })),
            note: 'Spend data comes from ad platform mock. Revenue and leads from CRM.',
          }),
        }],
      }
    },
  )

  // ── get_search_terms ─────────────────────────────────────
  server.registerTool(
    'get_search_terms',
    {
      description: 'Get search terms from the weekly review, optionally filtered by campaign or label',
      inputSchema: {
        campaign: z.string().optional().describe('Filter by campaign name'),
        label: z.string().optional().describe('Filter by label (keep, watch, negative, build_page, new_campaign)'),
      },
    },
    async ({ campaign, label }) => {
      const supabase = createSupabaseClient()
      let query = supabase.from('search_terms').select('*').order('cost', { ascending: false })
      if (campaign) query = query.eq('campaign', campaign)
      if (label) query = query.eq('label', label)

      const { data, error } = await query
      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ terms: data, count: data?.length ?? 0 }) }] }
    },
  )

  // ── get_negative_keywords ────────────────────────────────
  server.registerTool(
    'get_negative_keywords',
    {
      description: 'Get all active negative keywords from the blocklist',
      inputSchema: {
        category: z.string().optional().describe('Filter by category'),
        platform: z.string().optional().describe('Filter by platform (all, google, facebook, linkedin)'),
      },
    },
    async ({ category, platform }) => {
      const supabase = createSupabaseClient()
      let query = supabase.from('negative_keywords').select('*').eq('active', true)
      if (category) query = query.eq('category', category)
      if (platform) query = query.eq('platform', platform)

      const { data, error } = await query
      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ keywords: data, count: data?.length ?? 0 }) }] }
    },
  )

  // ── get_revenue_summary ───────────────────────────────────
  server.registerTool(
    'get_revenue_summary',
    {
      description: 'Get total revenue, average deal size, and revenue by stage and source',
    },
    async () => {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('leads')
        .select('stage, source, campaign, revenue, qualified')
        .gt('revenue', 0)

      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }

      const total = (data ?? []).reduce((s, l) => s + (l.revenue ?? 0), 0)
      const bySource: Record<string, number> = {}
      const byStage: Record<string, number> = {}
      for (const l of (data ?? [])) {
        const src = l.source || 'unknown'
        bySource[src] = (bySource[src] || 0) + (l.revenue ?? 0)
        byStage[l.stage] = (byStage[l.stage] || 0) + (l.revenue ?? 0)
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total_revenue: total,
            count: data?.length ?? 0,
            avg_deal: total / (data?.length || 1),
            by_source: bySource,
            by_stage: byStage,
          }),
        }],
      }
    },
  )

  return server
}
