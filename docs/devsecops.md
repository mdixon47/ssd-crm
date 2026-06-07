# DevSecOps

This document describes the security and CI/CD posture of the SSD Consulting CRM.

## Overview

```
┌────────────┐   PR / push     ┌─────────────────────────────────┐
│ Developer  │ ──────────────▶ │ GitHub Actions                   │
└────────────┘                  │                                  │
                                │ ci.yml         security.yml     │
                                │ ├ lint         ├ CodeQL         │
                                │ ├ typecheck    ├ gitleaks       │
                                │ └ build        ├ dependency-review│
                                │                └ npm audit       │
                                └─────────────────────────────────┘
                                                │
                                                ▼
                                        merge to main → Vercel deploy
```

---

## Pipelines

### `.github/workflows/ci.yml`
Runs on every PR and every push to `main`.

| Job | Tool | Fails on |
|-----|------|----------|
| Lint | `eslint` (via `npm run lint`) | any error |
| Typecheck | `nuxt typecheck` | any error |
| Build | `nuxt build` | build failure |

Build uses placeholder env vars so it can complete without leaking real secrets to CI logs.

### `.github/workflows/security.yml`
Runs on every PR, every push to `main`, and weekly (Mon 06:00 UTC).

| Job | Scanner | Fails on |
|-----|---------|----------|
| CodeQL | `github/codeql-action` (JS/TS, `security-and-quality`) | findings (uploaded to Security tab) |
| Gitleaks | `gitleaks/gitleaks-action` | any committed secret |
| Dependency review | `actions/dependency-review-action` (PR only) | new dep ≥ high severity CVE |
| npm audit | `npm audit --audit-level=high --production` | any high/critical advisory in prod deps |

### `.github/dependabot.yml`
Weekly updates, grouped by ecosystem (`nuxt`, `vue`, `ai-stack`, `supabase`, `dev-tooling`). Major Nuxt upgrades are ignored — bump manually.

---

## Runtime hardening

### Security headers
Applied globally via `nitro.routeRules['/**'].headers` in `nuxt.config.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS for 1 year |
| `Content-Security-Policy` | strict allowlist (self + Supabase + Anthropic) | Limit script / connect sources |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Block MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Strip referrer to cross-site |
| `Permissions-Policy` | camera/mic/geo disabled | Reduce attack surface |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | Block cross-origin embeds |

**If you add a third-party API**, update `connect-src` in the CSP.

### Input validation
`POST /api/leads` uses a Zod schema (`LeadInsertSchema`) that enforces:
- Trimmed strings with explicit max lengths
- Valid email format
- Enum membership for `stage`, `source`, `qualified`
- Non-negative bounded numeric for `revenue`
- ISO date format for `lead_date`

Validation failures return HTTP 400 with a structured `issues` field — no stack traces leaked.

### Secrets management
- Stored in `runtimeConfig` (`nuxt.config.ts`) — server-only.
- Loaded from environment variables (`.env` locally, Vercel Environment Variables in production).
- `.env` is excluded by `.gitignore`. Gitleaks enforces this in CI.

### AI / MCP safety contract
1. All MCP read tools are unauthenticated only by virtue of running server-side; consider adding auth before exposing publicly.
2. MCP write tools (`add_negative_keywords`, `upload_offline_conversions`) default to `dry_run: true`.
3. Agent system prompts explicitly forbid auto-executing changes.

---

## Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Leaked secrets in git history | Gitleaks (CI), `.gitignore`, Dependabot, secret rotation runbook |
| Vulnerable dependencies | Dependabot weekly + `npm audit` job + Dependency Review on PRs |
| Code-level vulnerabilities | CodeQL (`security-and-quality` query set) |
| Cross-site scripting | Strict CSP, Vue auto-escaping, `v-html` only on AI panel formatting (controlled subset) |
| Clickjacking | `X-Frame-Options: DENY`, CSP `frame-ancestors 'none'` |
| Injection on `/api/leads` | Zod schema with allowlisted enums and length caps |
| Supabase data exposure | RLS (currently disabled — must enable before multi-tenant prod) |
| Prompt injection in lead notes | Notes flow through agent prompts; agents are read-only by contract |

---

## Local commands

```bash
# Lint
npm run lint

# Typecheck
npm run typecheck

# Manual secret scan (requires `gitleaks` installed locally)
gitleaks detect --source . --redact

# Manual vulnerability scan
npm audit --audit-level=high --production
```

---

## Outstanding follow-ups

- [ ] Enable Supabase Row Level Security (template commented in `supabase/migrations/001_initial.sql`)
- [ ] Add husky + lint-staged pre-commit hooks (requires `git init`)
- [ ] Add `CODEOWNERS` once the team is defined
- [ ] Add per-IP rate limiting on `/api/leads` and `/api/ai/*` (Vercel Edge Config or Upstash)
- [ ] Add authentication on `/api/mcp/*` before any non-internal exposure
- [ ] Add Zod validation to `PATCH /api/leads/[id]` and the remaining AI endpoints
- [ ] Wire a SARIF upload from `npm audit` for centralised dashboarding
