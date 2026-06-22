# Known Issues & Follow-ups

Active issues, deferred work, and known limitations.
See [`update.md`](./update.md) for what has already shipped.

Severity: **🔴 Critical** · **🟡 Medium** · **⚪ Low**

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

### 19. `marketing/video/` (Remotion) — code review 2026-06-22
High-effort review of the new Remotion marketing-video project. `tsc --noEmit` is clean and all 8 compositions render. The following were found **and fixed** this session (kept here briefly for traceability; remove once confirmed in CI):

| # | Severity | Issue | Fix |
|---|---|---|---|
| a | 🟡 | `loadFont()` called with no args fetched **all** Inter weights/subsets/styles (~100+ files; "too many requests" warning) and is a hard error in Remotion v5 | Centralized in `src/font.ts` with `loadFont("normal", { weights: ["500".."900"], subsets: ["latin"] })`; warning gone |
| b | 🟡 | `Scene.tsx` fade `interpolate` range becomes non-monotonic for any scene ≤ `2*fade` frames → `interpolate()` throws | Clamp `fade` to `< durationInFrames/2` |
| c | ⚪ | `still` thumbnail rendered at frame 420 = the Proof scene, foregrounding the **placeholder metrics** the docs warn never to publish | Moved to frame 540 (CTA/logo) |
| d | ⚪ | CTA button markup duplicated verbatim in `scenes/CTA.tsx` and `AdCut.tsx` | Extracted `components/CtaButton.tsx` |
| e | ⚪ | `HOOK_VARIANTS` "A-Pain" duplicated `DEFAULT_HOOK` → A/B control could silently drift from the live hero ad | A-Pain now references `DEFAULT_HOOK` |
| f | ⚪ | `FPS`/`sec()` redeclared in `Root.tsx`/`HeroAd.tsx`/`AdCut.tsx` (drift risk) | Single source in `theme.ts` |
| g | ⚪ | `Background.tsx` SVG `<pattern id="grid">` used a document-global id (collision if two Backgrounds mount) | `useId()`-based id |
| h | ⚪ | Partial `hook` prop override could blank the headline (default-param only fired on fully-undefined) | Per-field merge with `DEFAULT_HOOK` in `Hook.tsx` |
| i | ⚪ | `Scene.tsx` imported `useVideoConfig` in a second redundant `import` | Merged imports |
| j | ⚪ | README "Structure" still claimed 3 compositions (now 8) | Updated |

**Still open (deferred, low):** `marketing/video/package.json` has no `engines` field pinning Node (the root app does); `theme.ts` `fontFamilyHeading`/`fontFamilyBody` are identical strings — collapse to one token if heading/body never diverge.

---

## How to update this file

- When you ship a fix, move the item to [`update.md`](./update.md) under today's date and delete it here.
- When you discover a new issue, add it under the right severity heading with the file path(s) involved.
- Keep severities honest: **Critical = ship-stopping**, **Medium = scheduled cleanup**, **Low = nice-to-have**.
