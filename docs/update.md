# Updates

Chronological log of project-level changes. Newest first.
See [`README.md`](./README.md) for the architecture overview and [`issues.md`](./issues.md) for outstanding problems.

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
