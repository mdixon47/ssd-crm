# Known Issues & Follow-ups

Active issues, deferred work, and known limitations.
See [`update.md`](./update.md) for what has already shipped.

Severity: **🔴 Critical** · **🟡 Medium** · **⚪ Low**

---

## 🔴 Critical — needs action now

### 1. Rotate keys exposed to chat transcript / working tree
Keys handed to the agent through chat (or pasted into a working-tree file) are recorded in a log surface that cannot be edited retroactively. None reached a committed file (they live only in `.env`, gitignored), but the leaked strings stay readable in the transcript until each key is invalidated upstream.

| Key | Status | Where to rotate |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Rotated 2026-06-23 | https://console.anthropic.com/settings/keys |
| `SUPABASE_SERVICE_KEY` | ⏳ Pending | https://app.supabase.com/project/ngjpdngzhrwhxxduwmlx/settings/api-keys |
| `SUPABASE_KEY` (publishable) | Low — browser-exposed by design | Same Supabase API page |

After rotation, paste new values directly into `.env` (not through chat), update the matching **Netlify** env var, and restart `npm run dev`.

> 2026-06-23: a live `ANTHROPIC_API_KEY` was briefly pasted into the working-tree `.env.example` (never committed); scrubbed to a placeholder in `a5f5380` and the key rotated. The GA4 service-account key + its `~/Downloads/*.json` were used this session — rotate that key too if you consider the file exposed (it currently lives in `.env` + Netlify, both fine).

---

## 🟡 Medium — improvement work

### 9b. `typescript.typeCheck` disabled in nuxt.config.ts — intentional trade-off
`typeCheck: true` was briefly enabled (2026-06-12) but had to be reverted to `false` because `vue-tsc` runs concurrently with the Vite build under the same Node process, nearly doubling peak heap usage. The Netlify build container hit the 4 GB heap ceiling even after raising `NODE_OPTIONS=--max-old-space-size=4096`.

**Current state:** `nuxt.config.ts` has `typeCheck: false`. Type correctness is still enforced — the GitHub Actions CI `typecheck` job (`npm run typecheck`, which has its own `--max-old-space-size=8192` budget) gates every merge. The deploy build is type-check-free for memory reasons only.

**To re-enable in future:** either split the build into two separate steps in the netlify.toml (`npx nuxt typecheck && npx nuxt prepare && npm run build`) each with their own Node process, or upgrade to a Netlify build container with more RAM.

### 10. Nuxt 3.21.7 vite-node socket regression (workaround in place)
`@nuxt/vite-builder` 3.21.7 nests the IPC Unix socket in an extra `mkdtemp` directory, pushing the path past macOS's 104-byte `sockaddr_un.sun_path` limit.

- **Workaround applied:** `scripts.dev` in `package.json` is `TMPDIR=/tmp nuxt dev`. Still required — Nuxt remains on 3.21.7.
- **Upstream:** nuxt/nuxt#35253, #35258, #35264.
- **Action when fixed:** once Dependabot raises a Nuxt/vite-builder PR that bumps to ≥ 3.21.8, revert `package.json` dev script back to `"nuxt dev"` and delete this issue.
- **Windows users:** inline `TMPDIR=...` won't work in `cmd`; switch to `cross-env` if needed.

### 14. No per-IP rate limiting
`/api/leads`, `/api/ai/*`, and `/api/a2a/*` are uncapped. In-memory rate limiting is not viable for serverless (each invocation is a fresh process). Requires **Upstash Ratelimit** (`@upstash/ratelimit` + `@upstash/redis`) — set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, add a Nitro plugin that wraps AI and A2A routes. See `improvement.md` I-11. Deferred until Upstash is provisioned.

### 22. Content Hub: "Publish" button is manual only (no platform API integration)
Clicking "Mark Published" records the status change in the DB but does not push to LinkedIn, Facebook, Instagram, or email. Real integrations require OAuth app credentials:

| Platform | Credential needed |
|---|---|
| LinkedIn | `LINKEDIN_ACCESS_TOKEN` (already in `.env.example`) |
| Facebook / Instagram | `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID` |
| Email | `RESEND_API_KEY` (already set) + recipient list from leads |

Implementation path: `server/api/content/[id]/publish.post.ts` — reads platform, dispatches to per-platform handler, stores `external_id` in `performance` JSONB. See `improvement.md` I-02. Blocked on OAuth credential setup.

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

### 15d. `CodeQL` job is non-blocking until Code scanning is enabled
The CodeQL upload step needs *Code scanning* turned on in repo settings (*Settings → Code security and analysis → Code scanning*). Until that toggle is on, the analyze step 403s. Currently `continue-on-error: true`. Once Code scanning is enabled, drop that flag so findings can gate merges.

### 17. `punycode` deprecation warning on startup
`DEP0040: The punycode module is deprecated.` Emitted from a transitive dep (likely `whatwg-url`). Cosmetic — no action needed until Node removes the module.

### 18. zod v4 upgrade — eligible to attempt
The 2026-06-08 baseline-fix unblocks v4 evaluation. Source-level migration is required, not just a version bump: `z.string().email()` → `z.email()` (5 sites), `z.string().uuid()` → `z.uuid()` (1 site), and any reader of `ZodError.errors` must move to `.issues`. Affected files: `server/api/{email/draft,email/send,leads/index,ai/email-strategy,ai/social-strategy}.post.ts` and `server/mcp/*/index.ts`. **Exit criteria**: unignore via Dependabot or bump locally, apply renames, run `npm run typecheck` + `npm run build`, decide whether to keep the `overrides.zod` pin (the MCP SDK ships v4 natively, so the override likely becomes unnecessary).

### 19. `marketing/video/` (Remotion) — deferred low items
The 2026-06-22 code-review fixes shipped and are CI-green (see [`update.md`](./update.md), 2026-06-22). Remaining deferred:
- `marketing/video/package.json` has no `engines` field pinning Node (the root app does).
- `theme.ts` `fontFamilyHeading`/`fontFamilyBody` are identical strings — collapse to one token if heading/body never diverge.

### 25. GA4: no key events marked as conversions
The GA4 integration is live and verified, but live data returns `conversions: 0` because no events are marked as **key events** (conversions) in the property. The conversions sections of `/analytics` and the `get_website_analytics` data fed to `WeeklyAuditAgent` stay empty until this is configured. Fix in **GA4 Admin → Events** — mark events such as `generate_lead` / `book_consultation` as key events. (Also seen in live data: an occasional `/?auth_error=invalid_state` landing path, suggesting a rare OAuth redirect hiccup on the site — unrelated to GA, worth a glance.)

---

## How to update this file

- When you ship a fix, move the item to [`update.md`](./update.md) under today's date and delete it here.
- When you discover a new issue, add it under the right severity heading with the file path(s) involved.
- Keep severities honest: **Critical = ship-stopping**, **Medium = scheduled cleanup**, **Low = nice-to-have**.
