---
name: verify
description: Build/launch/drive recipe for verifying changes to the SSD CRM (Nuxt 3 + Supabase) at runtime.
---

# Verifying SSD CRM changes at runtime

## Launch

```bash
npm run dev          # port 3000, ~15s cold / ~2s warm (.nuxt cached)
```

`.env` at the repo root is real (Supabase live project). Integrations degrade
to mock/unconfigured when their env keys are unset.

## Auth handle (all /api/** routes 401 without a Supabase session)

Create a throwaway user via the Supabase admin API and forge the
`sb-<ref>-auth-token` cookie (`base64-` + base64url(session JSON); chunk into
`.0`/`.1` cookies above ~3180 chars). Working script pattern: create user via
`POST {SUPABASE_URL}/auth/v1/admin/users` (service key, `email_confirm: true`,
422 = already exists), sign in via `POST /auth/v1/token?grant_type=password`
(anon key), emit cookie. **Delete the user afterward** via
`DELETE /auth/v1/admin/users/{id}`.

Then: `curl -H "Cookie: $COOKIE" http://localhost:3000/api/...`

## Gotchas

- Dev-mode error responses include stack traces; production strips them.
- SSR HTML of a page (e.g. `/leads`) is fetchable with the same cookie —
  grep it to confirm a component renders. No Playwright in this repo.
- DDL against the live DB: Supabase management API
  `POST https://api.supabase.com/v1/projects/{ref}/database/query` with
  `SUPABASE_MGMT_TOKEN` (in .env). Migrations in `supabase/migrations/` are
  otherwise applied by hand in the SQL editor.
- Kill the dev server by port: `kill $(lsof -ti :3000)`.
