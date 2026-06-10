-- ============================================================
-- SSD Consulting CRM — Enable Row Level Security
-- Run in: https://app.supabase.com/project/_/sql
-- Or via Supabase CLI: supabase db push
-- ============================================================
--
-- Context
-- -------
-- The app is single-tenant, single-role: any authenticated user
-- gets full CRUD on every CRM table. Users are created in the
-- Supabase dashboard (closed sign-up), so "authenticated" is the
-- effective access list.
--
-- Service-role still bypasses RLS by design — the server-side
-- agent/MCP/AI paths in server/api/** continue to use the
-- service-role client (server/utils/supabase.ts) and remain
-- unaffected. The API itself is already gated by
-- server/middleware/auth.ts (401 without a Supabase session), so
-- a defense-in-depth layer at the DB only matters once read
-- paths migrate to per-user JWT clients (tracked in issues.md #2).

-- ------------------------------------------------------------
-- Enable RLS on every CRM table
-- ------------------------------------------------------------
alter table leads              enable row level security;
alter table search_terms       enable row level security;
alter table negative_keywords  enable row level security;
alter table audit_sessions     enable row level security;
alter table email_messages     enable row level security;

-- ------------------------------------------------------------
-- Policies — any authenticated user, full CRUD
-- ------------------------------------------------------------
-- Drop first so this migration is idempotent if re-applied.
drop policy if exists "authenticated_all" on leads;
create policy "authenticated_all" on leads
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all" on search_terms;
create policy "authenticated_all" on search_terms
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all" on negative_keywords;
create policy "authenticated_all" on negative_keywords
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all" on audit_sessions;
create policy "authenticated_all" on audit_sessions
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all" on email_messages;
create policy "authenticated_all" on email_messages
  for all
  to authenticated
  using (true)
  with check (true);

-- ------------------------------------------------------------
-- Verification queries (informational — run manually after apply)
-- ------------------------------------------------------------
-- select tablename, rowsecurity
--   from pg_tables
--  where schemaname = 'public'
--    and tablename in ('leads','search_terms','negative_keywords','audit_sessions','email_messages');
--
-- select schemaname, tablename, policyname, roles, cmd
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('leads','search_terms','negative_keywords','audit_sessions','email_messages');
