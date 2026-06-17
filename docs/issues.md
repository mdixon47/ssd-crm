# Known Issues & Follow-ups

Active issues, deferred work, and known limitations.
See [`update.md`](./update.md) for what has already shipped.

Severity: **🔴 Critical** · **🟠 High** · **🟡 Medium** · **⚪ Low**

---

## 🔴 Critical — needs action now

### 1. Rotate keys pasted to chat transcript
Keys handed to the agent through chat are recorded in a log surface that cannot be edited retroactively. Although none of them reached any committed file (scan confirmed they only live in `.env`, which is gitignored), the leaked strings are still readable in the transcript until each key is invalidated upstream.

| Key | Where to rotate | Impact if compromised |
|---|---|---|
| `SUPABASE_SERVICE_KEY` | https://app.supabase.com/project/ngjpdngzhrwhxxduwmlx/settings/api-keys | Bypasses RLS — full DB read/write |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | Billable API usage |
| `SUPABASE_KEY` (publishable) | Same Supabase API page | Low — designed to be browser-exposed |

After rotation, paste the new values directly into `.env` (not through chat) and restart `npm run dev`.

---

## 🟠 High — schedule

### 2. Supabase migrations — several not yet applied to live project
The following migrations are checked in but **have not been applied** to the live project. Apply via the Supabase dashboard SQL editor in numeric order.

| Migration | Content | Status |
|---|---|---|
| `003_enable_rls.sql` | Enable RLS on core tables | ❌ unapplied |
| `004_lead_assignee.sql` | `assignee` column on leads | ❌ unapplied |
| `005_admin_users.sql` | Admin role table | ❌ unapplied |
| `006_profiles.sql` | User profiles | ❌ unapplied |
| `007_rls_multi_user.sql` | Multi-user per-row policies | ❌ unapplied |
| `008_email_campaigns.sql` | Email campaigns + recipients | ❌ unapplied |
| `009_sales_calls_appointments_contracts.sql` | Sales Calls, Appointments, Contracts tables | ❌ unapplied |
| `010_content_items.sql` | Content Hub content_items table | ❌ unapplied |

Until `009` is applied, all writes on the Sales Calls, Appointments, and Contracts pages will fail. Until `010` is applied, the Content Hub will return errors on save and load.

`007_rls_multi_user.sql` adds `created_by uuid references auth.users(id) default auth.uid()` to all five core tables and replaces each `authenticated_all` policy with four operation-specific policies: SELECT + UPDATE open to all authenticated users (shared-team CRM), INSERT enforced to `created_by = auth.uid()`, DELETE restricted to the row owner or any `admin_users` member.

`007_rls_multi_user.sql` adds `created_by uuid references auth.users(id) default auth.uid()` to all five core tables and replaces each `authenticated_all` policy with four operation-specific policies: SELECT + UPDATE open to all authenticated users (shared-team CRM), INSERT enforced to `created_by = auth.uid()`, DELETE restricted to the row owner or any `admin_users` member.

`008_email_campaigns.sql` creates `email_campaigns` (name, subject, body, status, recipient_filter JSONB, sent_at) and `email_campaign_recipients` (per-lead delivery status + Resend ID). Without this migration the **Email Campaigns** tab in `/campaigns` will fail on all API calls.

After the migrations are applied, server-side paths keep working unchanged — `server/utils/supabase.ts` returns a service-role client that bypasses RLS. The defense-in-depth follow-up is migrating read paths in `server/api/**` from the service-role client to `serverSupabaseClient(event)` (per-user JWT, RLS-enforced). Writes that intentionally cross users (system jobs, scheduled audits) can keep the service-role path.

`007_rls_multi_user.sql` adds `created_by uuid references auth.users(id) default auth.uid()` to all five core tables and replaces each `authenticated_all` policy with four operation-specific policies: SELECT + UPDATE open to all authenticated users (shared-team CRM), INSERT enforced to `created_by = auth.uid()`, DELETE restricted to the row owner or any `admin_users` member.

After the migrations are applied, server-side paths keep working unchanged — `server/utils/supabase.ts` returns a service-role client that bypasses RLS. The defense-in-depth follow-up is migrating read paths in `server/api/**` from the service-role client to `serverSupabaseClient(event)` (per-user JWT, RLS-enforced). Writes that intentionally cross users (system jobs, scheduled audits) can keep the service-role path.

### 3. ~~Netlify build OOM — JavaScript heap out of memory~~ — RESOLVED 2026-06-12
Every Netlify build was crashing with `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory` (exit code 134). Three changes were needed together:

1. **`NODE_OPTIONS = "--max-old-space-size=4096"`** added to `[build.environment]` in `netlify.toml` — raises the V8 heap cap from the Node default (~1.5 GB) to 4 GB.
2. **`typeCheck: false`** in `nuxt.config.ts` — `typeCheck: true` runs `vue-tsc` concurrently with the Vite build in the same process, nearly doubling peak heap (see issue #9).
3. **`vite.build.sourcemap: false` and `vite.build.reportCompressedSize: false`** — Rollup holds full source maps in memory during bundling (~200–400 MB each); the compressed-size pass adds another ~200 MB.

Combined saving: ~800 MB–1.2 GB peak heap. Build now completes well under the 4 GB ceiling.

### 4. ~~AI agent routes returning 504 Gateway Timeout~~ — RESOLVED 2026-06-12
All four agentic routes (`/api/ai/email-strategy`, `/api/ai/weekly-audit`, `/api/ai/analyze-campaigns`, `/api/ai/social-strategy`) were hitting Netlify's default 10-second function timeout. Root causes:

- All four agents used `claude-opus-4-6` (10–20 s per API call) for their tool-use loop.
- `MAX_ITERATIONS` was set to 8–12, meaning up to 12 sequential Opus calls in the worst case (~180 s total).
- `max_tokens: 4096–8096` was applied even to short tool-call turns that only need ~200 tokens.
- No `[functions]` section in `netlify.toml` — default timeout was 10 s.

Fixes applied to all four agents (`EmailStrategistAgent`, `WeeklyAuditAgent`, `CampaignOptimizerAgent`, `SocialMediaAgent`):
- Model: `CLAUDE_OPUS` → `CLAUDE_SONNET` (3–5× faster, still high-quality for this task)
- `MAX_ITERATIONS`: 8–12 → 4–5
- `max_tokens`: 1024 for tool-call turns, 4096 for the final text output turn
- `netlify.toml`: added `[functions]\n  timeout = 26` (Netlify's maximum for synchronous functions)

Worst-case after: 5 Sonnet calls × ~3 s = ~15 s — within the 26 s limit.

### 5. ~~esbuild high-severity CVEs failing `npm audit` in CI~~ — RESOLVED 2026-06-12
`esbuild 0.17.0 – 0.28.0` carried two high-severity advisories:
- **GHSA-gv7w-rqvm-qjhr** — missing binary integrity verification in the Deno module (RCE via `NPM_CONFIG_REGISTRY`)
- **GHSA-g7r4-m6w7-qqqr** — arbitrary file read when running the dev server on Windows

Six nested copies of esbuild (in `vite-node`, `@nuxt/vite-builder`, `nitropack`, `vitest`) were all in the vulnerable range. Because `nuxt` is listed in `dependencies` (not `devDependencies`), `--omit=dev` didn't exclude them. The `security.yml` `npm audit` job was exiting 1 on every CI run.

Fix: added `"esbuild": ">=0.28.1"` to `package.json` `overrides` (same pattern as the existing `zod` override). All six copies deduplicate to `0.28.1` on any fresh `npm install`. `npm audit --audit-level=high --omit=dev` now exits 0.

### 6. ~~Netlify deployment: wrong Supabase key type in env vars~~ — RESOLVED 2026-06-12
After the first successful Netlify build (post OOM fix), sign-in failed with two sequential errors:
- `Invalid API key` — `SUPABASE_KEY` was not set in the Netlify dashboard (the `[build.environment]` block in `netlify.toml` only declares which keys to expose, not their values).
- `Forbidden use of secret API key in browser` — once `SUPABASE_KEY` was set, it was mistakenly set to the **service role key** instead of the **anon/public key**.
- `Invalid path specified in request URL` — `SUPABASE_URL` was set to the Supabase dashboard URL (`https://app.supabase.com/project/...`) instead of the project API URL (`https://<ref>.supabase.co`).

**Correct Netlify environment variable values** (set in Netlify UI → Site Settings → Environment Variables, not in `netlify.toml`):

| Variable | Correct value | Where to find |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` (no trailing slash) | Supabase → Settings → API → Project URL |
| `SUPABASE_KEY` | **anon/public** key | Supabase → Settings → API → Project API keys → `anon public` |
| `SUPABASE_SERVICE_KEY` | service role key | Same page → `service_role secret` |

### 7. ~~MCP HTTP adapter uses private SDK internals~~ — RESOLVED 2026-06-12
`server/api/mcp/[server].post.ts` previously read `_registeredTools` behind a `@ts-expect-error`. Replaced with `WebStandardStreamableHTTPServerTransport` (stateless, `enableJsonResponse: true`) from `@modelcontextprotocol/sdk`. The route now speaks the official MCP JSON-RPC protocol. See `update.md` (2026-06-12).

### 8. ~~No authentication on `/api/mcp/*`~~ — RESOLVED 2026-06-10
The shared `server/middleware/auth.ts` now requires a valid Supabase session on every `/api/**` route, including `/api/mcp/[server]`. Remaining external-access work is tracked under #2 (RLS) and #7 (replace private SDK internals).

### 9a. Pre-existing TypeScript errors block `nuxt typecheck` — **RESOLVED 2026-06-08**
`npm run typecheck` previously reported 56 errors across `agents/`, `components/leads/LeadModal.vue`, `pages/campaigns/`, `pages/leads/`, `pages/negative-keywords/`, `pages/search-terms/`, `pages/social/`, and `server/mcp/*`. Resolution summary:

1. **MCP SDK `tool()` → `registerTool()` migration** (`server/mcp/crm`, `google-ads`, `linkedin-ads`, `meta-ads`). The deprecated `tool()` overload had ambiguous resolution between `ToolAnnotations` and `ZodRawShapeCompat`, producing TS2589 "excessively deep" instantiation. `registerTool` uses an explicit config object that bypasses the problematic inference path.
2. **`zod` duplicate dedupe** — `@modelcontextprotocol/sdk@1.29.0` nests `zod@4.4.3` via `zod-to-json-schema`, while the project pins `zod@^3.24.2`. `npm dedupe` collapsed both to a single `zod@3.25.76`; `package.json` now declares `"overrides": { "zod": "$zod" }` to keep fresh installs deterministic.
3. **Type Drift between UI and DB schema** — `types/index.ts` extended so DB-only fields (`platform`, `week_date`) and UI-only fields (`match_type`, `reason`, `status`, `tier`, `recommended_next_step`, `estimated_deal_value`) coexist as optional supersets. `LeadScore`, `NegativeKeyword`, `SocialPost`, and `SearchTerm` updated accordingly.
4. **Narrow per-file null/enum fixes** — `agents/CampaignOptimizerAgent.ts` initialises `finalOutput` to a default-shaped object; `pages/leads/add.vue` casts `qualified` / `source` to enum types; `server/api/email/draft.post.ts` casts to `Partial<Lead>`; misc `?? 0` / `?? ''` guards in social pages.

**Final state**: `npx vue-tsc --noEmit` and `nuxt typecheck` both report 0 errors. `npm run lint` clean. `.github/workflows/ci.yml` `typecheck` job is now blocking (`continue-on-error` removed; `build.needs: [lint, typecheck]`).

---

## 🟡 Medium — improvement work

### 10. Nuxt 3.21.7 vite-node socket regression (workaround in place)
`@nuxt/vite-builder` 3.21.7 nests the IPC Unix socket in an extra `mkdtemp` directory, pushing the path past macOS's 104-byte `sockaddr_un.sun_path` limit.

- **Workaround applied:** `scripts.dev` in `package.json` is `TMPDIR=/tmp nuxt dev`.
- **Upstream:** nuxt/nuxt#35253, #35258, #35264.
- **Action when fixed:** once `@nuxt/vite-builder >= 3.21.8` is published on the `3x` tag (Dependabot will PR it), revert the script back to `"nuxt dev"`.
- **Windows users:** inline `TMPDIR=...` won't work in `cmd`; switch to `cross-env` if needed.

### 11. ~~Hard-coded Claude model identifiers~~ — RESOLVED 2026-06-12
Model IDs are now centralised in `lib/models.ts` (`CLAUDE_HAIKU`, `CLAUDE_SONNET`, `CLAUDE_OPUS`). All 8 agent files and `server/api/ai/chat.post.ts` import from there. See `update.md` (2026-06-12).

### 9b. `typescript.typeCheck` disabled in nuxt.config.ts — intentional trade-off
`typeCheck: true` was briefly enabled (2026-06-12) but had to be reverted to `false` (2026-06-12) because `vue-tsc` runs concurrently with the Vite build under the same Node process, nearly doubling peak heap usage. The Netlify build container hit the 4 GB heap ceiling even after raising `NODE_OPTIONS=--max-old-space-size=4096`. Running both in a single process is the design of `@nuxt/module-builder`'s typecheck integration.

**Current state:** `nuxt.config.ts` has `typeCheck: false`. Type correctness is still enforced — the GitHub Actions CI `typecheck` job (`npm run typecheck`, which has its own `--max-old-space-size=8192` budget) gates every merge. The deploy build is type-check-free for memory reasons only.

**To re-enable in future:** either split the build into two separate steps in the netlify.toml (`npx nuxt typecheck && npx nuxt prepare && npm run build`) each with their own Node process, or upgrade to a Netlify build container with more RAM.

### 13a. ~~Zod validation not yet applied to remaining endpoints~~ — RESOLVED 2026-06-12
Zod schemas added to `POST /api/ai/chat`, `POST /api/ai/label-terms`, and `POST /api/ai/score-lead`. The remaining endpoints either had Zod before this session (`/api/leads`, `/api/leads/extract`, `/api/email/*`, `/api/ai/email-strategy`, `/api/ai/social-strategy`) or accept no body (`/api/ai/analyze-campaigns`, `/api/ai/weekly-audit`). `PATCH /api/leads/[id]` still uses an `allowedFields` allowlist without Zod — tracked separately if needed. See `update.md` (2026-06-12).

### 14. No per-IP rate limiting
`/api/leads`, `/api/ai/*`, and `/api/a2a/*` are uncapped. Add IP-based throttling once the host is chosen (Vercel Edge Config or Upstash Ratelimit are the obvious candidates). See `improvement.md` I-11.

### 20. A2A endpoint lacks machine-to-machine authentication
`POST /api/a2a/[agent]` is protected by the global session-cookie middleware, which works for same-origin browser callers but blocks legitimate external agents (Zapier, Make, third-party Claude agents). See `improvement.md` I-03 for the Bearer token fix.

### 21. Content Hub: scheduled posts are never auto-published
Setting a `scheduled_at` on a content item and status `scheduled` marks it in the DB but no background process publishes it. A cron job needs to be wired (Netlify Scheduled Functions or Vercel cron at `/api/cron/publish-scheduled`). See `improvement.md` I-07.

### 22. Content Hub: "Publish" button is manual only (no platform API integration)
Clicking "Mark Published" records the status change in the DB but does not push to LinkedIn, Facebook, Instagram, or email. Real integrations require OAuth app credentials and API calls. See `improvement.md` I-02.

### 24. ~~GitHub Actions CI: lint and typecheck failures across Sales Calls, Appointments, Contracts, Campaigns pages~~ — **RESOLVED 2026-06-17**

The CI `Lint` and `Typecheck` jobs were both failing, blocking all builds. Root cause: the Sales Calls, Appointments, Contracts, and Content pages added in the previous session used `any` types throughout and the Campaigns page had a second template root.

**Lint errors fixed (`@typescript-eslint/no-explicit-any` — 23 instances across 8 files):**
- `components/leads/LeadModal.vue` — activity tab refs (`salesCalls`, `appointments`, `contracts`) and `$fetch` calls replaced with typed `ActivitySalesCall`, `ActivityAppointment`, `ActivityContract` interfaces
- `pages/appointments/index.vue` — `appointments` ref and `markStatus` parameter typed with `Appointment` interface
- `pages/contracts/index.vue` — `contracts` ref, `markSigned`/`markPaid` parameters typed with `Contract` interface
- `pages/sales-calls/index.vue` — `calls` ref and `updateCall` parameter typed with `SalesCall` interface
- `server/api/appointments/index.get.ts`, `server/api/contracts/index.get.ts`, `server/api/sales-calls/index.get.ts` — Supabase row `.map()` callback typed with `RowWithLeads = { leads?: {...} } & Record<string, unknown>`
- `useFetch('/api/leads')` cast updated across all three pages to include `org?: string` on the lead shape

**Lint error fixed (`vue/no-multiple-template-root`):**
- `pages/campaigns/index.vue` — `<EmailCampaignModal>` was a sibling of the page root `<div>`, creating two template roots; moved inside the root div

**Typecheck errors fixed:**
- `components/campaigns/EmailCampaignModal.vue` — `:disabled="saving"` where `saving: false | 'draft' | 'send'` → changed to `!!saving` to produce a `boolean`
- `pages/content/index.vue` — `PLATFORM_OPTIONS` array typed as `Array<{ value: ContentPlatform }>` to match `form.platform` assignment; imported `ContentPlatform` from `~/types`
- `server/api/ai/score-lead.post.ts` — Zod-inferred schema shape has `qualified: string` vs `Lead.qualified: QualifiedStatus`; fixed with `as Partial<Lead>` cast after import

**Verification:** `npm run lint` exits 0 (0 errors, 69 warnings); `npm run typecheck` exits 0.

### 23. ~~AIPanel workflow buttons redundant API round-trip~~ — **RESOLVED 2026-06-17**
The Weekly Audit, Analyze Campaigns, Plan Outreach, and Social Strategy buttons passed their pre-formatted result strings back through `crmChat`, causing a wasted Anthropic API call and risking the CRM Operations Agent misinterpreting the result summary as a new command. Fixed with a `pushAssistantMessage()` helper in `useAI.ts` that inserts assistant messages directly into the conversation state without an API call.

---

## ⚪ Low — nice to have

### 12. Husky pre-commit hooks not configured
Now that `git init` has been performed, this is unblocked. After installing:
```bash
npm install -D husky lint-staged
npx husky init
# add: npm run lint
```

### 13. `CODEOWNERS` not created
Requires team GitHub handles. Add `/.github/CODEOWNERS` once roles are defined.

### 14. SARIF upload from `npm audit`
The current `npm audit` CI job fails the build but doesn't write findings to the Security tab. Convert output to SARIF for a centralised view.

### ~~15. Duplicate lockfiles (`yarn.lock` + `package-lock.json`)~~ — **resolved 2026-06-07**
`yarn.lock` removed. See [`update.md`](./update.md).

### 15b. `package-lock.json` is intentionally untracked
[npm/cli#4828](https://github.com/npm/cli/issues/4828): `package-lock.json` generated on macOS-arm64 only records the darwin-arm64 native bindings for `oxc-parser` (a Nuxt transitive dep). On Ubuntu / Netlify Linux runners, both `npm ci` and `npm install` then fail with `Cannot find module '@oxc-parser/binding-linux-x64-gnu'`. npm 11 also writes `{"optional": true}` phantom entries without a `version` field for uninstalled WASM optional bindings, which older npm versions reject as `Invalid Version:`.

**Current stance**: `package-lock.json` is in `.gitignore`. Each environment regenerates a local lockfile via `npm install`:
- Local dev: lockfile written on first `npm install`; not committed.
- CI (GitHub Actions): fresh `npm install` per run; no `rm -f` step needed.
- Netlify: fresh `npm install` per build; uses bundled npm from Node 22.

**Trade-off**: lose strict transitive-version pinning across environments. `package.json` ranges (`^x.y.z`) provide bounded resolution; this is acceptable while platform-skew on the lockfile cannot be solved upstream.

**To restore strict pinning later** (any of):
- Generate the lockfile inside a Linux container (Docker / devcontainer) and commit that single canonical copy. Refresh on a dedicated bot workflow.
- Adopt pnpm or yarn4 (both record per-platform optional deps correctly).
- Track [npm/cli#4828](https://github.com/npm/cli/issues/4828) for an upstream fix.

### 15c. `Dependency review` job removed (2026-06-08)
The `actions/dependency-review-action@v5` was removed from `security.yml`. Rationale: it required GitHub Advanced Security on private repos (paid), ran only on PR diffs, and its CVE coverage fully overlapped with the existing `npm audit` job which runs on every push and PR. Re-adding it is sensible only if GHAS is enabled and license-checking is added.

### 15d. `CodeQL` job is non-blocking until Code scanning is enabled
The CodeQL upload step needs *Code scanning* turned on in repo settings (*Settings → Code security and analysis → Code scanning*). Until that toggle is on, the analyze step 403s. Currently `continue-on-error: true`. Once Code scanning is enabled, drop that flag so findings can gate merges.

### 16. ~~No unit tests~~ — PARTIALLY RESOLVED 2026-06-12
Vitest is wired up (`npm test`, `npm run test:watch`). First spec covers `LeadExtractorAgent` (7 cases: happy path, fence stripping, fallback, sourceHint, coercion, truncation, warnings). No network or key required — Anthropic client is stubbed. Coverage is narrow; recommended next additions:
- `LeadInsertSchema` happy path + each rejection branch
- `runCampaignOptimizerAgent` / `runWeeklyAuditAgent` fallback when `MAX_ITERATIONS` is reached
- `stores/leads.ts` defensive `?? []` paths
- `pages/index.vue` KPI computations with empty / zero-denominator data

### 17. `punycode` deprecation warning on startup
`DEP0040: The punycode module is deprecated.` Emitted from a transitive dep (likely `whatwg-url`). Cosmetic — no action needed until Node removes the module.

### 18. zod v4 upgrade — eligible to attempt (Dependabot PR #6 closed 2026-06-08)
The 2026-06-08 baseline-fix (see `update.md`) unblocks v4 evaluation. Source-level migration is required, not just a version bump: `z.string().email()` → `z.email()` (5 sites), `z.string().uuid()` → `z.uuid()` (1 site), and any reader of `ZodError.errors` must move to `.issues`. Affected files: `server/api/{email/draft,email/send,leads/index,ai/email-strategy,ai/social-strategy}.post.ts` and `server/mcp/*/index.ts`. **Exit criteria**: unignore via Dependabot or bump locally, apply renames, run `npm run typecheck` + `npm run build`, decide whether to keep the `overrides.zod` pin (the MCP SDK ships v4 natively, so the override likely becomes unnecessary).

### 22. Runtime smoke-test debt on the 2026-06-08 runtime-deps bundle — PARTIALLY RESOLVED 2026-06-12
The atomic bump of `@anthropic-ai/sdk` 0.39 → 0.102 and `@nuxtjs/supabase` 1.6 → 2.0.9 was validated by `lint`, `vue-tsc --noEmit`, and `npm run build` only — no live API call, no booted Nuxt server.

**Completed (2026-06-12):**
- `/api/ai/email-strategy` was exercised against the deployed Netlify app with a real `ANTHROPIC_API_KEY`. It initially returned 504 (root cause identified and fixed — see issue #4). After the Sonnet + iteration fix, the agent loop completed successfully and returned a structured `EmailStrategyOutput`. The SDK's `messages.create`, `Tool`, `MessageParam`, and `ToolResultBlockParam` surface all confirmed working at runtime.
- Supabase `@nuxtjs/supabase` v2 auth confirmed working in production: sign-in, session persistence, and `useSupabaseClient()` all functional after the correct `SUPABASE_URL` and anon `SUPABASE_KEY` were set (see issue #6).

**Still pending:**
- `TMPDIR=/tmp npm run dev` local boot with `@nuxtjs/supabase` v2 — confirm no console warnings around the `redirect: false` SSR path.
- If anything regresses, revert is a single commit; both packages remain individually downgradeable.

---

## How to update this file

- When you ship a fix, move the item to [`update.md`](./update.md) under today's date and delete it here.
- When you discover a new issue, add it under the right severity heading with the file path(s) involved.
- Keep severities honest: **Critical = ship-stopping**, **High = pre-production blocker**, **Medium = scheduled cleanup**, **Low = nice-to-have**.
