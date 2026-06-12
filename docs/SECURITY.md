# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in this project, **please do not open a public GitHub issue.**

Instead, report it privately via either:

1. GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) (preferred — opens a draft advisory on this repository), or
2. Email the maintainers at **security@ssdconsulting.example** (replace with your team's address).

When reporting, please include:

- A clear description of the issue and its impact
- Steps to reproduce
- Affected versions / commit SHAs
- Any proof-of-concept code (in a private gist, not inline)

We will acknowledge your report within **3 business days** and provide a remediation timeline within **10 business days**.

---

## Supported versions

| Version | Supported |
|---------|-----------|
| `main`  | ✅ |
| tagged releases ≥ 1.0.0 | ✅ |
| older   | ❌ |

---

## Scope

In scope:

- The Nuxt 3 application (this repository)
- The Supabase schema in `supabase/migrations/`
- The MCP server implementations in `server/mcp/`
- AI agents under `agents/`

Out of scope (report to the relevant vendor):

- Supabase platform vulnerabilities → [Supabase security](https://supabase.com/.well-known/security.txt)
- Anthropic API vulnerabilities → [Anthropic trust center](https://trust.anthropic.com)
- Vercel platform vulnerabilities → [Vercel security](https://vercel.com/security)

---

## Safe-harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to comply with this policy
- Do not access, modify, or delete data belonging to others
- Do not perform denial-of-service or social-engineering attacks
- Give us reasonable time to remediate before public disclosure (90 days minimum)

---

## Known security expectations

- **Secrets** — `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_KEY`, and ad-platform tokens are server-only via `runtimeConfig` in `nuxt.config.ts`. They must never be referenced from `app.vue`, `pages/`, `components/`, or `composables/`.
- **AI agents** — All agents are read-only by contract. Write-capable MCP tools (`add_negative_keywords`, `upload_offline_conversions`) default to `dry_run: true` and require explicit human approval.
- **Row Level Security** — Currently commented out in `supabase/migrations/001_initial.sql`. **Must be enabled before multi-tenant production use.**
- **Input validation** — All public API routes should validate input with Zod before touching the database.
