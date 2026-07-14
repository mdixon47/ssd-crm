// ============================================================
// Google Ads campaigns — shared data layer
// Mirrors server/utils/googleAnalytics.ts: one entry point that
// returns live data when the integration is configured, otherwise
// scaled mock data — and always reports which mode it served, so
// AI agents and the dashboard never present mock as real.
//
// The live Google Ads Reporting integration is NOT wired up yet;
// fetchLiveCampaigns() is the single seam to add it. Until then
// getGoogleCampaigns() returns mock data with mode: 'mock'.
// ============================================================
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'
import type { Campaign, DataMode } from '~/types'

export interface CampaignsResult {
  mode: DataMode
  campaigns: Campaign[]
}

/** True once the Google Ads API creds needed for live reporting are present. */
export function isGoogleAdsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN
    && process.env.GOOGLE_ADS_CLIENT_ID
    && process.env.GOOGLE_ADS_CLIENT_SECRET
    && process.env.GOOGLE_ADS_REFRESH_TOKEN
    && process.env.GOOGLE_ADS_CUSTOMER_ID
  )
}

/** Lightweight mode check for UI badges that don't need to fetch. */
export function getCampaignsMode(): DataMode {
  return isGoogleAdsConfigured() ? 'live' : 'mock'
}

/** Public entry point — live campaigns when configured, else scaled mock. */
export async function getGoogleCampaigns(): Promise<CampaignsResult> {
  if (isGoogleAdsConfigured()) {
    try {
      return { mode: 'live', campaigns: await fetchLiveCampaigns() }
    }
    catch (err) {
      // Never let a live-fetch failure blank the dashboard/AI — fall back to
      // mock but report the true mode so the data is labelled honestly.
      console.warn('[campaigns] live Google Ads fetch failed — using mock:', err instanceof Error ? err.message : err)
    }
  }
  return { mode: 'mock', campaigns: GOOGLE_CAMPAIGNS }
}

// ── Live (Google Ads API) — extension point ─────────────────
// Not implemented. Wire the google-ads client here and set the
// GOOGLE_ADS_* env vars; every AI consumer switches to live automatically.
async function fetchLiveCampaigns(): Promise<Campaign[]> {
  throw new Error('Live Google Ads reporting is not implemented yet')
}
