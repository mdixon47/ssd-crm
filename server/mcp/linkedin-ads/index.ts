// ============================================================
// LinkedIn Ads MCP Server
// Tools for reading LinkedIn campaign and Lead Gen Form data.
//
// Configure LINKEDIN_ACCESS_TOKEN and LINKEDIN_AD_ACCOUNT_ID
// to switch from mock to live mode.
// ============================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SOCIAL_PLATFORMS } from '~/lib/mockData'

const isConfigured = () => !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AD_ACCOUNT_ID)
const LI_API = 'https://api.linkedin.com/rest'

async function liFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${LI_API}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'LinkedIn-Version': '202501',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  })
  return res.json()
}

export function createLinkedInAdsMCPServer() {
  const server = new McpServer({ name: 'linkedin-ads', version: '1.0.0' })
  const MODE = isConfigured() ? 'live' : 'mock'

  // ── get_campaigns ─────────────────────────────────────────
  server.registerTool(
    'get_campaigns',
    {
      description: 'Get all LinkedIn ad campaigns with performance metrics',
      inputSchema: {
        date_range_start: z.string().optional().describe('YYYY-MM-DD'),
        date_range_end: z.string().optional().describe('YYYY-MM-DD'),
      },
    },
    async ({ date_range_start, date_range_end }) => {
      if (MODE === 'live') {
        const data = await liFetch('adCampaigns', {
          q: 'search',
          search: JSON.stringify({ account: { values: [`urn:li:sponsoredAccount:${process.env.LINKEDIN_AD_ACCOUNT_ID}`] } }),
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            date_range: { start: date_range_start, end: date_range_end },
            campaigns: SOCIAL_PLATFORMS.li.campaigns.map(c => ({
              name: c.name,
              platform: 'linkedin',
              objective: c.objective,
              status: c.status,
              targeting: c.audience,
              spend: c.spend,
              impressions: c.reach,
              clicks: c.clicks,
              leads: c.leads,
              revenue: c.revenue,
              roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
              cpl: c.leads > 0 ? (c.spend / c.leads).toFixed(2) : '0',
              note: c.notes,
            })),
            total_spend: SOCIAL_PLATFORMS.li.campaigns.reduce((s, c) => s + c.spend, 0),
            total_leads: SOCIAL_PLATFORMS.li.campaigns.reduce((s, c) => s + c.leads, 0),
            total_revenue: SOCIAL_PLATFORMS.li.campaigns.reduce((s, c) => s + c.revenue, 0),
          }),
        }],
      }
    },
  )

  // ── get_lead_gen_forms ────────────────────────────────────
  server.registerTool(
    'get_lead_gen_forms',
    {
      description: 'Get all LinkedIn Lead Gen Forms with submission counts',
    },
    async () => {
      if (MODE === 'live') {
        const data = await liFetch('leadGenerationForms', {
          q: 'owner',
          owner: `urn:li:sponsoredAccount:${process.env.LINKEDIN_AD_ACCOUNT_ID}`,
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            forms: [
              { id: 'liform_001', name: 'Grants Management Consultation Request', submissions: 16, status: 'ACTIVE' },
              { id: 'liform_002', name: 'BH Consulting Discovery Call', submissions: 8, status: 'ACTIVE' },
              { id: 'liform_003', name: 'GW101 Course Interest (LI)', submissions: 9, status: 'ACTIVE' },
            ],
          }),
        }],
      }
    },
  )

  // ── get_lead_gen_responses ────────────────────────────────
  server.registerTool(
    'get_lead_gen_responses',
    {
      description: 'Get form responses from a specific LinkedIn Lead Gen Form',
      inputSchema: {
        form_id: z.string().describe('Lead Gen Form ID'),
        start_date: z.string().optional().describe('YYYY-MM-DD'),
      },
    },
    async ({ form_id, start_date }) => {
      if (MODE === 'live') {
        const data = await liFetch(`leadGenerationFormResponses`, {
          q: 'owner',
          owner: form_id,
          ...(start_date ? { start: start_date } : {}),
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            form_id,
            start_date,
            message: 'Configure LINKEDIN_ACCESS_TOKEN to fetch real lead responses',
            note: 'LinkedIn Lead Gen responses include: firstName, lastName, emailAddress, companyName, jobTitle, phoneNumber',
            sync_instruction: 'Use get_lead_gen_responses to pull new leads and POST to /api/leads to add to CRM',
          }),
        }],
      }
    },
  )

  // ── get_analytics ─────────────────────────────────────────
  server.registerTool(
    'get_analytics',
    {
      description: 'Get detailed analytics for a specific LinkedIn campaign',
      inputSchema: {
        campaign_id: z.string().describe('Campaign ID'),
        date_range_start: z.string().optional().describe('YYYY-MM-DD (default: 30 days ago)'),
        date_range_end: z.string().optional().describe('YYYY-MM-DD (default: today)'),
        breakdown: z.enum(['MEMBER_COMPANY_SIZE', 'MEMBER_JOB_FUNCTION', 'MEMBER_SENIORITY', 'none']).optional().default('none'),
      },
    },
    async ({ campaign_id, date_range_start, date_range_end, breakdown = 'none' }) => {
      if (MODE === 'live') {
        const params: Record<string, string> = {
          q: 'analytics',
          pivot: breakdown !== 'none' ? breakdown : 'CAMPAIGN',
          campaigns: `List(urn:li:sponsoredCampaign:${campaign_id})`,
          fields: 'costInLocalCurrency,impressions,clicks,leadGenerationMailContactInfoShares,totalEngagements',
        }
        if (date_range_start) params['dateRange.start.day'] = date_range_start.split('-')[2]
        if (date_range_end) params['dateRange.end.day'] = date_range_end.split('-')[2]
        const data = await liFetch('adAnalytics', params)
        return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
      }

      const campaign = SOCIAL_PLATFORMS.li.campaigns.find(c =>
        c.name.toLowerCase().includes(campaign_id.toLowerCase()),
      ) || SOCIAL_PLATFORMS.li.campaigns[0]

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            campaign_id,
            breakdown,
            analytics: {
              impressions: campaign.reach,
              clicks: campaign.clicks,
              spend: campaign.spend,
              leads: campaign.leads,
              cpl: (campaign.spend / campaign.leads).toFixed(2),
              roas: (campaign.revenue / campaign.spend).toFixed(2),
              ...(breakdown !== 'none' ? {
                breakdown_data: `Configure LinkedIn credentials for ${breakdown} breakdown`,
              } : {}),
            },
          }),
        }],
      }
    },
  )

  return server
}
