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

### 2. Supabase Row Level Security disabled
RLS policy templates are commented out at the bottom of `supabase/migrations/001_initial.sql`. The current `service_role` key bypasses RLS regardless, but **before any non-internal deployment**, RLS must be enabled and the server routes migrated to use `serverSupabaseClient` (per-user JWT) for read paths.

### 3. MCP HTTP adapter uses private SDK internals
`server/api/mcp/[server].post.ts` reads `_registeredTools` from the MCP SDK behind a `@ts-expect-error`. This will break on the next SDK breaking release. Replace with `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`.

### 4. No authentication on `/api/mcp/*`
The MCP endpoints are server-side, but unauthenticated. Acceptable while the app is single-tenant and not publicly exposed; required before any external access.

---

## 🟡 Medium — improvement work

### 5. Nuxt 3.21.7 vite-node socket regression (workaround in place)
`@nuxt/vite-builder` 3.21.7 nests the IPC Unix socket in an extra `mkdtemp` directory, pushing the path past macOS's 104-byte `sockaddr_un.sun_path` limit.

- **Workaround applied:** `scripts.dev` in `package.json` is `TMPDIR=/tmp nuxt dev`.
- **Upstream:** nuxt/nuxt#35253, #35258, #35264.
- **Action when fixed:** once `@nuxt/vite-builder >= 3.21.8` is published on the `3x` tag (Dependabot will PR it), revert the script back to `"nuxt dev"`.
- **Windows users:** inline `TMPDIR=...` won't work in `cmd`; switch to `cross-env` if needed.

### 6. Hard-coded Claude model identifiers
Model IDs (`claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) are duplicated across `agents/*.ts`. Centralise into a single `MODELS` constant in `server/utils/anthropic.ts` so future upgrades require one edit.

### 7. `typescript.typeCheck` disabled
`nuxt.config.ts` has `typescript.typeCheck: false`. The strict-mode issues from the code review are resolved, so this can be flipped back to `true` once `npm run typecheck` is green locally. CI already runs typecheck in a separate job.

### 8. Zod validation not yet applied to remaining endpoints
Only `POST /api/leads` uses a Zod schema. Apply equivalent schemas to:
- `PATCH /api/leads/[id]`
- `POST /api/ai/chat`, `POST /api/ai/optimize-campaign`, `POST /api/ai/label-search-terms`, `POST /api/ai/weekly-audit`

### 9. No per-IP rate limiting
`/api/leads` and `/api/ai/*` are uncapped. Add IP-based throttling once the host is chosen (Vercel Edge Config or Upstash Ratelimit are the obvious candidates).

---

## ⚪ Low — nice to have

### 10. Husky pre-commit hooks not configured
Skipped because the workspace is not `git init`-ed at root. After initialising:
```bash
npm install -D husky lint-staged
npx husky init
# add: npm run lint
```

### 11. `CODEOWNERS` not created
Requires team GitHub handles. Add `/.github/CODEOWNERS` once roles are defined.

### 12. SARIF upload from `npm audit`
The current `npm audit` CI job fails the build but doesn't write findings to the Security tab. Convert output to SARIF for a centralised view.

### 13. Repo not initialised at workspace root
`git rev-parse --show-toplevel` failed at the start of the DevSecOps work, meaning no Git history yet exists for this workspace. Some hooks (Husky, gitleaks pre-commit) depend on `git init` being run first.

### 14. No unit tests
No test framework is wired up. Recommended scope for a first pass:
- `LeadInsertSchema` happy path + each rejection branch.
- `runCampaignOptimizerAgent` / `runWeeklyAuditAgent` fallback when `MAX_ITERATIONS` is reached.
- `stores/leads.ts` defensive `?? []` paths.
- `pages/index.vue` KPI computations with empty / zero-denominator data.

### 15. `punycode` deprecation warning on startup
`DEP0040: The punycode module is deprecated.` Emitted from a transitive dep (likely `whatwg-url`). Cosmetic — no action needed until Node removes the module.

---

## How to update this file

- When you ship a fix, move the item to [`update.md`](./update.md) under today's date and delete it here.
- When you discover a new issue, add it under the right severity heading with the file path(s) involved.
- Keep severities honest: **Critical = ship-stopping**, **High = pre-production blocker**, **Medium = scheduled cleanup**, **Low = nice-to-have**.
