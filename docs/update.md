# Updates

Chronological log of project-level changes. Newest first.
See [`README.md`](./README.md) for the architecture overview, [`issues.md`](./issues.md) for outstanding problems, and [`improvement.md`](./improvement.md) for the feature roadmap.

---

## 2026-06-23 (Google Analytics 4 integration + content-create 504 fix + security)

### Google Analytics 4 — live website analytics connected (`feat c357dfa`)

Pulls GA4 traffic/acquisition/conversion data into the CRM, slotting into the existing per-source MCP pattern.

- **MCP server** `server/mcp/google-analytics/` (tools: `get_traffic_overview`, `get_acquisition_channels`, `get_top_landing_pages`, `get_conversions`), registered in the MCP gateway.
- **Shared data layer** `server/utils/googleAnalytics.ts` — reads the live GA4 Data API (`@google-analytics/data`) when `GA4_PROPERTY_ID` + service-account creds are set, else scaled mock data. Used by both the MCP server **and** the REST endpoint (DRY).
- **Surfaces:** `GET /api/analytics?range=…`, new `pages/analytics/index.vue` dashboard (+ nav link), a GA channel panel merged into the Campaigns view, and a `get_website_analytics` tool fed to `WeeklyAuditAgent`.
- Types, mock dataset (`lib/mockData.ts`), `useMCP` accessors, and unit tests added.
- **Live-verified** against property `367191792` (real sessions/channels/landing pages returned). Required setup: enabled the *Google Analytics Data API* in GCP project `ssdoauthproject` (via gcloud), added the service-account email as a GA4 **property Viewer**, and set `GA4_*` env vars locally + on **Netlify** (`GA4_PRIVATE_KEY` + `GA4_CLIENT_EMAIL` marked secret). Note: live `conversions: 0` until key events are configured — see issues.md #25.

### content-create 504 eliminated (`fix a698a48`)

`ContentPublishingAgent` ran an up-to-5-iteration **serial** tool loop; `platform: "all"` generated 4 pieces sequentially → exceeded the 26s Netlify function limit → 504. Rewritten to prefetch CRM context server-side (no model round-trips) and generate each platform's piece as a single forced-tool Sonnet call, run **in parallel** (`Promise.allSettled`). Wall-clock ≈ one model call instead of the sum; per-platform failures tolerated. Function signature + return contract (`savedIds`, `strategy_notes`) unchanged, so the UI, A2A endpoint, and `CRMOperationsAgent` are unaffected. 3 new tests.

### Security — scrub live key from `.env.example` (`chore a5f5380`)

A live `ANTHROPIC_API_KEY` had been pasted into the working-tree `.env.example` (never committed). Scrubbed to a placeholder and the key rotated; added `GA4_*` documentation to the example file. See issues.md #1.

---

## 2026-06-22 (Remotion marketing video pipeline + dependency updates + CI)

### Remotion video marketing pipeline (`feat 1bd5cc4`)

Self-contained React/Remotion project under `marketing/video/` (own deps + tsconfig; does **not** touch the Nuxt app — colocated only). Renders the SSD Consulting hero ad in three aspect ratios (16:9 / 9:16 / 1:1), a hook A/B variant pack, and a 6s retargeting bumper; brand-locked to the Nuxt theme. Plus `marketing/video-marketing-strategy.md` and how-to / AI-keys docs. A high-effort code review applied 10 fixes (v5-safe parameterized font loading, clamped `Scene` fades, shared `CtaButton`, unique SVG pattern ids, centralized `FPS`/`sec`, off-placeholder thumbnail frame) — see issues.md #19.

### CI — exclude `marketing/` from the Nuxt toolchain (`fix 7a576f7`)

Root `eslint .` and `nuxt typecheck` (vue-tsc) were sweeping the React project (whose deps aren't installed at root) → Lint + Typecheck failures. Added `marketing` to the ESLint `ignores` and `typescript.tsConfig.exclude: ['../marketing']` in `nuxt.config.ts`. The Remotion project keeps its own `tsc --noEmit`.

### Dependency updates (Dependabot #18 / #19 / #20 merged)

`actions/checkout` 6→7, `@anthropic-ai/sdk` 0.104→0.105 (ai-stack group), `@types/node` 24→26 — then **pinned `@types/node` back to `^24`** to match `engines: node >=22 <25`, with a Dependabot ignore for its major bumps (`fix 219e26a`).

---

## 2026-06-17 (Migrations applied + CI fixed + dependencies updated)

### Supabase migrations — all pending migrations applied to live project (003–010)

Applied via Supabase Management API (`/v1/projects/{ref}/database/query`). Tables now live:

| Migration | What it adds |
|---|---|
| 003 | RLS enabled on `leads`, `search_terms`, `negative_keywords`, `audit_sessions`, `email_messages` |
| 004 | `assignee` text column + index on `leads` |
| 005 | `admin_users` table with superadmin seed for malik.dixon47@gmail.com |
| 006 | `profiles` table + auto-create trigger on auth user signup |
| 007 | `created_by` column on all 5 core tables; granular SELECT/INSERT/UPDATE/DELETE policies |
| 008 | `email_campaigns` + `email_campaign_recipients` tables |
| 009 | `sales_calls`, `appointments`, `contracts` tables + indexes |
| 010 | `content_items` table + `set_updated_at` trigger + RLS |

Post-apply: added 4 RLS policies each for `sales_calls`, `appointments`, `contracts`, `email_campaign_recipients` (migration 009 created tables but omitted policies). All 13 public tables now have RLS enabled with correct policies.

### GitHub Actions CI — all lint and typecheck errors resolved

23 `@typescript-eslint/no-explicit-any` errors fixed across Sales Calls, Appointments, Contracts pages and LeadModal. `vue/no-multiple-template-root` fixed in Campaigns page. TypeScript errors fixed in EmailCampaignModal, content page, and score-lead endpoint. See issues.md #24.

### Dependency updates (Dependabot PRs #11, #17 merged)

- `vitest` 2.1.9 → 4.1.8 (major upgrade; test suite passes)
- `@anthropic-ai/sdk` 0.102.0 → 0.104.1 (adds claude-fable-5/mythos-5 support, Managed Agents, client-side fallbacks middleware)

---

## 2026-06-17 (Content Publishing System MVP + A2A agent protocol)

Full content publishing and distribution system with an agent-to-agent (A2A) communication layer.

### Content Publishing Agent (`agents/ContentPublishingAgent.ts`)

Claude Sonnet + tool_use loop (max 5 iterations). Creates platform-native content for LinkedIn, Facebook, Instagram, and Email. Three tools:

| Tool | Purpose |
|---|---|
| `get_crm_context` | Reads live lead volume, source breakdown, and recent pipeline data to personalise content angles |
| `get_content_calendar` | Checks recently published/scheduled content to avoid topic repetition |
| `save_content` | Persists the finished content draft to `content_items` table |

Platform-specific style guidelines are injected into the system prompt for each target. Content is saved as a draft — never auto-posted.

### A2A Router (`server/api/a2a/[agent].post.ts`)

`POST /api/a2a/{agent}` with body `{ task, payload, from?, context? }`.

| Agent | Tasks |
|---|---|
| `content-publisher` | `create_content` → calls ContentPublishingAgent |
| `crm-operations` | `get_lead_context`, `get_campaign_context` → read-only CRM queries |

**Internal vs external A2A:** Within the server, agents call each other's exported functions directly (no HTTP round-trip). The HTTP `/api/a2a/` endpoint serves external callers — webhooks, third-party agents, Zapier, etc. See `improvement.md` I-03 for planned A2A authentication hardening.

### CRM Operations Agent — `create_content` tool

`agents/CRMOperationsAgent.ts` gains an eighth tool: `create_content`. When a user asks "Create a LinkedIn post for Grant Writing 101", the CRM agent calls the ContentPublishingAgent directly (internal A2A), which generates the content with live CRM context and saves a draft to the Content Hub.

### Content Hub (`pages/content/index.vue`)

New page at `/content` (added to sidebar). Features:

- Filter grid by status (draft / scheduled / published / archived) and platform
- Content cards: platform icon, body preview, offer/tone badges, relative date
- Performance stats on published items (likes, comments, shares, clicks, leads)
- **Mark Published** / **Schedule** (datetime picker inline) / **Delete** actions
- **Edit modal**: full body editor + schedule datetime field
- **AI Creator modal**: topic + platform + offer + tone → calls `/api/ai/content-create` → ContentPublishingAgent generates and saves drafts

### Content CRUD API

| Endpoint | Purpose |
|---|---|
| `GET /api/content` | List with optional `status`, `platform`, `offer` filters |
| `POST /api/content` | Create manually with Zod validation |
| `PATCH /api/content/[id]` | Update fields; auto-sets `published_at` on status → published |
| `DELETE /api/content/[id]` | Delete |
| `POST /api/ai/content-create` | AI creation via ContentPublishingAgent |

### DB migration (`supabase/migrations/010_content_items.sql`)

New `content_items` table: `id`, `title`, `body`, `content_type`, `platform`, `status`, `scheduled_at`, `published_at`, `topic`, `offer`, `tone`, `tags[]`, `performance JSONB`, `created_by`. RLS: team SELECT + UPDATE, owner INSERT + DELETE. **Not yet applied to live project** — run after 009 in the Supabase SQL editor.

### Bug fix: AIPanel workflow buttons redundant API calls

The four workflow buttons (Weekly Audit, Analyze Campaigns, Plan Outreach, Social Strategy) were passing their formatted result strings through `crmChat`, which sent them to the CRM Operations Agent as new commands — causing a wasted API call and potential misinterpretation. Fixed with a new `pushAssistantMessage()` helper in `useAI.ts` that adds messages directly to the conversation state. Also added `create_content` (`✍️`) to the AIPanel tool label map.

### New types

`types/index.ts` additions: `ContentItem`, `ContentPerformance`, `ContentItemInsert`, `ContentType`, `ContentPlatform`, `ContentStatus`, `ContentOffer`, `ContentTone`, `GeneratedContent`, `ContentPublishResult`, `A2AMessage`, `A2AResponse`, `A2AAgentId`.

---

## 2026-06-15 (CRM Operations Agent — central AI orchestrator)

### CRM Operations Agent (`agents/CRMOperationsAgent.ts`)

Claude Sonnet + native tool_use agentic loop (max 8 iterations). Replaces the general-purpose `chat.post.ts` as the primary conversational AI for the panel. Understands free-form CRM commands and executes them against real data.

Seven tools:

| Tool | Action |
|---|---|
| `search_leads` | Filter by stage, source, campaign, date range, or keyword in interest/notes/org |
| `get_lead_detail` | Full lead record + email history |
| `create_lead` | Add lead with full UTM attribution (source, campaign, keyword, landing page) |
| `update_lead` | Append notes (timestamped), update stage, reassign |
| `draft_email` | AI-draft via EmailAgent — returned for human review, never auto-sent |
| `get_campaign_performance` | CRM + ad platform campaign data |
| `create_appointment` | Schedule a follow-up appointment or task |

Example commands handled:
- "Add Jane Smith from ACME Nonprofit as a grant writing lead" → `create_lead`
- "Show me leads from LinkedIn this week" → `search_leads` with `source=linkedin`, `since_date`
- "Find everyone qualified but not yet sent a proposal" → `search_leads` with `stage=Qualified`
- "Draft a follow-up email for lead [id]" → `draft_email`
- "Which campaign generated the most qualified leads?" → `get_campaign_performance`
- "Schedule a proposal review with John for June 20" → `create_appointment`

### API endpoint (`server/api/ai/crm-agent.post.ts`)

`POST /api/ai/crm-agent { message, history? }` → `{ data: { reply, actions[] } }`. History capped at 12 turns. Zod-validated.

### `composables/useAI.ts`

New `crmChat(message)` function — manages conversation state (user message + assistant reply + error handling), calls `/api/ai/crm-agent`, returns `CRMAgentResponse | null`.

### `components/ai/AIPanel.vue`

- Header updated to "CRM Operations Agent / Powered by Claude Sonnet"
- Chat now routes through `crmChat` instead of the generic `chat` endpoint
- Quick actions replaced with CRM-specific commands (LinkedIn leads, qualified pipeline, campaign ranking, social post generation)
- Action log rendered below each assistant response showing which tools were invoked (with emoji labels)

### New types

`types/index.ts` additions: `crm_operations` AgentType, `CRMActionLog`, `CRMAgentResponse`.

---

## 2026-06-12 (Production hardening: MCP transport, model registry, typecheck, Zod, multi-user RLS)

Five issues resolved in one session (`issues.md` #3, #7, #8, #9, and #2 updated).

### 1. MCP HTTP adapter → `WebStandardStreamableHTTPServerTransport` (`issues.md #3`)

`server/api/mcp/[server].post.ts` previously read the MCP SDK's private `_registeredTools` map behind a `@ts-expect-error`, bypassing the actual MCP protocol entirely. Replaced with:

- `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`
- Stateless mode (`sessionIdGenerator: undefined`) — each request is independent, no session state needed
- `enableJsonResponse: true` — returns a plain JSON response instead of an SSE stream, matching the existing client contract
- `toWebRequest(event)` bridges h3 → Web Standard `Request`; the transport returns a Web Standard `Response` which Nitro handles natively

Clients must now send proper MCP JSON-RPC messages (`{ jsonrpc: "2.0", method: "tools/call", params: { name, arguments }, id }`). The old simplified `{ tool, arguments }` format is no longer accepted.

### 2. Centralised Claude model IDs (`issues.md #7`)

New file: `lib/models.ts`

```ts
export const CLAUDE_HAIKU  = 'claude-haiku-4-5-20251001'
export const CLAUDE_SONNET = 'claude-sonnet-4-6'
export const CLAUDE_OPUS   = 'claude-opus-4-6'
```

All 8 agent files and `server/api/ai/chat.post.ts` now import from `~/lib/models` instead of repeating string literals. Future model upgrades require a single edit.

Files updated: `agents/EmailAgent.ts`, `agents/LeadScorerAgent.ts`, `agents/LeadExtractorAgent.ts`, `agents/CampaignOptimizerAgent.ts`, `agents/EmailStrategistAgent.ts`, `agents/SocialMediaAgent.ts`, `agents/SearchTermAgent.ts`, `agents/WeeklyAuditAgent.ts`, `server/api/ai/chat.post.ts`.

### 3. TypeScript typeCheck enabled (`issues.md #8`)

`nuxt.config.ts`: `typeCheck: false` → `typeCheck: true`. The CI `typecheck` job (`npm run typecheck`) was already blocking on every push/PR — no workflow change required. Nuxt will now fail `nuxt build` on type errors in dev too.

### 4. Zod validation coverage (`issues.md #9`)

Three endpoints that were doing ad-hoc body checks now have proper Zod schemas:

| Endpoint | Schema summary |
|---|---|
| `POST /api/ai/chat` | `message: string (1–4000 chars)`, `history?: { role, content }[]` (max 20) |
| `POST /api/ai/label-terms` | `terms?: SearchTerm[]` (max 500), `auto_apply?: boolean` |
| `POST /api/ai/score-lead` | `lead: { fname?, lname?, email?, org?, … }` — full lead shape |

All remaining POST endpoints already had Zod (`/api/leads`, `/api/leads/extract`, `/api/email/*`, `/api/ai/email-strategy`, `/api/ai/social-strategy`) or accept no body (`/api/ai/analyze-campaigns`, `/api/ai/weekly-audit`).

### 5. Multi-user RLS migration (`issues.md #2` updated)

New file: `supabase/migrations/007_rls_multi_user.sql`

Replaces the blanket `authenticated_all` policies on all five core tables with four operation-specific policies per table:

| Operation | Policy |
|---|---|
| SELECT | Any authenticated user (shared-team CRM) |
| INSERT | `created_by = auth.uid()` (enforced by `WITH CHECK`) |
| UPDATE | Any authenticated user (team CRM — anyone can edit records) |
| DELETE | Row owner (`created_by = auth.uid()`) or any `admin_users` member |

Also adds `created_by uuid references auth.users(id) default auth.uid()` to `leads`, `search_terms`, `negative_keywords`, `audit_sessions`, and `email_messages`, plus covering indexes on each.

**Not yet applied** — run after 003–006 in the Supabase dashboard SQL editor or via `supabase db push`. Service-role paths remain unaffected.

---

## 2026-06-12 (Test infra: vitest + LeadExtractorAgent spec)

Bootstrapped the project's first unit-test setup.

- Added `vitest` (^2) as a devDependency. Config (`vitest.config.ts`) is minimal: Node environment, `tests/**/*.test.ts` glob, and a `~` → repo-root alias so test files can import via the same path as Nuxt source.
- New scripts: `npm test` (CI mode) and `npm run test:watch`.
- First spec: `tests/agents/LeadExtractorAgent.test.ts` — 7 cases covering happy-path JSON, ```json fence stripping, unparseable fallback, `sourceHint` defaulting, empty-string-to-undefined coercion, 12k-char input truncation, and warning passthrough. The Anthropic client is stubbed with `vi.fn()` — no network, no key needed.
- Out of scope: Nuxt-aware tests (auto-imports, Vue SFC compilation). Those need `@nuxt/test-utils` and a much heavier runtime; deferred until there's a Vue component worth covering with one.
- CI: new `Test` job added to `.github/workflows/ci.yml`, parallel to `Lint` and `Typecheck`. `Build` now gates on all three. Runs `npm test` on every push and PR to `main`.

---

## 2026-06-12 (Lead intake: assignment, Bark source, AI email extractor)

Four-in-one lead-intake pass:

1. **New Lead** — confirmed already complete (`pages/leads/add.vue`, `stores/leads.ts → addLead()`, `POST /api/leads`). No changes needed.
2. **Lead assignment (A2 model)** — new free-text `assignee` column. UI is an `<input list>` backed by a `<datalist>` of distinct existing values, so the field self-bootstraps as the team uses it. No identity coupling (no FK to `auth.users`) — keeps the closed single-role model intact and upgrades cleanly later.
3. **Bark leads** — `'bark'` added to `LeadSource` union, Zod insert schema, and the Traffic Source select on `pages/leads/add.vue`. The `source` column in Postgres is unconstrained text, so no DB enum change was needed.
4. **Email leads scraping (B1+C1 collapsed)** — single "Import from email" tool covers Bark notifications, contact-form forwards, and manual referrals. Paste raw email → AI extracts fields → fills the existing add-lead form → human reviews → save via the existing validated path. No new infra (no inbound webhook / IMAP / cron).

New files:

- `agents/LeadExtractorAgent.ts` — Claude Haiku extractor. Returns `{ fname, lname, email, phone, org, title, interest, source, notes, warnings[] }`. Source is auto-inferred (bark / organic / email) when unhinted.
- `server/api/leads/extract.post.ts` — `POST /api/leads/extract { rawText, sourceHint? }`. Validated with Zod (20–20 000 chars). Protected by the global `/api/**` auth middleware.
- `supabase/migrations/004_lead_assignee.sql` — `alter table leads add column if not exists assignee text` + index. Idempotent.

Modified:

- `types/index.ts` — `LeadSource` gains `'bark'`; `Lead` gains optional `assignee`.
- `server/api/leads/index.post.ts` — Zod schema accepts `'bark'` source and optional `assignee`.
- `server/api/leads/[id].patch.ts` — `allowedFields` extended with `assignee`.
- `stores/leads.ts` — new `distinctAssignees` computed feeding the UI datalist.
- `pages/leads/add.vue` — collapsible "Import from email" block at top; Bark option in source select; assignee input with datalist; `fetchLeads()` on mount so the datalist is populated.
- `components/leads/LeadModal.vue` — assignee input on the Details tab, saved through the existing PATCH path.

Behaviour notes:

- Extractor never overwrites manually-filled fields. The user can paste an email, then edit individual fields before pasting another, and the second extraction will only fill blanks.
- The Bark email format is not parsed deterministically — extraction quality depends on the model. `warnings[]` is surfaced inline so the human knows which fields to double-check.

Verification: `npm run lint` clean, `npx vue-tsc --noEmit` 0 errors, `npm run build` succeeds. No live API smoke-test of `/api/leads/extract` (would require a real Anthropic key + session cookie); type-clean only.

Migrations status: `003_enable_rls.sql` and `004_lead_assignee.sql` are checked in but **not applied** to the live project. Apply both in numeric order before exercising the assignee UI in production. See `issues.md #2`.

---

## 2026-06-10 (Authentication: login page + page/API guards + RLS migration)

First-pass auth lands on top of the `@nuxtjs/supabase` v2 module that shipped on 2026-06-08. Email + password via Supabase Auth, closed sign-up (admin creates users in the Supabase dashboard), single role.

New files:

- `pages/login.vue` — slate/cyan-themed sign-in form. Honours a `?redirect=` query param.
- `composables/useAuth.ts` — `signInWithPassword(email, password, redirect?)` + `signOut()` wrappers around `useSupabaseClient`.
- `middleware/auth.global.ts` — page middleware. Redirects unauthenticated visitors to `/login` (preserving target path) and bounces authenticated users away from `/login`.
- `server/utils/requireUser.ts` — throws `401` if `serverSupabaseUser(event)` returns null.
- `server/middleware/auth.ts` — applies `requireUser` to every `/api/**` request. Bypasses `/api/_supabase/*` (used by the Supabase module's own cookie sync).
- `supabase/migrations/003_enable_rls.sql` — turns RLS on for `leads`, `search_terms`, `negative_keywords`, `audit_sessions`, `email_messages` and grants `authenticated` role full CRUD via one permissive policy per table. Idempotent.

Modified:

- `layouts/default.vue` — sidebar bottom now shows the signed-in user's email and a "Sign out" button.

Smoke test (local, against the dev `.env` Supabase project, no DB writes):

| Probe | Expected | Got |
|---|---|---|
| `GET /api/leads` (no cookie) | 401 | ✅ 401 |
| `GET /login` | 200 HTML | ✅ 200 |
| `GET /` (protected page) | 302 → `/login` | ✅ 302 |
| `POST /api/mcp/crm` (no cookie) | 401 | ✅ 401 |
| `POST /api/ai/score-lead` (no cookie) | 401 | ✅ 401 |

What this does NOT do (tracked separately):

- The RLS migration is **checked in but not applied**. `issues.md #2` covers application via Supabase dashboard SQL editor or `supabase db push`.
- `server/utils/supabase.ts` still returns a service-role client; reads will continue to bypass RLS until a follow-up migrates them to `serverSupabaseClient(event)`. This is documented under `issues.md #2`.
- No public sign-up, password reset, or OAuth providers. Users are created in the Supabase dashboard.
- No role/permission model — any authenticated user gets full app access.
- No live login flow test (would require a created user + interactive browser). Server-side gate verified by curl; client-side flow (form → cookie → app) still needs human verification.

Verification: `npm run lint` clean, `npx vue-tsc --noEmit` 0 errors, `npm run build` succeeds, 5/5 curl probes above.

---

## 2026-06-08 (Runtime-deps bundle: Anthropic SDK + Nuxt Supabase module)

Lands the two deferred runtime majors as one atomic bump after a clean pre-flight on `test/runtime-upgrades-eval`:

| Package | From | To | PR superseded |
|---|---|---|---|
| `@anthropic-ai/sdk` | 0.39.0 | 0.102.0 | #11 |
| `@nuxtjs/supabase` | 1.6.2 | 2.0.9 | #12 |

Verification (zero source changes required):

- `npm run lint` clean
- `npx vue-tsc --noEmit` → 0 errors
- `npm run build` → Nitro/Vercel preset succeeds

Why the surface was narrower than initially flagged:

- **Anthropic**: all 7 agents use only `client.messages.create`, `Anthropic.Tool[]`, `Anthropic.MessageParam[]`, and `Anthropic.ToolResultBlockParam[]`. These have been stable since 0.30.x; the 0.40–0.102 changes (managed agents, middleware, beta features) are additive.
- **`@nuxtjs/supabase`**: `useSupabaseUser`/`useSupabaseClient`/auth-middleware calls — exactly what v2 redesigned — are not used anywhere. The module is registered in `nuxt.config.ts` only; DB access goes through `server/utils/supabase.ts` via `@supabase/supabase-js` with the service-role key.

Runtime smoke-test debt tracked in `issues.md #19` (not yet exercised against a live Anthropic key or a booted dev server). Revert is a single commit if either surface regresses in practice.

---

## 2026-06-08 (Dev-tooling majors bundle landed — `issues.md #18` resolved)

With the type baseline clean and CI typecheck blocking, the deferred dev-tooling majors were verified together (`lint`, `vue-tsc --noEmit`, `npm run build` all green with **zero source changes**) and landed as one atomic bump.

Versions:

| Package | From | To |
|---|---|---|
| `typescript` | 5.8.2 | 6.0.3 |
| `vue-tsc` | 2.2.12 | 3.3.3 |
| `@pinia/nuxt` | 0.10.1 | 0.11.3 |
| `eslint` | 9.39.4 | 10.4.1 |
| `@nuxt/eslint` | 0.7.4 | 1.15.2 |
| `@nuxt/eslint-config` | 0.7.6 | 1.15.2 |
| `@types/node` | 22.13.10 | 24.x |

`@types/node` capped at 24 to honour `engines.node: ">=22.0.0 <25"`. The group is intentionally atomic — TS 6 needs vue-tsc 3, and eslint 10 needs `@nuxt/eslint@1.15+` which relaxes the peer-dep range. Dependabot PRs `#9`, `#10`, `#13`, `#14`, `#15`, `#16` superseded.

`issues.md #18` removed. `#17` (zod v4) updated with the concrete migration steps now that the path is clear.

---

## 2026-06-08 (CI typecheck is now blocking)

Now that `npm run typecheck` reports 0 errors (see the entry below), the `.github/workflows/ci.yml` `typecheck` job:

- Drops `continue-on-error: true`
- Drops its "(non-blocking)" name suffix
- Is now in `build.needs: [lint, typecheck]` so any future regression on a PR fails the build job and blocks merge

Future TS regressions will surface immediately rather than accumulate as another backlog.

---

## 2026-06-08 (TypeScript error backlog cleared — `issues.md #5`)

`npm run typecheck` now reports **0 errors** (down from 56). Four-part fix:

1. **MCP SDK `tool()` → `registerTool()` migration** across `server/mcp/{crm,google-ads,linkedin-ads,meta-ads}/index.ts`. The deprecated `tool()` overload's ambiguous resolution between `ToolAnnotations` and `ZodRawShapeCompat` was the source of `TS2589` "excessively deep" errors. `registerTool` uses an explicit config object and avoids the bad inference path.
2. **`zod` duplicate dedupe.** `@modelcontextprotocol/sdk@1.29.0` was pulling its own nested `zod@4.4.3` through `zod-to-json-schema` while the project pins `zod@^3.24.2`. The type identity mismatch between the two zod copies produced the `Type 'ZodOptional<ZodNumber>' is not assignable to type 'AnySchema'` errors. `npm dedupe` collapsed both to a single `zod@3.25.76`; `package.json` now declares `"overrides": { "zod": "$zod" }` so fresh `npm install` runs (CI, Netlify) deterministically resolve a single copy.
3. **Type Drift in `types/index.ts`.** UI-only fields (`match_type`, `reason`, `status` on `NegativeKeyword`; `tier`, `recommended_next_step`, `estimated_deal_value` on `LeadScore`; `reach`, `leads`, `engagement` on `SocialPost`) and DB-only fields (`platform`, `week_date` on `SearchTerm`) are now declared as optional supersets so UI components and Supabase queries can coexist.
4. **Narrow per-file fixes.** `CampaignOptimizerAgent.finalOutput` initialised to a default-shaped object instead of `null`; `pages/leads/add.vue` casts `qualified`/`source` to enum types; `server/api/email/draft.post.ts` casts to `Partial<Lead>`; `?? 0` / `?? ''` guards in `pages/campaigns/index.vue`, `pages/social/index.vue`, and `agents/SocialMediaAgent.ts`.

`vue-tsc --noEmit` and `nuxt typecheck` both clean. `npm run lint` clean. Unblocks future zod v4 and TypeScript 6 upgrades (`issues.md #17`, `#18`).

**Follow-up**: drop `continue-on-error: true` from the `typecheck` job in `.github/workflows/ci.yml` and re-add `typecheck` to `build.needs` so future regressions block merges.

---

## 2026-06-08 (Remove duplicate starter workflows)

Two GitHub web-UI starter workflows (`main.yml` and `codeql.yml`) had been added via the Actions/Code-security setup wizards. Both duplicated jobs that already exist in `ci.yml` and `security.yml`, and each carried regressions that would block CI:

- `main.yml` used `npm ci` (requires `package-lock.json`, which is intentionally untracked per `issues.md #14b`), ran a blocking `typecheck` (`issues.md #5` would fail it on every PR), ran `npm audit --production` at the default level (fails on any `low` advisory), and triggered on a non-existent `develop` branch.
- `codeql.yml` lacked `continue-on-error`, so it would block PRs until Code Scanning is enabled in repo settings — the same prerequisite the existing `security.yml` codeql job handles non-blockingly. It also added a redundant weekly cron and an extra `actions` language matrix entry.

Both files removed. Existing `ci.yml` + `security.yml` cover lint, typecheck, build, CodeQL, gitleaks, and npm audit with the agreed blocking/non-blocking profile.

---

## 2026-06-08 (Dependabot triage)

### Open PRs triaged

| PR | Action | Reason |
|---|---|---|
| #1 `github/codeql-action 3→4` | Merge (`@dependabot merge`) | Action-only bump, CodeQL job is already non-blocking, v4 is the active maintenance line. |
| #6 `zod 3→4` | Closed + ignored major | v4 rewrite needs clean type-baseline (blocked by `issues.md #5`). Tracked as `issues.md #17`. |
| #8 `dev-tooling group` (4 majors) | Closed (no permanent ignore) | Each major has independent blockers (engines range, vue-tsc compat, peer-dep coordination). Tracked as `issues.md #18`. |

### Dependabot config: restrict `dev-tooling` group to minor + patch

`.github/dependabot.yml`'s `dev-tooling` group (typescript, @types/*, eslint, eslint-*, @nuxt/eslint) now uses `update-types: [minor, patch]`. Majors will arrive as individual ungrouped PRs so each can be evaluated for breaking changes one at a time, with isolated bisection if anything regresses.

---

## 2026-06-08 (CI pruning + Supabase schema deploy)

### Removed `dependency-review` job from Security workflow

`actions/dependency-review-action@v5` was removed from `.github/workflows/security.yml`. It required GitHub Advanced Security on private repos (paid feature), ran only on PR diffs, and its CVE coverage was fully covered by the existing `npm audit` job (which runs on every push, PR, and weekly cron). Net result: one less always-skipped check on every PR with zero loss of coverage. See `issues.md #14c` for the rationale.

### Supabase schema deployed for the first time

Migrations `001_initial.sql` (leads, search_terms, negative_keywords, audit_sessions + seeds) and `002_email_messages.sql` were applied to the live project via the Supabase Management API. Two reusable maintenance scripts were added:
- `scripts/check-schema.mjs` — verifies expected tables exist + reports row counts (fixed false-positive bug where `head: true` count masked missing tables).
- `scripts/apply-migrations.mjs` — applies SQL migrations programmatically via the Management API.

Post-deploy verification: `leads: 8, negative_keywords: 24, search_terms/audit_sessions/email_messages: 0`.

`eslint.config.mjs` gained a `scripts/**` override allowing `console.log` (CLI utilities legitimately print to stdout).

---

## 2026-06-08 (Email + Social Strategist agents)

### Two new strategic agents

Added `EmailStrategistAgent` (batch outreach planner) and `SocialMediaAgent` (platform-level performance analyst). Both follow the existing agentic-loop pattern (Opus for reasoning, Sonnet for JSON finalization, read-only tools, max-iteration guard).

**New files:**
- `agents/EmailStrategistAgent.ts` — picks priority leads (dormant / proposal follow-ups / stage nudges) and drafts subject + body per lead. 4 tools, MAX_ITERATIONS=10.
- `agents/SocialMediaAgent.ts` — analyzes one platform (`fb`/`ig`/`li`), returns health rating, prioritized recommendations, fresh post ideas, scale/pause candidates. 4 tools, MAX_ITERATIONS=8.
- `server/api/ai/email-strategy.post.ts` — `POST { maxRecipients?, focus? }`.
- `server/api/ai/social-strategy.post.ts` — `POST { platform: 'fb'|'ig'|'li' }`.
- `docs/live-data.md` — instructions for swapping mock data sources (Google Ads, Meta, LinkedIn, Resend webhooks) with live APIs.

**Modified:**
- `types/index.ts` — added `EmailOutreachSuggestion`, `EmailStrategyOutput`, `SocialRecommendation`, `SocialPostIdea`, `SocialStrategyOutput`; extended `AgentType` with `email_drafter`, `email_strategist`, `social_strategist`.
- `composables/useAI.ts` — added `runEmailStrategy()` / `runSocialStrategy()` plus `lastEmailStrategy` / `lastSocialStrategy` caches.
- `components/ai/AIPanel.vue` — actions reorganized into a 2×2 grid with **✉️ Plan Outreach** and **📱 Social Strategy** buttons.
- `pages/leads/index.vue` — new **AI Email Strategist** card above the pipeline (suggestions with expandable drafts, Open-lead handoff).
- `pages/social/index.vue` — new **AI Social Strategist** card with per-platform output caching.

**Data sources (current):** Email strategist reads real Supabase `leads`. Social strategist reads `SOCIAL_PLATFORMS` from `lib/mockData.ts` — see `docs/live-data.md` for the Meta/LinkedIn wire-up.

**Verification:** `npm run lint` clean; `npm run build` succeeds; both endpoints emitted as Nitro functions. No new IDE diagnostics.

---

## 2026-06-07 (lockfile-less builds)

### `package-lock.json` removed from version control

Persistent Netlify install failures (`Cannot find module '@oxc-parser/binding-linux-x64-gnu'`, `Invalid Version:` on phantom optional entries) traced to macOS-generated lockfiles being incompatible with Linux runners ([npm/cli#4828](https://github.com/npm/cli/issues/4828)).

**Changes:**
- `.gitignore` — adds `package-lock.json`; `git rm --cached` removed it from the index.
- `netlify.toml` — dropped `NPM_VERSION = "11"` pin; Netlify now uses npm bundled with Node 22 (10.x), matching GitHub Actions.
- `.github/workflows/ci.yml` + `security.yml` — removed redundant `rm -f package-lock.json` steps (file no longer in the repo).
- `docs/issues.md #14b` — restated as the permanent stance, with restoration paths documented.

**Effect:** each environment (local dev, GitHub Actions, Netlify) runs a fresh `npm install` and resolves platform-correct native bindings. Trade-off: no strict cross-environment transitive pinning; `package.json` semver ranges provide bounded resolution.

---


## 2026-06-07 (Neural Dark futuristic theme)

### Application-wide "Neural Dark" redesign

Redesigned the entire CRM with a futuristic dark theme across all pages, layouts, and components.

**Design tokens:**
- Background: `#060c18` (global body), `#0d1628` (cards), `#080e1c` (sub-surfaces/table headers), `#070c18` (inputs)
- Primary accent: cyan (`#06b6d4` / `text-cyan-400`, `bg-cyan-600` buttons)
- Borders: `rgba(148,163,184,0.1)` (cards), `rgba(148,163,184,0.15)` (inputs), `rgba(6,182,212,0.15)` (modal panels)
- Neon badges: emerald/amber/red/blue/purple at `*/15` opacity backgrounds
- Row hover: `hover:bg-cyan-500/5`; dividers: `divide-slate-700/30`

**Files updated (14):**
- `nuxt.config.ts` — Tailwind color tokens (`primary` → dark surface, `accent` → cyan)
- `app.vue` — global dark body/scrollbar/selection CSS
- `layouts/default.vue` — dark left sidebar, cyan active nav indicator
- `components/ai/AIPanel.vue` — dark panel with cyan header
- `components/leads/LeadModal.vue` — dark modal, cyan tabs
- `components/leads/EmailComposer.vue` — dark compose form + history cards
- `pages/index.vue` — dark KPI cards, dark Chart.js config, dark campaign table
- `pages/leads/index.vue` — dark kanban pipeline, dark list table, neon stage badges
- `pages/leads/add.vue` — dark form inputs/selects, accessibility label fixes
- `pages/campaigns/index.vue` — dark campaign cards, dark keyword table, cyan tab switcher
- `pages/search-terms/index.vue` — dark table, neon filter pills, dark modal
- `pages/negative-keywords/index.vue` — dark table, dark stat cards, dark modals
- `pages/weekly-audit/index.vue` — dark checklist cards, dark AI report sections, cyan progress bar
- `pages/social/index.vue` — dark KPI cards, dark campaign grid, dark content tracker table

---

## 2026-06-07 (email feature)

### Customer email composer + AI email agent

Added end-to-end email sending to leads directly from the CRM, with Claude Haiku generating context-aware draft emails.

**New dependencies:**
- `resend` — email sending SDK (added to `package.json`)

**New environment variables** (add to `.env`, documented in `.env.example`):
- `RESEND_API_KEY` — from [resend.com/api-keys](https://resend.com/api-keys)
- `RESEND_FROM_EMAIL` — verified sender address; defaults to `onboarding@resend.dev` for local testing without domain verification

**Database:**
- `supabase/migrations/002_email_messages.sql` — new `email_messages` table with columns: `id`, `created_at`, `lead_id` (FK → leads), `to_email`, `from_email`, `subject`, `body`, `status` (`sent`|`failed`), `resend_id`, `error`. Run in Supabase SQL editor to activate.

**AI agent:**
- `agents/EmailAgent.ts` — Claude Haiku (`claude-haiku-4-5-20251001`) drafts personalized outreach emails from lead context (name, org, stage, interest, notes) plus an optional `purpose` hint (e.g. "follow up on consultation"). Returns `{ subject, body }`. Falls back to a generic template on parse failure.

**Server utils:**
- `server/utils/resend.ts` — Resend client singleton, mirrors the pattern in `server/utils/anthropic.ts`. Exports `getResendClient()` and `getFromEmail()`.

**API routes:**
- `POST /api/email/draft` — calls EmailAgent, returns `{ subject, body }` without sending. Accepts `{ lead, purpose? }`.
- `POST /api/email/send` — validates `{ leadId, to, subject, body }` with Zod, sends via Resend, persists result to `email_messages` (including failures for auditability). Returns the saved row.
- `GET /api/email/:leadId` — returns all `email_messages` for a lead, ordered newest-first.

**Types** (`types/index.ts`):
- Added `EmailMessage` interface (mirrors DB row).
- Added `EmailDraft` interface `{ subject: string; body: string }`.

**`nuxt.config.ts`:**
- Added `resendApiKey` and `resendFromEmail` to `runtimeConfig` server-only secrets block.

**Components:**
- `components/leads/EmailComposer.vue` — self-contained composer with:
  - Pre-filled **To** field (lead email)
  - **Subject** + **Body** inputs
  - **✨ AI Draft** button — calls `/api/email/draft` with optional purpose
  - **Set AI purpose** toggle — freetext hint for the EmailAgent (e.g. "send proposal")
  - **Send Email** button — calls `/api/email/send`, clears form on success
  - Sent history list below the compose form, loaded on mount via `/api/email/:leadId`
- `components/leads/LeadModal.vue` — added **Details / Email** tab bar. Email tab renders `EmailComposer`. No changes to Details tab behaviour; footer buttons remain Details-tab-only.

---

## 2026-06-07 (Dependabot fix)

### Remove `yarn.lock` — fixes Dependabot container failure

Dependabot's Linux container was failing with exit code 1 on the `update_files` step. Root cause: both `yarn.lock` and `package-lock.json` were tracked, making the package manager ambiguous in the Dependabot environment.

- Deleted `yarn.lock` via `git rm -f yarn.lock`. `package-lock.json` is and always was the canonical lockfile (CI uses `npm install`, engines pinned to npm ≥ 10).
- Closes [`issues.md` #14](./issues.md).

---

## 2026-06-07 (PR #7 follow-ups)

### Workflow repair — round 2 (post-first-CI-run)

First CI run on PR #7 surfaced platform / permission issues that weren't visible from local-only verification:

**`npm ci` → `npm install` wasn't enough.** Both jobs still failed with `Cannot find module '@oxc-parser/binding-linux-x64-gnu'`. Root cause: the macOS-generated lockfile records `optionalDependencies` only for darwin-arm64; npm honours that even in `install` mode and refuses to add the Linux binding. Final fix (CI only): `rm -f package-lock.json` immediately before `npm install`. Local dev keeps the committed lockfile for reproducibility. Documented as [`issues.md` #14b](./issues.md).

**Gitleaks `Resource not accessible by integration`.** The job tried to comment the scan summary on the PR but only had `contents: read`. Added `pull-requests: write` to the gitleaks job's `permissions:` block.

**Dependency review failed: "GitHub Advanced Security not enabled".** The action requires GHAS for private repos (a paid feature). Marked the job `continue-on-error: true` and added an inline comment explaining how to make it blocking again once GHAS is on. Logged as [`issues.md` #14c](./issues.md).

**`npm audit` job hit the same postinstall trap.** Added `--ignore-scripts` to that job's `npm install` (it doesn't need a prepared Nuxt project to read the dependency tree) and migrated `--production` → `--omit=dev` (the former is deprecated in npm 10+).

**CodeQL failed: "Code scanning is not enabled".** Same shape as dependency-review — the upload requires a repo setting that's off by default on private repos. Marked the job `continue-on-error: true` and logged the enable-path in [`issues.md` #14d](./issues.md). Second-round CI status: ✓ Lint, ✓ Build, ✓ Gitleaks, ✓ npm audit, ✓ (typecheck — non-blocking, surfaces existing errors), CodeQL + Dependency review run informationally until GHAS / Code scanning are enabled.

## 2026-06-07 (later still)

### Build pipeline + Netlify wiring

Preparing the PR that ships the workflow repair surfaced two more issues that had to be addressed for CI to actually pass end-to-end:

**Typecheck unblock (`npm run typecheck`):**
- No root `tsconfig.json` existed — `nuxt typecheck` failed at "Cannot find matching tsconfig.json". Added a one-line `tsconfig.json` that extends `./.nuxt/tsconfig.json`.
- `vue-tsc` was not installed. Added `vue-tsc@^2` and `@nuxt/eslint-config@^0.7` (the latter was transitively available but `eslint.config.mjs` imports from it directly, so it's now a direct devDep).
- Bumped Node heap for vue-tsc via `NODE_OPTIONS=--max-old-space-size=8192` in the `typecheck` script.
- Once typecheck could actually run, it surfaced **40+ pre-existing type errors** across `agents/`, `components/leads/`, and `pages/` — type definitions in `types/index.ts` have drifted from hand-written component / agent code. Out of scope for workflow repair. Logged as [`issues.md` #5](./issues.md) and the CI `typecheck` job is now `continue-on-error: true` + removed from `build.needs`. Restores the pipeline's ability to go green while preserving visibility on the failures.

**Netlify deployment target:**
- `nuxt.config.ts` had `nitro.preset` hardcoded to `'vercel'`. Changed to `process.env.NITRO_PRESET || 'vercel'` so each host can self-configure via env.
- Added `netlify.toml` at the repo root: `command = "npm run build"`, `publish = "dist"`, `NITRO_PRESET = "netlify"`, `NODE_VERSION = "22"`. Same env applied to `production`, `deploy-preview`, and `branch-deploy` contexts so PRs get preview builds.
- Verified locally: `NITRO_PRESET=netlify npm run build` produces `.netlify/functions-internal/server/main.mjs` + `dist/` (7.53 MB / 1.75 MB gzipped). Vercel build still works as default.
- `.gitignore` extended with `.netlify` and `dist`.

**Repo hygiene:**
- Reverted unintended `yarn.lock` modification — CI uses `npm ci`, so `package-lock.json` is canonical. `yarn.lock` removal flagged in [`issues.md` #14](./issues.md) pending team confirmation.

State of CI on this PR:

| Job | Status |
|---|---|
| Lint | ✅ blocking — passes |
| Typecheck | ⚠️ runs, reports, does not block |
| Build (`npm run build`) | ✅ blocking — passes locally with placeholder env |
| Security (CodeQL, Gitleaks, dep review, npm audit) | runs on PR via the existing workflow |

---

## 2026-06-07 (later)

### Workflow repair — lint pipeline operational

Verified the CI lint job after `git init` and brought it to a passing state.

- Installed `eslint@^9` as a devDependency (the `@nuxt/eslint` module did not provide the `eslint` binary in this setup, so `npm run lint` failed with "command not found" in CI).
- Added a standalone `eslint.config.mjs` at the repository root using `@nuxt/eslint-config/flat` (`createConfigForNuxt({ features: { stylistic: false, tooling: true } })`). Avoids the brittle dependency on `@nuxt/eslint`'s auto-generated `.nuxt/eslint.config.mjs`, which was not being emitted by `nuxt prepare` in the installed v0.7.6.
- Reverted the temporary `eslint.config.standalone: false` block in `nuxt.config.ts` (no longer needed under the standalone config).
- Ignores: `.nuxt`, `.output`, `.vercel`, `dist`, `node_modules`, `coverage`, `supabase/.temp`, `supabase/.branches`.
- Rule overrides: `no-console: ['warn', { allow: ['warn', 'error'] }]`.

### Lint cleanup — 39 → 0

Initial run reported **15 errors + 24 warnings**. `eslint --fix` resolved 31 of them; the remaining 8 were fixed manually:

| File | Fix |
|---|---|
| `agents/WeeklyAuditAgent.ts` | Renamed unused token counter `totalTokens` → `_totalTokens` (3 sites). The audit agent's `AuditReport` doesn't expose `tokens_used` like the optimizer agent does — left as a follow-up rather than expanding scope. |
| `server/api/ai/analyze-campaigns.post.ts` | `event` → `_event` (handler doesn't read the request). |
| `server/api/ai/weekly-audit.post.ts` | `event` → `_event` (same). |
| `server/mcp/google-ads/index.ts` | Dropped unused index parameter from `campaign.keywords.map((kw, i) => …)`. |
| `server/mcp/linkedin-ads/index.ts` | Wired `date_range_end` into the live API `params` (was destructured but never used — completed the implementation). |
| `pages/weekly-audit/index.vue` | Added `default` to inline `AuditReportSection` props (`title: ''`, `items: []`, `color: 'slate'`) to satisfy `vue/require-default-prop`. |

Auto-fix also normalised: `import` → `import type` (4 files), `parseFloat` → `Number.parseFloat` (4 sites), Vue void-element self-closing (21 sites across `pages/leads/add.vue`, `pages/negative-keywords/index.vue`, `pages/search-terms/index.vue`, `pages/social/index.vue`), and de-duplicated a double `~/types` import in `agents/WeeklyAuditAgent.ts`.

Final state: `npm run lint` exits 0 with no output. `npx nuxt prepare` succeeds. YAML for all three workflow files parses cleanly.

---


## 2026-06-07

### GitHub Actions version refresh

Bumped pinned major versions in `.github/workflows/ci.yml` and `.github/workflows/security.yml` to track upstream and avoid runtime-deprecation breakage:

| Action / runtime | Before | After | Reason |
|---|---|---|---|
| `actions/checkout` | `@v4` | `@v6` | Latest major (v6.0.3, 2026-06-02) |
| `actions/setup-node` | `@v4` | `@v6` | Latest major (v6.4.0, 2026-04-20) |
| `gitleaks/gitleaks-action` | `@v2` | `@v3` | v2's Node 20 runtime is deprecated 2026-06-02 and removed 2026-09-16 |
| `actions/dependency-review-action` | `@v4` | `@v5` | Latest major (v5.0.0, Node 24 runtime) |
| `github/codeql-action/{init,analyze}` | `@v3` | `@v3` | Already current |
| Job `node-version` | `'20'` | `'22'` | Node 20 reached EOL 2026-04-30; Node 22 is Maintenance LTS through 2027-04 |

Dependabot's `github-actions` ecosystem entry will catch future bumps automatically.

Also:

- Added `workflow_dispatch:` trigger to both workflows so they can be run manually from the **Actions** tab before opening a PR.
- Pinned Node/npm in `package.json` `engines` (`node: ">=22.0.0 <25"`, `npm: ">=10.0.0"`) so local dev and CI agree on a supported runtime. `npm install` will warn if a developer is on an unsupported Node version.

### Environment

- Created local `.env` (gitignored) populated from `.env.example`:
  - `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY` set against project `ngjpdngzhrwhxxduwmlx`.
  - `ANTHROPIC_API_KEY` set.
  - Ads-platform variables left blank (agents fall back to mock data).
- Note: keys initially pasted via chat have been flagged for rotation — see [`issues.md`](./issues.md).

### Dev workflow

- `package.json` → `scripts.dev` changed from `"nuxt dev"` to `"TMPDIR=/tmp nuxt dev"` to work around the macOS `sockaddr_un.sun_path` 104-byte limit hit by Nuxt 3.21.7's vite-node IPC socket layout. No-op on Linux/CI. Windows users will need `cross-env`.

### DevSecOps

- **Repo hygiene**
  - `.gitignore` — excludes `.env*` (allowlists `.env.example`), `node_modules`, `.nuxt`, `.output`, scan output, OS noise.
  - `SECURITY.md` — vulnerability disclosure policy, scope, safe-harbor terms.
- **CI / scans** (`.github/workflows/`)
  - `ci.yml` — lint, typecheck, build on PR + push to `main`. Build uses CI placeholder env vars.
  - `security.yml` — CodeQL (`security-and-quality`), gitleaks, GitHub dependency-review (PRs), `npm audit --audit-level=high --production`. Weekly cron Mon 06:00 UTC.
- **Dependency automation**
  - `.github/dependabot.yml` — weekly npm + Actions updates grouped by ecosystem (nuxt / vue / ai-stack / supabase / dev-tooling). Major Nuxt updates ignored.
- **Runtime hardening**
  - `nuxt.config.ts` → Nitro `routeRules['/**']` adds CSP (self + Supabase + Anthropic), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP.
  - `server/api/leads/index.post.ts` rewritten with `LeadInsertSchema` (Zod): trimmed strings with max lengths, email format, ISO date format, enum allowlists for `stage`/`source`/`qualified`, bounded numeric for `revenue`, structured 400 on failure.
- **Documentation**
  - `docs/devsecops.md` — pipeline reference, threat model, follow-ups.

### Code review (also captured in [`README.md`](./README.md))

Bugfixes applied across:

- `package.json` — promoted `@supabase/supabase-js` to a direct dependency (previously transitive only).
- `server/utils/anthropic.ts` — prefers `useRuntimeConfig().anthropicApiKey`, env as fallback.
- `server/api/leads/index.post.ts` — typed `aiScore` as `LeadScore | null` (was implicit `null`).
- `composables/useAI.ts` — filters empty/loading messages from Anthropic history; pops both placeholders on error.
- `composables/useMCP.ts` — removed dead `listTools()` (called a non-existent route).
- `stores/leads.ts` — `fetchLeads()` falls back to `[]` instead of leaving `undefined`.
- `pages/index.vue` — guarded all KPI divisions (CPL / ROAS / conversion rate) against zero denominators.
- `agents/CampaignOptimizerAgent.ts` — agentic loop capped at 10 iterations with unified post-loop output.
- `agents/WeeklyAuditAgent.ts` — agentic loop capped at 12 iterations with iteration-aware fallback.

---

## How to record future updates

1. Add a new dated section above this line.
2. Group changes under **Environment**, **Dev workflow**, **DevSecOps**, **Code**, or other relevant heading.
3. Link to specific files using repo-root-relative paths so the entry stays useful after refactors.
4. If a change introduces a known limitation, also append it to [`issues.md`](./issues.md).
