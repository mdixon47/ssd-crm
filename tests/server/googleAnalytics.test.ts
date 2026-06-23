// Unit coverage for the GA4 data layer in MOCK mode (no GA4 env vars set).
// Verifies the normalized shape, totals consistency, and range scaling.
import { describe, it, expect } from 'vitest'
import { getGA4Overview, getGAMode, isGA4Configured } from '~/server/utils/googleAnalytics'

describe('googleAnalytics (mock mode)', () => {
  it('reports mock mode when GA4 env vars are absent', () => {
    expect(isGA4Configured()).toBe(false)
    expect(getGAMode()).toBe('mock')
  })

  it('returns a normalized overview with totals summed from channels', async () => {
    const o = await getGA4Overview('LAST_30_DAYS')
    expect(o.mode).toBe('mock')
    expect(o.range).toBe('LAST_30_DAYS')

    const channelSessions = o.channels.reduce((s, c) => s + c.sessions, 0)
    expect(o.totals.sessions).toBe(channelSessions)
    expect(o.totals.conversions).toBe(o.channels.reduce((s, c) => s + c.conversions, 0))
    expect(o.channels.length).toBeGreaterThan(0)
    expect(o.topLandingPages.length).toBeGreaterThan(0)
    expect(o.conversionEvents.length).toBeGreaterThan(0)
  })

  it('builds a daily timeseries of the right length that sums to total sessions', async () => {
    const o = await getGA4Overview('LAST_7_DAYS')
    expect(o.timeseries).toHaveLength(7)
    const seriesSum = o.timeseries.reduce((s, p) => s + p.sessions, 0)
    // Rounding per-day can drift by at most ~1 per day from the total.
    expect(Math.abs(seriesSum - o.totals.sessions)).toBeLessThanOrEqual(o.timeseries.length)
  })

  it('scales volume metrics with the range', async () => {
    const wk = await getGA4Overview('LAST_7_DAYS')
    const mo = await getGA4Overview('LAST_30_DAYS')
    expect(wk.totals.sessions).toBeLessThan(mo.totals.sessions)
    // rates are window-independent
    expect(wk.totals.engagementRate).toBe(mo.totals.engagementRate)
  })
})
