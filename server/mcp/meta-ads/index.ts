// ============================================================
// Meta (Facebook + Instagram) Ads MCP Server
// Tools for reading campaign, ad set, and lead form data
// from the Meta Marketing API.
//
// Configure META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in .env
// to switch from mock to live mode.
// ============================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SOCIAL_PLATFORMS } from '~/lib/mockData'

const isConfigured = () => !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID)
const META_API = 'https://graph.facebook.com/v20.0'

async function metaFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_API}/${path}`)
  url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN!)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  return res.json()
}

export function createMetaAdsMCPServer() {
  const server = new McpServer({ name: 'meta-ads', version: '1.0.0' })
  const MODE = isConfigured() ? 'live' : 'mock'

  // ── get_campaigns ─────────────────────────────────────────
  server.registerTool(
    'get_campaigns',
    {
      description: 'Get all Facebook and Instagram ad campaigns with performance metrics',
      inputSchema: {
        date_preset: z.enum(['last_7d', 'last_14d', 'last_30d', 'this_month']).optional(),
        platform: z.enum(['facebook', 'instagram', 'all']).optional().default('all'),
      },
    },
    async ({ date_preset = 'last_30d', platform = 'all' }) => {
      if (MODE === 'live') {
        const data = await metaFetch(`act_${process.env.META_AD_ACCOUNT_ID}/campaigns`, {
          fields: 'id,name,status,objective,spend,impressions,reach,clicks,conversions',
          date_preset,
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      const fbCampaigns = platform !== 'instagram' ? SOCIAL_PLATFORMS.fb.campaigns : []
      const igCampaigns = platform !== 'facebook' ? SOCIAL_PLATFORMS.ig.campaigns : []

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            date_preset,
            facebook: fbCampaigns.map(c => ({
              name: c.name,
              platform: 'facebook',
              objective: c.objective,
              status: c.status,
              spend: c.spend,
              reach: c.reach,
              clicks: c.clicks,
              leads: c.leads,
              revenue: c.revenue,
              roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
              cpl: c.leads > 0 ? (c.spend / c.leads).toFixed(2) : '0',
            })),
            instagram: igCampaigns.map(c => ({
              name: c.name,
              platform: 'instagram',
              objective: c.objective,
              status: c.status,
              spend: c.spend,
              reach: c.reach,
              clicks: c.clicks,
              leads: c.leads,
              revenue: c.revenue,
              roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
            })),
          }),
        }],
      }
    },
  )

  // ── get_lead_forms ────────────────────────────────────────
  server.registerTool(
    'get_lead_forms',
    {
      description: 'Get all Facebook Lead Ad forms with response counts',
    },
    async () => {
      if (MODE === 'live') {
        const data = await metaFetch(`act_${process.env.META_AD_ACCOUNT_ID}/leadgen_forms`, {
          fields: 'id,name,status,leads_count,created_time',
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            forms: [
              { id: 'form_001', name: 'Free Grant Writing Course — Lead Form', status: 'ACTIVE', leads_count: 28 },
              { id: 'form_002', name: 'GW101 Enrollment Interest Form', status: 'ACTIVE', leads_count: 14 },
              { id: 'form_003', name: 'Consultation Request Form', status: 'ACTIVE', leads_count: 9 },
            ],
          }),
        }],
      }
    },
  )

  // ── get_lead_form_responses ───────────────────────────────
  server.registerTool(
    'get_lead_form_responses',
    {
      description: 'Get responses (lead data) from a specific Facebook Lead Ad form',
      inputSchema: {
        form_id: z.string().describe('Lead form ID'),
        limit: z.number().optional().default(25),
      },
    },
    async ({ form_id, limit = 25 }) => {
      if (MODE === 'live') {
        const data = await metaFetch(`${form_id}/leads`, {
          fields: 'id,created_time,field_data',
          limit: String(limit),
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            form_id,
            message: 'Configure META_ACCESS_TOKEN and META_AD_ACCOUNT_ID to fetch real lead responses',
            note: 'Lead responses contain: full_name, email, phone_number, organization (if form fields configured)',
          }),
        }],
      }
    },
  )

  // ── get_insights ──────────────────────────────────────────
  server.registerTool(
    'get_insights',
    {
      description: 'Get performance insights for a campaign, ad set, or ad',
      inputSchema: {
        object_id: z.string().describe('Campaign, ad set, or ad ID'),
        level: z.enum(['campaign', 'adset', 'ad']).describe('Breakdown level'),
        date_preset: z.enum(['last_7d', 'last_14d', 'last_30d']).optional().default('last_7d'),
        breakdown: z.enum(['age', 'gender', 'placement', 'device']).optional(),
      },
    },
    async ({ object_id, level, date_preset = 'last_7d', breakdown }) => {
      if (MODE === 'live') {
        const params: Record<string, string> = {
          fields: 'spend,impressions,reach,clicks,ctr,cpm,cpc,conversions,cost_per_conversion,roas',
          level,
          date_preset,
        }
        if (breakdown) params.breakdowns = breakdown
        const data = await metaFetch(`${object_id}/insights`, params)
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            object_id,
            level,
            date_preset,
            insights: { message: 'Configure META credentials for real insights data' },
          }),
        }],
      }
    },
  )

  return server
}
