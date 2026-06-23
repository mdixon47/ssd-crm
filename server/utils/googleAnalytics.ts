// ============================================================
// Google Analytics 4 — shared data layer
// Used by BOTH the google-analytics MCP server (for AI agents)
// and the /api/analytics REST endpoint (for the dashboard).
//
// When GA4_PROPERTY_ID + service-account creds are set it reads
// live data via the GA4 Data API; otherwise returns scaled mock data.
//
// ⚠️  READ-ONLY. GA4 has no write surface here by design.
// ============================================================
import {
  MOCK_GA_CHANNELS,
  MOCK_GA_LANDING_PAGES,
  MOCK_GA_CONVERSION_EVENTS,
  MOCK_GA_BASELINE,
} from '~/lib/mockData'
import type {
  GADateRange,
  GAOverview,
  GAChannelStat,
  GALandingPage,
  GAConversionEvent,
  GATrafficPoint,
} from '~/types'

const RANGE_DAYS: Record<GADateRange, number> = {
  LAST_7_DAYS: 7,
  LAST_14_DAYS: 14,
  LAST_30_DAYS: 30,
  LAST_90_DAYS: 90,
}

export function isGA4Configured(): boolean {
  return !!(
    process.env.GA4_PROPERTY_ID
    && process.env.GA4_CLIENT_EMAIL
    && process.env.GA4_PRIVATE_KEY
  )
}

export function getGAMode(): 'live' | 'mock' {
  return isGA4Configured() ? 'live' : 'mock'
}

/** Public entry point — returns a normalized GA4 overview for the range. */
export async function getGA4Overview(range: GADateRange = 'LAST_30_DAYS'): Promise<GAOverview> {
  return isGA4Configured() ? fetchLiveOverview(range) : buildMockOverview(range)
}

// ── Mock ────────────────────────────────────────────────────
function buildMockOverview(range: GADateRange): GAOverview {
  const days = RANGE_DAYS[range]
  const factor = days / 30 // baseline mock data represents 30 days

  const scaleCount = (n: number) => Math.round(n * factor)

  const channels: GAChannelStat[] = MOCK_GA_CHANNELS.map(c => ({
    ...c,
    sessions: scaleCount(c.sessions),
    users: scaleCount(c.users),
    conversions: scaleCount(c.conversions),
  }))
  const topLandingPages: GALandingPage[] = MOCK_GA_LANDING_PAGES.map(p => ({
    ...p,
    sessions: scaleCount(p.sessions),
    conversions: scaleCount(p.conversions),
  }))
  const conversionEvents: GAConversionEvent[] = MOCK_GA_CONVERSION_EVENTS.map(e => ({
    ...e,
    count: scaleCount(e.count),
    value: Math.round(e.value * factor),
  }))

  const sessions = channels.reduce((s, c) => s + c.sessions, 0)
  const users = channels.reduce((s, c) => s + c.users, 0)
  const conversions = channels.reduce((s, c) => s + c.conversions, 0)
  const conversionValue = conversionEvents.reduce((s, e) => s + e.value, 0)

  return {
    mode: 'mock',
    range,
    totals: {
      sessions,
      users,
      newUsers: Math.round(users * MOCK_GA_BASELINE.newUsersRatio),
      conversions,
      conversionValue,
      engagementRate: MOCK_GA_BASELINE.engagementRate,
      avgSessionDuration: MOCK_GA_BASELINE.avgSessionDuration,
    },
    timeseries: buildMockTimeseries(days, sessions, users),
    channels,
    topLandingPages,
    conversionEvents,
  }
}

/** Deterministic daily series (weekday-weighted) that sums to the totals. */
function buildMockTimeseries(days: number, totalSessions: number, totalUsers: number): GATrafficPoint[] {
  const today = new Date()
  // B2B traffic dips on weekends — weight Sun..Sat.
  const dowWeight = [0.6, 1.05, 1.1, 1.1, 1.05, 1.0, 0.65]

  const dates: { date: string; w: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    dates.push({ date: d.toISOString().slice(0, 10), w: dowWeight[d.getDay()] })
  }
  const sumW = dates.reduce((s, d) => s + d.w, 0)

  return dates.map(({ date, w }) => ({
    date,
    sessions: Math.round((totalSessions * w) / sumW),
    users: Math.round((totalUsers * w) / sumW),
  }))
}

// ── Live (GA4 Data API) ─────────────────────────────────────
function gaDateRange(range: GADateRange) {
  return { startDate: `${RANGE_DAYS[range]}daysAgo`, endDate: 'today' }
}

const num = (v: string | null | undefined) => (v ? Number.parseFloat(v) : 0)

async function fetchLiveOverview(range: GADateRange): Promise<GAOverview> {
  // Dynamic import so mock-mode deployments don't load the SDK.
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data')

  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  })
  const property = `properties/${process.env.GA4_PROPERTY_ID}`
  const dateRanges = [gaDateRange(range)]

  const [totalsRes, channelRes, seriesRes, pagesRes, eventsRes] = await Promise.all([
    client.runReport({
      property,
      dateRanges,
      metrics: [
        { name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' },
        { name: 'conversions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' },
      ],
    }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    }),
    client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'conversions' }, { name: 'eventValue' }],
      orderBys: [{ metric: { metricName: 'conversions' }, desc: true }],
      limit: 8,
    }),
  ])

  const t = totalsRes[0].rows?.[0]?.metricValues ?? []

  const channels: GAChannelStat[] = (channelRes[0].rows ?? []).map(r => ({
    channel: r.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: num(r.metricValues?.[0]?.value),
    users: num(r.metricValues?.[1]?.value),
    conversions: num(r.metricValues?.[2]?.value),
    engagementRate: num(r.metricValues?.[3]?.value),
  }))

  const timeseries: GATrafficPoint[] = (seriesRes[0].rows ?? []).map((r) => {
    const raw = r.dimensionValues?.[0]?.value ?? '' // GA4 returns YYYYMMDD
    const date = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw
    return { date, sessions: num(r.metricValues?.[0]?.value), users: num(r.metricValues?.[1]?.value) }
  })

  const topLandingPages: GALandingPage[] = (pagesRes[0].rows ?? []).map((r) => {
    const sessions = num(r.metricValues?.[0]?.value)
    const conversions = num(r.metricValues?.[1]?.value)
    return {
      path: r.dimensionValues?.[0]?.value ?? '(not set)',
      sessions,
      conversions,
      conversionRate: sessions > 0 ? conversions / sessions : 0,
      bounceRate: num(r.metricValues?.[2]?.value),
    }
  })

  const conversionEvents: GAConversionEvent[] = (eventsRes[0].rows ?? [])
    .map(r => ({
      event: r.dimensionValues?.[0]?.value ?? 'unknown',
      count: num(r.metricValues?.[0]?.value),
      value: num(r.metricValues?.[1]?.value),
    }))
    .filter(e => e.count > 0)

  return {
    mode: 'live',
    range,
    totals: {
      sessions: num(t[0]?.value),
      users: num(t[1]?.value),
      newUsers: num(t[2]?.value),
      conversions: num(t[3]?.value),
      conversionValue: conversionEvents.reduce((s, e) => s + e.value, 0),
      engagementRate: num(t[4]?.value),
      avgSessionDuration: num(t[5]?.value),
    },
    timeseries,
    channels,
    topLandingPages,
    conversionEvents,
  }
}
