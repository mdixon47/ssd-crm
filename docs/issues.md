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

### 5. Pre-existing TypeScript errors block `nuxt typecheck`
`npm run typecheck` reports 40+ errors across `agents/CampaignOptimizerAgent.ts`, `components/leads/LeadModal.vue`, `pages/campaigns/index.vue`, `pages/leads/add.vue`, `pages/negative-keywords/index.vue`, and elsewhere. Categories:
- Hand-written types diverging from `types/index.ts` (e.g. `NegativeKeyword` missing `status`, `match_type`, `campaign`, `reason` while pages still reference them).
- `LeadScore` payloads using `tier` / `recommended_next_step` / `estimated_deal_value` fields not on the interface.
- `LeadInsert` rejecting `qualified: string` because the type expects `QualifiedStatus`.

**Mitigation in place**: the CI `typecheck` job has `continue-on-error: true` so it runs and reports without blocking. The `build` job no longer depends on it.

**Exit criteria**: drive type errors to 0, then drop `continue-on-error` and re-add `typecheck` to `build.needs` in `.github/workflows/ci.yml`.

---

## 🟡 Medium — improvement work

### 6. Nuxt 3.21.7 vite-node socket regression (workaround in place)
`@nuxt/vite-builder` 3.21.7 nests the IPC Unix socket in an extra `mkdtemp` directory, pushing the path past macOS's 104-byte `sockaddr_un.sun_path` limit.

- **Workaround applied:** `scripts.dev` in `package.json` is `TMPDIR=/tmp nuxt dev`.
- **Upstream:** nuxt/nuxt#35253, #35258, #35264.
- **Action when fixed:** once `@nuxt/vite-builder >= 3.21.8` is published on the `3x` tag (Dependabot will PR it), revert the script back to `"nuxt dev"`.
- **Windows users:** inline `TMPDIR=...` won't work in `cmd`; switch to `cross-env` if needed.

### 7. Hard-coded Claude model identifiers
Model IDs (`claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) are duplicated across `agents/*.ts`. Centralise into a single `MODELS` constant in `server/utils/anthropic.ts` so future upgrades require one edit.

### 8. `typescript.typeCheck` disabled
`nuxt.config.ts` has `typescript.typeCheck: false`. The strict-mode issues from the code review are resolved, so this can be flipped back to `true` once `npm run typecheck` is green locally. CI already runs typecheck in a separate job.

### 9. Zod validation not yet applied to remaining endpoints
Only `POST /api/leads` uses a Zod schema. Apply equivalent schemas to:
- `PATCH /api/leads/[id]`
- `POST /api/ai/chat`, `POST /api/ai/optimize-campaign`, `POST /api/ai/label-search-terms`, `POST /api/ai/weekly-audit`

### 10. No per-IP rate limiting
`/api/leads` and `/api/ai/*` are uncapped. Add IP-based throttling once the host is chosen (Vercel Edge Config or Upstash Ratelimit are the obvious candidates).

---

## ⚪ Low — nice to have

### 11. Husky pre-commit hooks not configured
Now that `git init` has been performed, this is unblocked. After installing:
```bash
npm install -D husky lint-staged
npx husky init
# add: npm run lint
```

### 12. `CODEOWNERS` not created
Requires team GitHub handles. Add `/.github/CODEOWNERS` once roles are defined.

### 13. SARIF upload from `npm audit`
The current `npm audit` CI job fails the build but doesn't write findings to the Security tab. Convert output to SARIF for a centralised view.

### ~~14. Duplicate lockfiles (`yarn.lock` + `package-lock.json`)~~ — **resolved 2026-06-07**
`yarn.lock` removed. See [`update.md`](./update.md).

### 14b. CI deletes `package-lock.json` before installing
Workaround for [npm/cli#4828](https://github.com/npm/cli/issues/4828): `package-lock.json` generated on macOS-arm64 doesn't record Linux-x64 native bindings for `oxc-parser` (a Nuxt transitive dep). Both `npm ci` and `npm install` fail on Ubuntu runners with `Cannot find module '@oxc-parser/binding-linux-x64-gnu'` because even `npm install` honours the recorded `optionalDependencies` set in the lockfile and skips re-resolving the missing platform binding.

**Current workaround** (in `.github/workflows/ci.yml` + `security.yml`): `rm -f package-lock.json && npm install --no-audit --no-fund`. Forces npm to re-resolve from `package.json` on the Linux runner.

**Trade-off**: CI loses strict lockfile reproducibility. Acceptable for now since `package-lock.json` is still committed for local-dev parity and `package.json` pins direct deps.

**Permanent fix options**:
- Regenerate `package-lock.json` on Linux (one-off bot workflow that commits it back).
- Adopt pnpm or yarn4 (both handle cross-platform optional deps correctly).
- Wait for npm to ship a real fix to the upstream issue.

### 14c. `Dependency review` job is non-blocking until GHAS is enabled
The `actions/dependency-review-action@v5` requires GitHub Advanced Security on private repos. The job runs with `continue-on-error: true` so CI doesn't gate on a feature flag we may not own. Enable GHAS in *Settings → Security → Code security* to make this actionable.

### 14d. `CodeQL` job is non-blocking until Code scanning is enabled
The CodeQL upload step needs *Code scanning* turned on in repo settings (*Settings → Code security and analysis → Code scanning*). Until that toggle is on, the analyze step 403s. Currently `continue-on-error: true`. Once Code scanning is enabled, drop that flag so findings can gate merges.

### 15. No unit tests
No test framework is wired up. Recommended scope for a first pass:
- `LeadInsertSchema` happy path + each rejection branch.
- `runCampaignOptimizerAgent` / `runWeeklyAuditAgent` fallback when `MAX_ITERATIONS` is reached.
- `stores/leads.ts` defensive `?? []` paths.
- `pages/index.vue` KPI computations with empty / zero-denominator data.

### 16. `punycode` deprecation warning on startup
`DEP0040: The punycode module is deprecated.` Emitted from a transitive dep (likely `whatwg-url`). Cosmetic — no action needed until Node removes the module.

---

## How to update this file

- When you ship a fix, move the item to [`update.md`](./update.md) under today's date and delete it here.
- When you discover a new issue, add it under the right severity heading with the file path(s) involved.
- Keep severities honest: **Critical = ship-stopping**, **High = pre-production blocker**, **Medium = scheduled cleanup**, **Low = nice-to-have**.
