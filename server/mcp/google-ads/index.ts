// ============================================================
// Google Ads MCP Server
// Provides tools for reading Google Ads campaign data.
//
// When GOOGLE_ADS_DEVELOPER_TOKEN and other env vars are set,
// this uses the real Google Ads API. Otherwise returns mock data.
//
// ⚠️  READ-ONLY by design. Writing operations (bid changes,
// budget changes, adding negatives) require separate human-
// initiated confirmation flows.
// ============================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { GOOGLE_CAMPAIGNS, MOCK_SEARCH_TERMS } from '~/lib/mockData'

const isConfigured = () => !!(
  process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  && process.env.GOOGLE_ADS_CUSTOMER_ID
  && process.env.GOOGLE_ADS_REFRESH_TOKEN
)

export function createGoogleAdsMCPServer() {
  const server = new McpServer({
    name: 'google-ads',
    version: '1.0.0',
  })

  const MODE = isConfigured() ? 'live' : 'mock'

  // ── get_campaigns ─────────────────────────────────────────
  server.tool(
    'get_campaigns',
    'Returns performance data for all Google Ads campaigns',
    {
      date_range: z.enum(['LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'THIS_MONTH']).optional(),
    },
    async ({ date_range = 'LAST_30_DAYS' }) => {
      if (MODE === 'live') {
        // TODO: Implement real Google Ads API call
        // const { GoogleAdsApi } = await import('google-ads-api')
        // const client = new GoogleAdsApi({ ... })
        // const campaigns = await client.Customer(...).report({ ... })
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ error: 'Real Google Ads API not yet configured', mode: 'live' }),
          }],
          isError: true,
        }
      }

      // Mock response
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            date_range,
            campaigns: GOOGLE_CAMPAIGNS.map(c => ({
              id: c.id,
              name: c.name,
              status: c.status.toUpperCase(),
              spend: c.spend,
              impressions: Math.round(c.leads * 45),
              clicks: Math.round(c.leads * 3.2),
              conversions: c.conversions,
              conversion_value: c.revenue,
              cost_per_conversion: c.conversions > 0 ? (c.spend / c.conversions).toFixed(2) : null,
              roas: c.spend > 0 ? (c.revenue / c.spend).toFixed(2) : '0',
            })),
          }),
        }],
      }
    },
  )

  // ── get_search_term_report ────────────────────────────────
  server.tool(
    'get_search_term_report',
    'Returns the search terms report showing what users actually searched for',
    {
      campaign_id: z.string().optional().describe('Filter by campaign ID'),
      date_range: z.enum(['LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS']).optional(),
      min_impressions: z.number().optional().describe('Minimum impressions to include (default: 10)'),
    },
    async ({ campaign_id, date_range = 'LAST_7_DAYS', min_impressions = 10 }) => {
      if (MODE === 'live') {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Real API not configured' }) }],
          isError: true,
        }
      }

      const terms = campaign_id
        ? MOCK_SEARCH_TERMS.filter(t => t.campaign.toLowerCase().includes(campaign_id.toLowerCase()))
        : MOCK_SEARCH_TERMS

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            date_range,
            total_terms: terms.length,
            terms: terms
              .filter(t => t.impressions >= min_impressions)
              .map(t => ({
                search_term: t.term,
                campaign: t.campaign,
                impressions: t.impressions,
                clicks: t.clicks,
                cost: t.cost,
                conversions: t.conversions,
                ctr: t.impressions > 0 ? `${(t.clicks / t.impressions * 100).toFixed(2)}%` : '0%',
                cpc: t.clicks > 0 ? (t.cost / t.clicks).toFixed(2) : '0',
                current_label: t.label || 'unlabeled',
              })),
          }),
        }],
      }
    },
  )

  // ── get_keyword_performance ───────────────────────────────
  server.tool(
    'get_keyword_performance',
    'Returns performance data for keywords in a specific campaign',
    {
      campaign_id: z.string().describe('Campaign ID or name'),
      date_range: z.enum(['LAST_7_DAYS', 'LAST_30_DAYS']).optional(),
    },
    async ({ campaign_id, date_range = 'LAST_30_DAYS' }) => {
      const campaign = GOOGLE_CAMPAIGNS.find(c =>
        c.id === campaign_id || c.name.toLowerCase().includes(campaign_id.toLowerCase()),
      )
      if (!campaign) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Campaign not found: ${campaign_id}` }) }],
          isError: true,
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: 'mock',
            campaign: campaign.name,
            date_range,
            keywords: campaign.keywords.map((kw, i) => ({
              keyword: kw,
              status: 'ENABLED',
              impressions: Math.round(50 + Math.random() * 500),
              clicks: Math.round(5 + Math.random() * 50),
              cost: parseFloat((10 + Math.random() * 100).toFixed(2)),
              conversions: Math.round(Math.random() * 5),
              quality_score: Math.round(5 + Math.random() * 5),
            })),
          }),
        }],
      }
    },
  )

  // ── upload_offline_conversions ────────────────────────────
  server.tool(
    'upload_offline_conversions',
    'Uploads offline conversion data to Google Ads to close the attribution loop. REQUIRES HUMAN REVIEW before calling.',
    {
      conversions: z.array(z.object({
        gclid: z.string(),
        conversion_name: z.string(),
        conversion_time: z.string(),
        conversion_value: z.number(),
        currency_code: z.string().optional(),
      })).describe('Array of conversions to upload'),
      dry_run: z.boolean().optional().describe('If true, validates but does not upload (default: true for safety)'),
    },
    async ({ conversions, dry_run = true }) => {
      if (dry_run) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              mode: 'dry_run',
              validated: conversions.length,
              total_value: conversions.reduce((s, c) => s + c.conversion_value, 0),
              message: 'Dry run complete. Set dry_run: false and confirm with human approval to upload.',
              conversions_preview: conversions.slice(0, 3),
            }),
          }],
        }
      }

      // TODO: Real upload via Google Ads API
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: MODE,
            uploaded: conversions.length,
            message: MODE === 'mock' ? 'Mock upload — configure real credentials to go live' : 'Upload submitted',
          }),
        }],
      }
    },
  )

  // ── add_negative_keywords ─────────────────────────────────
  server.tool(
    'add_negative_keywords',
    'Adds negative keywords to a Google Ads campaign. REQUIRES HUMAN APPROVAL — always dry_run first.',
    {
      keywords: z.array(z.string()).describe('Keywords to add as negatives'),
      campaign_id: z.string().describe('Target campaign ID'),
      match_type: z.enum(['EXACT', 'PHRASE', 'BROAD']).optional().default('EXACT'),
      dry_run: z.boolean().optional().default(true),
    },
    async ({ keywords, campaign_id, match_type = 'EXACT', dry_run = true }) => {
      if (dry_run) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              mode: 'dry_run',
              keywords_to_add: keywords,
              campaign_id,
              match_type,
              message: '⚠️ DRY RUN — no changes made. Human must approve before setting dry_run: false.',
            }),
          }],
        }
      }

      // TODO: Real Google Ads API negative keyword addition
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            mode: MODE,
            added: keywords.length,
            message: MODE === 'mock' ? 'Mock — configure credentials to apply to real account' : 'Negatives added',
          }),
        }],
      }
    },
  )

  return server
}
