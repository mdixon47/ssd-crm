# SSD Consulting CRM — Documentation

Supplementary documentation for the SSD Consulting CRM (Nuxt 3 + Supabase + Claude).
The repository root [`README.md`](../README.md) covers setup, deploy, and feature usage.
This folder records the code review and developer-facing notes.

---

## Code Review (2026-06-07)

### Issues found and resolved

| # | Severity | File | Issue | Resolution |
|---|----------|------|-------|------------|
| 1 | High | `server/utils/supabase.ts` | `@supabase/supabase-js` imported directly but only available transitively via `@nuxtjs/supabase` | Added explicit `^2.45.0` dependency in `package.json` |
| 2 | High | `server/api/leads/index.post.ts` | `let aiScore = null` narrows to `null` under `strict`, blocking later assignment of `LeadScore` | Declared as `LeadScore \| null` and exported the `LeadScore` type |
| 3 | High | `composables/useAI.ts` (`chat`) | On error, only the assistant placeholder was popped — the user message was orphaned; chat history slice could include empty placeholders, which the Anthropic API rejects | Filter history to non-empty, non-loading messages and pop both placeholder + user message on error |
| 4 | Medium | `pages/index.vue` | `totalSpend / totalLeads` and `revenue / spend` produced `NaN` / `Infinity` when denominators were 0 | Guarded all divisions; render `—` for empty CPL |
| 5 | Medium | `stores/leads.ts` (`fetchLeads`) | `leads.value = data` assigned `undefined` when the API returned no payload | Falls back to `[]` on both success and error paths |
| 6 | Medium | `agents/CampaignOptimizerAgent.ts`, `agents/WeeklyAuditAgent.ts` | Unbounded `while (true)` agentic loops with no max-iteration safeguard | Added `MAX_ITERATIONS` cap (10 / 12) with graceful fallback output |
| 7 | Medium | `composables/useMCP.ts` (`listTools`) | Called non-existent `GET /api/mcp/:server/tools` — always 404 | Removed the dead function (not used anywhere) |
| 8 | Low  | `server/utils/anthropic.ts` | Read `process.env.ANTHROPIC_API_KEY` directly instead of `useRuntimeConfig()` | Reads `useRuntimeConfig().anthropicApiKey` first, env as fallback |

### Issues noted (not changed)

| File | Note |
|------|------|
| `server/api/mcp/[server].post.ts` | Uses `@ts-expect-error` to read the SDK's internal `_registeredTools`. This is brittle; a future SDK upgrade may break it. Long-term we should use `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`. |
| `server/api/leads/index.post.ts` | No email-format validation. Lightweight to add but deferred to avoid scope creep. |
| All agents | Model identifiers (`claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) are hard-coded strings. Recommend centralising in `server/utils/anthropic.ts` so model upgrades require one change. |
| `nuxt.config.ts` | `typescript.typeCheck` is `false`. Re-enable once the team is ready for `nuxi typecheck` in CI. |

---

## Architecture Notes

### Request flow

```
Browser (Vue/Pinia)
   │
   ├──▶ useAI() / useMCP()          // composables
   │       │
   │       └──▶ $fetch('/api/ai/*')
   │                │
   │                └──▶ Nitro handler
   │                       │
   │                       ├──▶ Anthropic SDK  (server/utils/anthropic.ts)
   │                       ├──▶ Supabase       (server/utils/supabase.ts)
   │                       └──▶ MCP server     (server/mcp/*)
   │
   └──▶ useLeadsStore() ──▶ $fetch('/api/leads/*') ──▶ Supabase
```

### AI agents

All four agents live in `agents/` and are pure functions taking an `Anthropic` client plus typed inputs. They never touch the database directly. The corresponding HTTP handlers in `server/api/ai/*` are the only places that combine Supabase reads with agent execution.

| Agent | Loop type | Model |
|-------|-----------|-------|
| `CampaignOptimizerAgent` | Tool-use loop (max 10) | `claude-opus-4-6` |
| `WeeklyAuditAgent` | Tool-use loop (max 12) | `claude-opus-4-6` → `claude-sonnet-4-6` for JSON |
| `EmailStrategistAgent` | Tool-use loop (max 10) | `claude-opus-4-6` → `claude-sonnet-4-6` for JSON |
| `SocialMediaAgent` | Tool-use loop (max 8) | `claude-opus-4-6` → `claude-sonnet-4-6` for JSON |
| `EmailAgent` | Single call (per lead) | `claude-sonnet-4-6` |
| `SearchTermAgent` | Batched (20 terms/call) | `claude-sonnet-4-6` |
| `LeadScorerAgent` | Single call | `claude-haiku-4-5-20251001` |

For data-source swap-in (mock → live Google Ads / Meta / LinkedIn / Resend), see [`live-data.md`](./live-data.md).

### Safety invariants

1. **Read-only by default** — MCP servers expose data without write paths.
2. **`dry_run: true` defaults** — write tools (`add_negative_keywords`, `upload_offline_conversions`) require explicit `dry_run: false` plus human confirmation.
3. **No client-side secrets** — `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_KEY` are only declared in `runtimeConfig` (server-only).

---

## Local development checklist

```bash
# 1. Install dependencies
npm install

# 2. Configure env
cp .env.example .env
# fill in ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY

# 3. Run database migration
# Open Supabase SQL editor and paste supabase/migrations/001_initial.sql

# 4. Start dev server
npm run dev

# 5. Lint + typecheck before commit
npm run lint
npm run typecheck
```

---

## Suggested follow-ups

- [ ] Replace MCP HTTP adapter (`server/api/mcp/[server].post.ts`) with `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk`.
- [ ] Centralise Claude model IDs into a single `MODELS` constant.
- [ ] Enable `typescript.typeCheck` in `nuxt.config.ts` and add `npm run typecheck` to CI.
- [ ] Migrate `server/api/leads/*` to `serverSupabaseServiceRole` from `#supabase/server` (idiomatic Nuxt module API).
- [ ] Add Zod input validation to `POST /api/leads` (currently only checks presence).
- [ ] Add Row Level Security policies before exposing the app to multiple users (template is commented out at the bottom of `001_initial.sql`).
- [ ] Add unit tests for the agent JSON-parse fallbacks and the leads store.
