# Improvement Roadmap

Planned enhancements, architectural upgrades, and feature work for SSD-CRM.
Sorted by impact tier. Items move to [`update.md`](./update.md) when shipped and [`issues.md`](./issues.md) if they reveal a bug.

---

## Tier 1 — High Impact, Near-Term

### I-01. Apply pending Supabase migrations
Migrations `009_sales_calls_appointments_contracts.sql` and `010_content_items.sql` are checked in but not applied to the live project. Until applied:
- Sales Calls, Appointments, Contracts pages will fail on all writes.
- Content Hub will return errors on save and load.

**Action:** Run in Supabase SQL editor in order: `009` → `010`.

---

### I-02. Real platform publishing integrations
The Content Hub currently saves drafts to the DB and marks them "published" manually. Wire real posting APIs so clicking "Publish" actually pushes content.

| Platform | API | Auth required |
|---|---|---|
| LinkedIn | LinkedIn Marketing API (`/rest/posts`) | OAuth 2.0 app credentials |
| Facebook / Instagram | Meta Graph API (`/me/feed`, `/me/media`) | Meta Business app |
| Email | Resend (already integrated for 1:1 email) | Same `RESEND_API_KEY` |

**Suggested implementation:**
- Add `server/api/content/[id]/publish.post.ts` — reads platform from the content item, dispatches to the correct integration.
- Store `external_id` (LinkedIn post URN, FB post ID) in `content_items.performance` JSONB on success.
- Fetch engagement stats on a background cron (daily) and write back to `performance`.

**Env vars to add:** `LINKEDIN_ACCESS_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`

---

### I-03. A2A: standardise external agent authentication
The `/api/a2a/[agent]` route is protected by the global session-cookie auth middleware, which is correct for same-origin browser callers but blocks legitimate machine-to-machine agents (Zapier, Make, external Claude agents).

**Improvement:** Add a Bearer token check for the A2A endpoint. Generate a long-lived token (`NUXT_A2A_SECRET`) and skip the session check when `Authorization: Bearer <token>` is present and valid.

```typescript
// server/api/a2a/[agent].post.ts (proposed)
const authHeader = getHeader(event, 'authorization')
const a2aSecret = useRuntimeConfig().a2aSecret
if (authHeader === `Bearer ${a2aSecret}`) {
  // machine-to-machine — skip session check
}
```

---

### I-04. Content performance sync (cron)
After publishing, content performance (likes, comments, shares, clicks, leads) goes stale immediately. Add a daily cron:

1. Query `content_items` where `status = 'published'` and `published_at > 30 days ago`.
2. For each item, call the platform API to fetch current engagement stats.
3. Update `content_items.performance` JSONB.

**Implementation path:** Netlify Scheduled Functions or a Vercel cron at `/api/cron/sync-content-performance`.

---

### I-05. Lead → Content attribution
When a lead converts through a content piece (LinkedIn post, email newsletter), that attribution should flow back to the content item's `performance.leads_generated` counter.

**Improvement:** Add a `content_id` field to the `leads` table (nullable FK → `content_items`). When a lead fills out a form with a UTM `content` parameter that matches a content item's title or a short `utm_content` slug, record the attribution automatically on lead creation.

---

### I-06. CRM Operations Agent: write-back confirmation
Currently, tools like `create_lead`, `update_lead`, and `create_appointment` write to the DB silently within an agent turn. If the user asks "add Jane Smith as a lead" in a multi-turn conversation, there's no way to undo.

**Improvement:** Add an `action_confirmation` flag to the CRM agent endpoint. When set, the agent returns a `pending_action` instead of executing. The UI prompts "Create lead Jane Smith (org: ACME)? [Confirm / Cancel]" — on confirm, the client calls a dedicated execution endpoint.

---

### I-07. Scheduled content publishing
The "Schedule" flow in the Content Hub sets a `scheduled_at` datetime and status `scheduled` but nothing actually publishes it at that time.

**Implementation:**
- Netlify Scheduled Function or Vercel cron: `GET /api/cron/publish-scheduled` runs every 15 minutes.
- Queries `content_items` where `status = 'scheduled'` and `scheduled_at <= now()`.
- Calls the platform publish logic (→ I-02) for each item.
- Updates `status → 'published'`, `published_at → now()`.

---

## Tier 2 — Architectural Quality

### I-08. Migrate server reads to per-user Supabase client
All `server/api/**` handlers use `createSupabaseClient()` (service-role key, bypasses RLS). This is safe because the global auth middleware already gates every `/api/**` route, but defense-in-depth recommends using `serverSupabaseClient(event)` for read paths so the DB enforces per-row access policies.

**Plan:** Migrate `GET` handlers first (lowest risk), then `PATCH`/`DELETE`. Keep the service-role client for agents and scheduled jobs that intentionally cross user boundaries.

---

### I-09. Streaming responses for CRM Operations Agent
The CRM Operations Agent can take 5–15 seconds for multi-tool queries. The UI shows a loading spinner with no feedback.

**Improvement:** Switch `POST /api/ai/crm-agent` to SSE streaming using Nitro's `sendStream`. Push each tool result as a partial event so the UI can show "searching leads… found 12 results… drafting email…" incrementally.

**Anthropic SDK:** `client.messages.stream()` returns an `AsyncIterable` compatible with SSE.

---

### I-10. Stores for Content Hub (Pinia)
`pages/content/index.vue` fetches directly with `$fetch` on mount. As the page grows (filters, search, pagination), this will become hard to manage.

**Improvement:** Add `stores/content.ts` mirroring the pattern of `stores/leads.ts`: `fetchContent()`, `addItem()`, `updateItem()`, `deleteItem()`, computed getters for `draftCount`, `scheduledCount`.

---

### I-11. Rate limiting on AI endpoints
`/api/ai/**` and `/api/a2a/**` are uncapped. A single misbehaving client can exhaust the Anthropic API budget.

**Improvement:** Add Upstash Ratelimit middleware (`@upstash/ratelimit` + `@upstash/redis`) — 10 requests/minute per user session on AI endpoints, 30 requests/minute on CRUD endpoints.

---

### I-12. Agent observability (token usage + latency logging)
No structured logging exists for agent runs. It's impossible to know which agent calls are expensive, which are failing, or what the monthly Anthropic spend is.

**Improvement:**
- Log to Supabase `agent_runs` table: `agent`, `model`, `input_tokens`, `output_tokens`, `duration_ms`, `tool_calls[]`, `status`, `created_at`.
- Add a `/admin/usage` page showing per-day spend estimates and slowest agent calls.
- Anthropic cost estimates: Sonnet input ~$3/M tokens, output ~$15/M.

---

## Tier 3 — Feature Completions

### I-13. Input channels: web form webhook receiver
The spec calls for lead capture from web forms (website, course platform, Google Ads lead forms). Add:

- `POST /api/webhooks/lead-capture` — accepts form submissions with UTM params, GCLID, campaign data. Validates with Zod. Creates lead via the same schema as `/api/leads`.
- Signed webhook verification (`x-webhook-secret` header) so only trusted form providers can submit.

---

### I-14. Input channels: payment processor (course enrollment)
When a lead purchases Grant Writing 101, the CRM should automatically:
1. Update their stage to `Purchased Course`.
2. Set `qualified = 'yes'` and `revenue` to the transaction amount.
3. Trigger a post-purchase email sequence.

**Integration:** Stripe webhook (`payment_intent.succeeded`) or ThriveCart webhook → `POST /api/webhooks/payment`.

---

### I-15. Nurture sequences
The spec describes nurture sequences per lead segment. Currently email sending is 1:1 (EmailComposer) or batch (EmailCampaign). True nurture would be:
- A `sequences` table: name, trigger condition, steps (delay + template).
- When a lead enters a stage, the sequence engine checks if a sequence is triggered and schedules the first email.
- A cron processes due emails and sends via Resend.

---

### I-16. Telegram / Slack internal commands
The spec lists internal command channels. Add a webhook endpoint:
- `POST /api/webhooks/slack` — receives Slack slash commands (`/crm add-lead`, `/crm pipeline`, `/crm top-leads-today`).
- Routes to the CRM Operations Agent with the command text as the `message` field.
- Replies to the response_url with the agent's formatted output.

---

### I-17. Unit test coverage
Current coverage: 1 spec (`LeadExtractorAgent`, 7 cases). Recommended next additions:

| Test | Priority |
|---|---|
| `LeadInsertSchema` — happy path + each rejection branch | High |
| `CRMOperationsAgent` — mock Supabase + Anthropic, test tool dispatch | High |
| `ContentPublishingAgent` — mock tools, verify save_content called | High |
| `stores/leads.ts` — `fetchLeads` fallback paths | Medium |
| `server/api/leads/index.post.ts` — Zod rejection branches | Medium |
| `pages/index.vue` — KPI computations with zero denominators | Low |

---

### I-18. Content AI: multi-language support
SSD Consulting may serve bilingual (English/Spanish) nonprofits. Add a `language` field to the Content Creator form and pass it to the ContentPublishingAgent system prompt.

---

### I-19. Campaign → Content attribution loop
Close the marketing loop: which content pieces drove the most leads?

1. Add UTM builder to the Content Hub: auto-generates `utm_source=linkedin&utm_medium=social&utm_content=<slug>` for each published piece.
2. When leads arrive with matching UTM parameters, link them to the content item via `content_id` (→ I-05).
3. Show `leads_generated` count on the content card.

---

## Completed (reference)

| Item | Shipped |
|---|---|
| Centralised Claude model IDs (`lib/models.ts`) | 2026-06-12 |
| Zod validation on all AI endpoints | 2026-06-12 |
| Multi-user RLS migration (007) | 2026-06-12 |
| Vitest + LeadExtractorAgent test | 2026-06-12 |
| CRM Operations Agent (central orchestrator) | 2026-06-15 |
| Content Publishing Agent + A2A router | 2026-06-17 |
| Content Hub page (`/content`) | 2026-06-17 |
| All Supabase migrations applied to live project (003–010) | 2026-06-17 |
| vitest upgraded 2.1.9 → 4.1.8 | 2026-06-17 |
| @anthropic-ai/sdk upgraded 0.102.0 → 0.104.1 | 2026-06-17 |
