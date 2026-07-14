// ============================================================
// Paid social (Meta + LinkedIn) — shared data layer
// Mirrors server/utils/googleAnalytics.ts / campaigns.ts: one
// entry point that returns live data when configured, otherwise
// scaled mock data — always reporting which mode it served.
//
// The live Meta/LinkedIn Ads integrations are NOT wired up yet;
// fetchLivePlatforms() is the single seam to add them.
// ============================================================
import { SOCIAL_PLATFORMS } from '~/lib/mockData'
import type { SocialPlatformData, DataMode } from '~/types'

export type SocialPlatformKey = 'fb' | 'ig' | 'li'

export interface SocialPlatformsResult {
  mode: DataMode
  platforms: Record<string, SocialPlatformData>
}

export interface SocialPlatformResult {
  mode: DataMode
  platform: SocialPlatformData | undefined
}

/** True once the Meta/LinkedIn Ads creds needed for live reporting are present. */
export function isSocialConfigured(): boolean {
  return !!(
    (process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_ACCOUNT_ID)
    || (process.env.LINKEDIN_ADS_ACCESS_TOKEN && process.env.LINKEDIN_ADS_ACCOUNT_ID)
  )
}

/** Lightweight mode check for UI badges that don't need to fetch. */
export function getSocialMode(): DataMode {
  return isSocialConfigured() ? 'live' : 'mock'
}

/** Public entry point — all platforms keyed by fb / ig / li. */
export async function getSocialPlatforms(): Promise<SocialPlatformsResult> {
  if (isSocialConfigured()) {
    try {
      return { mode: 'live', platforms: await fetchLivePlatforms() }
    }
    catch (err) {
      console.warn('[social] live paid-social fetch failed — using mock:', err instanceof Error ? err.message : err)
    }
  }
  return { mode: 'mock', platforms: SOCIAL_PLATFORMS }
}

/** One platform by key, with the mode that produced it. */
export async function getSocialPlatform(key: SocialPlatformKey): Promise<SocialPlatformResult> {
  const { mode, platforms } = await getSocialPlatforms()
  return { mode, platform: platforms[key] }
}

// ── Live (Meta / LinkedIn Ads API) — extension point ────────
// Not implemented. Wire the Meta + LinkedIn clients here and set the
// META_ADS_* / LINKEDIN_ADS_* env vars.
async function fetchLivePlatforms(): Promise<Record<string, SocialPlatformData>> {
  throw new Error('Live paid-social reporting is not implemented yet')
}
