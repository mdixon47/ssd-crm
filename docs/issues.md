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

### 2. Supabase Row Level Security — migrations written, not yet applied
Migrations `003_enable_rls.sql` (blanket `authenticated_all` policies), `004_lead_assignee.sql` (assignee column), `005_admin_users.sql`, `006_profiles.sql`, and `007_rls_multi_user.sql` (2026-06-12 — adds `created_by` tracking + granular per-operation policies for multi-user deployment) are all checked in but **have not been applied** to the live project. Apply via the Supabase dashboard SQL editor or `supabase db push` in numeric order (003 → 004 → 005 → 006 → 007).

`007_rls_multi_user.sql` adds `created_by uuid references auth.users(id) default auth.uid()` to all five core tables and replaces each `authenticated_all` policy with four operation-specific policies: SELECT + UPDATE open to all authenticated users (shared-team CRM), INSERT enforced to `created_by = auth.uid()`, DELETE restricted to the row owner or any `admin_users` member.

After the migrations are applied, server-side paths keep working unchanged — `server/utils/supabase.ts` returns a service-role client that bypasses RLS. The defense-in-depth follow-up is migrating read paths in `server/api/**` from the service-role client to `serverSupabaseClient(event)` (per-user JWT, RLS-enforced). Writes that intentionally cross users (system jobs, scheduled audits) can keep the service-role path.

### 3. ~~MCP HTTP adapter uses private SDK internals~~ — RESOLVED 2026-06-12
`server/api/mcp/[server].post.ts` previously read `_registeredTools` behind a `@ts-expect-error`. Replaced with `WebStandardStreamableHTTPServerTransport` (stateless, `enableJsonResponse: true`) from `@modelcontextprotocol/sdk`. The route now speaks the official MCP JSON-RPC protocol. See `update.md` (2026-06-12).

### 4. ~~No authentication on `/api/mcp/*`~~ — RESOLVED 2026-06-10
The shared `server/middleware/auth.ts` now requires a valid Supabase session on every `/api/**` route, including `/api/mcp/[server]`. Remaining external-access work is tracked under #2 (RLS) and #3 (replace private SDK internals).

### 5. Pre-existing TypeScript errors block `nuxt typecheck` — **RESOLVED 2026-06-08**
`npm run typecheck` previously reported 56 errors across `agents/`, `components/leads/LeadModal.vue`, `pages/campaigns/`, `pages/leads/`, `pages/negative-keywords/`, `pages/search-terms/`, `pages/social/`, and `server/mcp/*`. Resolution summary:

1. **MCP SDK `tool()` → `registerTool()` migration** (`server/mcp/crm`, `google-ads`, `linkedin-ads`, `meta-ads`). The deprecated `tool()` overload had ambiguous resolution between `ToolAnnotations` and `ZodRawShapeCompat`, producing TS2589 "excessively deep" instantiation. `registerTool` uses an explicit config object that bypasses the problematic inference path.
2. **`zod` duplicate dedupe** — `@modelcontextprotocol/sdk@1.29.0` nests `zod@4.4.3` via `zod-to-json-schema`, while the project pins `zod@^3.24.2`. `npm dedupe` collapsed both to a single `zod@3.25.76`; `package.json` now declares `"overrides": { "zod": "$zod" }` to keep fresh installs deterministic.
3. **Type Drift between UI and DB schema** — `types/index.ts` extended so DB-only fields (`platform`, `week_date`) and UI-only fields (`match_type`, `reason`, `status`, `tier`, `recommended_next_step`, `estimated_deal_value`) coexist as optional supersets. `LeadScore`, `NegativeKeyword`, `SocialPost`, and `SearchTerm` updated accordingly.
4. **Narrow per-file null/enum fixes** — `agents/CampaignOptimizerAgent.ts` initialises `finalOutput` to a default-shaped object; `pages/leads/add.vue` casts `qualified` / `source` to enum types; `server/api/email/draft.post.ts` casts to `Partial<Lead>`; misc `?? 0` / `?? ''` guards in social pages.

**Final state**: `npx vue-tsc --noEmit` and `nuxt typecheck` both report 0 errors. `npm run lint` clean. `.github/workflows/ci.yml` `typecheck` job is now blocking (`continue-on-error` removed; `build.needs: [lint, typecheck]`).

---

## 🟡 Medium — improvement work

### 6. Nuxt 3.21.7 vite-node socket regression (workaround in place)
`@nuxt/vite-builder` 3.21.7 nests the IPC Unix socket in an extra `mkdtemp` directory, pushing the path past macOS's 104-byte `sockaddr_un.sun_path` limit.

- **Workaround applied:** `scripts.dev` in `package.json` is `TMPDIR=/tmp nuxt dev`.
- **Upstream:** nuxt/nuxt#35253, #35258, #35264.
- **Action when fixed:** once `@nuxt/vite-builder >= 3.21.8` is published on the `3x` tag (Dependabot will PR it), revert the script back to `"nuxt dev"`.
- **Windows users:** inline `TMPDIR=...` won't work in `cmd`; switch to `cross-env` if needed.

### 7. ~~Hard-coded Claude model identifiers~~ — RESOLVED 2026-06-12
Model IDs are now centralised in `lib/models.ts` (`CLAUDE_HAIKU`, `CLAUDE_SONNET`, `CLAUDE_OPUS`). All 8 agent files and `server/api/ai/chat.post.ts` import from there. See `update.md` (2026-06-12).

### 8. ~~`typescript.typeCheck` disabled~~ — RESOLVED 2026-06-12
`nuxt.config.ts` now has `typeCheck: true`. The CI `typecheck` job was already blocking — no workflow change needed. See `update.md` (2026-06-12).

### 9. ~~Zod validation not yet applied to remaining endpoints~~ — RESOLVED 2026-06-12
Zod schemas added to `POST /api/ai/chat`, `POST /api/ai/label-terms`, and `POST /api/ai/score-lead`. The remaining endpoints either had Zod before this session (`/api/leads`, `/api/leads/extract`, `/api/email/*`, `/api/ai/email-strategy`, `/api/ai/social-strategy`) or accept no body (`/api/ai/analyze-campaigns`, `/api/ai/weekly-audit`). `PATCH /api/leads/[id]` still uses an `allowedFields` allowlist without Zod — tracked separately if needed. See `update.md` (2026-06-12).

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

### 14b. `package-lock.json` is intentionally untracked
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

### 14c. `Dependency review` job removed (2026-06-08)
The `actions/dependency-review-action@v5` was removed from `security.yml`. Rationale: it required GitHub Advanced Security on private repos (paid), ran only on PR diffs, and its CVE coverage fully overlapped with the existing `npm audit` job which runs on every push and PR. Re-adding it is sensible only if GHAS is enabled and license-checking is added.

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

### 17. zod v4 upgrade — eligible to attempt (Dependabot PR #6 closed 2026-06-08)
The 2026-06-08 baseline-fix (see `update.md`) unblocks v4 evaluation. Source-level migration is required, not just a version bump: `z.string().email()` → `z.email()` (5 sites), `z.string().uuid()` → `z.uuid()` (1 site), and any reader of `ZodError.errors` must move to `.issues`. Affected files: `server/api/{email/draft,email/send,leads/index,ai/email-strategy,ai/social-strategy}.post.ts` and `server/mcp/*/index.ts`. **Exit criteria**: unignore via Dependabot or bump locally, apply renames, run `npm run typecheck` + `npm run build`, decide whether to keep the `overrides.zod` pin (the MCP SDK ships v4 natively, so the override likely becomes unnecessary).

### 19. Runtime smoke-test debt on the 2026-06-08 runtime-deps bundle
The atomic bump of `@anthropic-ai/sdk` 0.39 → 0.102 and `@nuxtjs/supabase` 1.6 → 2.0.9 was validated by `lint`, `vue-tsc --noEmit`, and `npm run build` only — no live API call, no booted Nuxt server. The type system shows clean, and the actual surface is narrow (`messages.create`, `Anthropic.Tool`, `MessageParam`, `ToolResultBlockParam`; no `useSupabaseUser`/`useSupabaseClient` callers anywhere), but type-clean is not runtime-clean. **Exit criteria** before treating this as fully shipped:
- Hit one Anthropic-backed agent end-to-end (`/api/ai/email-strategy` or the AI panel's "Plan Outreach") with a real key and confirm tool-call iteration completes.
- `TMPDIR=/tmp npm run dev` and confirm the `@nuxtjs/supabase` v2 module boots without console warnings (the v2 module changed how `redirect: false` is honored on the SSR path).
- If anything regresses, revert is a single commit; both packages also remain individually downgradeable.

---

## How to update this file

- When you ship a fix, move the item to [`update.md`](./update.md) under today's date and delete it here.
- When you discover a new issue, add it under the right severity heading with the file path(s) involved.
- Keep severities honest: **Critical = ship-stopping**, **High = pre-production blocker**, **Medium = scheduled cleanup**, **Low = nice-to-have**.
