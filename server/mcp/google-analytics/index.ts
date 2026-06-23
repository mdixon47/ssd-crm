// ============================================================
// Google Analytics 4 MCP Server
// Exposes website analytics (traffic, acquisition channels,
// landing pages, conversions) to AI agents.
//
// When GA4_PROPERTY_ID + service-account creds are set this reads
// live data via the GA4 Data API; otherwise returns mock data.
// Backed by the shared server/utils/googleAnalytics.ts data layer.
//
// ⚠️  READ-ONLY by design.
// ============================================================
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getGA4Overview } from '~/server/utils/googleAnalytics'
import type { GADateRange } from '~/types'

const RANGE = z.enum(['LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS'])

const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data) }],
})
const fail = (message: string) => ({
  content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
  isError: true,
})

export function createGoogleAnalyticsMCPServer() {
  const server = new McpServer({ name: 'google-analytics', version: '1.0.0' })

  // ── get_traffic_overview ──────────────────────────────────
  server.registerTool(
    'get_traffic_overview',
    {
      description: 'Website traffic totals (sessions, users, conversions, engagement) plus a daily timeseries for the period.',
      inputSchema: { date_range: RANGE.optional() },
    },
    async ({ date_range = 'LAST_30_DAYS' }) => {
      try {
        const o = await getGA4Overview(date_range as GADateRange)
        return ok({ mode: o.mode, range: o.range, totals: o.totals, timeseries: o.timeseries })
      }
      catch (e) {
        return fail(e instanceof Error ? e.message : 'GA4 request failed')
      }
    },
  )

  // ── get_acquisition_channels ──────────────────────────────
  server.registerTool(
    'get_acquisition_channels',
    {
      description: 'Traffic and conversions broken down by acquisition channel (Organic Search, Paid Search, Paid Social, Direct, Email, etc.). Pair with Google Ads spend to compute true cost-per-session and channel ROAS.',
      inputSchema: { date_range: RANGE.optional() },
    },
    async ({ date_range = 'LAST_30_DAYS' }) => {
      try {
        const o = await getGA4Overview(date_range as GADateRange)
        return ok({ mode: o.mode, range: o.range, channels: o.channels })
      }
      catch (e) {
        return fail(e instanceof Error ? e.message : 'GA4 request failed')
      }
    },
  )

  // ── get_top_landing_pages ─────────────────────────────────
  server.registerTool(
    'get_top_landing_pages',
    {
      description: 'Top landing pages by sessions, with conversion rate and bounce rate — surfaces which pages convert and which leak budget.',
      inputSchema: { date_range: RANGE.optional() },
    },
    async ({ date_range = 'LAST_30_DAYS' }) => {
      try {
        const o = await getGA4Overview(date_range as GADateRange)
        return ok({ mode: o.mode, range: o.range, landing_pages: o.topLandingPages })
      }
      catch (e) {
        return fail(e instanceof Error ? e.message : 'GA4 request failed')
      }
    },
  )

  // ── get_conversions ───────────────────────────────────────
  server.registerTool(
    'get_conversions',
    {
      description: 'Conversion (key event) counts and value — generate_lead, book_consultation, contact_form_submit, etc.',
      inputSchema: { date_range: RANGE.optional() },
    },
    async ({ date_range = 'LAST_30_DAYS' }) => {
      try {
        const o = await getGA4Overview(date_range as GADateRange)
        return ok({
          mode: o.mode,
          range: o.range,
          total_conversions: o.totals.conversions,
          total_conversion_value: o.totals.conversionValue,
          events: o.conversionEvents,
        })
      }
      catch (e) {
        return fail(e instanceof Error ? e.message : 'GA4 request failed')
      }
    },
  )

  return server
}
