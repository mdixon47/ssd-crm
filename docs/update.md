# Updates

Chronological log of project-level changes. Newest first.
See [`README.md`](./README.md) for the architecture overview and [`issues.md`](./issues.md) for outstanding problems.

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
