# Wiring Live Data to the Agents

The two new agents (`EmailStrategistAgent`, `SocialMediaAgent`) and the existing optimizer/audit agents all currently consume a mix of real Supabase data (leads, search terms, negative keywords, email history) and mocked data (Google Ads campaigns, Facebook/Instagram/LinkedIn platform data). This document is the swap-in guide.

See also: [`README.md`](./README.md) for architecture, [`issues.md`](./issues.md) for known limitations, [`devsecops.md`](./devsecops.md) for secret handling.

---

## Current data sources by agent

| Agent | Real data | Mocked data |
|---|---|---|
| `WeeklyAuditAgent` | `leads`, `search_terms`, `negative_keywords` (Supabase) | `GOOGLE_CAMPAIGNS` (`lib/mockData.ts`) |
| `CampaignOptimizerAgent` | `leads` | `GOOGLE_CAMPAIGNS` |
| `LeadScorerAgent` | Single lead passed in | — |
| `SearchTermAgent` | `search_terms` | — |
| `EmailAgent` (per-lead drafter) | Single lead | — |
| **`EmailStrategistAgent`** (new) | `leads` | — |
| **`SocialMediaAgent`** (new) | — | `SOCIAL_PLATFORMS` (`lib/mockData.ts`) |

---

## 1. Google Ads → replace `GOOGLE_CAMPAIGNS`

`GOOGLE_CAMPAIGNS` in `lib/mockData.ts` matches the `Campaign` type in `types/index.ts`. Replace the import in the endpoints that read it.

**Endpoints touching `GOOGLE_CAMPAIGNS`:**
- `server/api/ai/weekly-audit.post.ts`
- `server/api/ai/analyze-campaigns.post.ts`

**Steps:**
1. Add `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID` to `.env` and (rotated) to Netlify + GitHub Actions secrets.
2. Add the keys to `nuxt.config.ts` under `runtimeConfig` (server-only).
3. Create `server/utils/googleAds.ts` exporting `fetchCampaigns(): Promise<Campaign[]>` using `google-ads-api` (npm) or REST + OAuth.
4. Cache results in Supabase table `campaigns` (created via migration). Add a refresh job (`server/api/cron/refresh-campaigns.post.ts`) hit on a schedule by Netlify Scheduled Functions or GitHub Actions cron.
5. In each endpoint above, replace `GOOGLE_CAMPAIGNS` with `await supabase.from('campaigns').select('*')`.

**Verification:** call `POST /api/ai/analyze-campaigns` against your dev server with the new path and confirm tool calls return real numbers (check `_totalTokens` in logs to confirm a real model run).

---

## 2. Facebook / Instagram → replace `SOCIAL_PLATFORMS.fb` and `.ig`

Meta Graph API serves both platforms from one set of credentials.

**Endpoint touching `SOCIAL_PLATFORMS`:**
- `server/api/ai/social-strategy.post.ts` (the new agent's only data source)

**Steps:**
1. Create a Meta App (https://developers.facebook.com/apps). Add **Marketing API** product. Generate a long-lived user access token via the Graph API Explorer, then exchange for a system-user token on a Business Manager account.
2. Required env vars: `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` (format `act_XXXXXXXXXX`).
3. Add to `runtimeConfig` in `nuxt.config.ts`.
4. Create `server/utils/meta.ts` exporting `fetchPlatformData(platform: 'fb'|'ig'): Promise<SocialPlatformData>`. Useful Graph endpoints:
   - Campaigns: `GET /{ad-account-id}/campaigns?fields=name,objective,status,daily_budget&insights.date_preset(last_30d){spend,impressions,actions,action_values}`
   - Posts: `GET /{page-id}/posts?fields=message,created_time,insights.metric(post_impressions,post_engaged_users)`
   - Filter `publisher_platforms` in insights breakdown to split Facebook vs Instagram.
5. Map Graph fields onto the `SocialCampaign` and `SocialPost` shapes from `types/index.ts`. Compute `cpl`, `roas` server-side.
6. In `server/api/ai/social-strategy.post.ts`, replace `SOCIAL_PLATFORMS[platformKey]` with `await fetchPlatformData(platformKey)`.

**Verification:** `POST /api/ai/social-strategy` with `{ "platform": "fb" }`; confirm `health` reflects real ROAS (>3 strong, 1.5–3 moderate, <1.5 needs_attention).

---

## 3. LinkedIn → replace `SOCIAL_PLATFORMS.li`

LinkedIn Marketing API (Ads). Separate credentials from Meta.

**Steps:**
1. Apply for **LinkedIn Marketing Developer Platform** access (https://www.linkedin.com/developers/). Allow several days for approval.
2. Create an app, request `r_ads`, `r_ads_reporting`, and `rw_ads` scopes.
3. OAuth 2.0 with `client_credentials` or 3-legged with `state` param for server-side use.
4. Required env vars: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_AD_ACCOUNT_ID` (format `urn:li:sponsoredAccount:XXXXXX`).
5. Create `server/utils/linkedin.ts` exporting `fetchLinkedInPlatformData(): Promise<SocialPlatformData>`. Useful endpoints:
   - Campaigns: `GET /v2/adAccountsV2/{account}/adCampaignsV2`
   - Analytics: `GET /v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.day=...&fields=impressions,clicks,costInUsd,externalWebsiteConversions`
6. Hook into `social-strategy.post.ts` alongside the Meta fetch.

---

## 4. Email engagement (Resend → enrich `EmailStrategistAgent`)

The strategist currently uses CRM-only signals (lead stage, `updated_at`). Once you have Resend webhooks wired, the agent can prioritize on real opens/clicks.

**Steps:**
1. In Resend dashboard, set the webhook URL to `https://<your-domain>/api/email/webhook` and select events: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`.
2. Create `server/api/email/webhook.post.ts` that verifies the `Resend-Signature` header (HMAC SHA-256 with `RESEND_WEBHOOK_SECRET`) and writes to a new Supabase table `email_events`.
3. Add a new tool to `agents/EmailStrategistAgent.ts`:
   ```ts
   { name: 'get_engagement_signals', description: 'Returns leads who recently opened or clicked but did not reply', ... }
   ```
4. Implement in `handleEmailTool` querying `email_events` for the last 14 days, grouped by `lead_id`.

---

## 5. Server-side caching pattern

All upstream APIs (Google Ads, Meta, LinkedIn) have rate limits and latency. Cache aggressively:

- Write fetched data to Supabase tables (`campaigns`, `social_campaigns`, `social_posts`) keyed by `(platform, fetched_at)`.
- Read-through cache: the endpoint reads cached data if `fetched_at` < 1 hour old, else triggers a refresh.
- For scheduled refresh: Netlify Scheduled Functions (free tier supports cron-style triggers) or GitHub Actions `schedule:` workflow that hits a protected refresh endpoint.

---

## 6. Verification checklist

After each platform is wired:

- [ ] `npm run lint && npm run build` — clean
- [ ] Endpoint returns `{ data: { tokens_used: > 0, model_used: 'claude-*' } }` (proves agent ran against real data)
- [ ] Spot-check 2–3 numbers against the platform's native dashboard
- [ ] Check Supabase logs for the cache table writes
- [ ] No secrets logged in build output or function logs (check Netlify deploy log)

---

## 7. Key safety reminders

- **Never commit live keys**. Use `.env` locally and the secrets surfaces on Netlify + GitHub Actions only.
- **Rotate immediately if leaked**. See [`devsecops.md`](./devsecops.md) for the rotation runbook.
- **All agents stay read-only**. Recommendations require human approval before being applied to live ad platforms. Do not call mutating endpoints (e.g., Google Ads `campaign:mutate`) from agent tool handlers.
