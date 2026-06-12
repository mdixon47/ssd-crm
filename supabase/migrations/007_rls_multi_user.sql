-- ============================================================
-- SSD Consulting CRM — Multi-User RLS Hardening
-- ============================================================
--
-- Context
-- -------
-- Migration 003 enables RLS with a single "authenticated_all"
-- policy (any authenticated user has full CRUD). That is correct
-- for a single-seat deployment but needs hardening before the CRM
-- is used by multiple team members simultaneously:
--
--   1. Every CRM row gains a created_by column that records which
--      auth user created it (auto-set via DEFAULT auth.uid()).
--
--   2. SELECT and UPDATE remain open to all authenticated users
--      (shared-team CRM: everyone can view and edit all leads).
--
--   3. INSERT requires the caller to be the row owner (enforced by
--      the DEFAULT + WITH CHECK). Service-role bypasses this.
--
--   4. DELETE is restricted to the row's owner OR any admin_user
--      to prevent accidental bulk deletes by non-owners.
--
-- Service-role (server/api/** paths) continues to bypass RLS.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Add created_by to all core CRM tables
--    Nullable for existing rows (backfill not critical for a CRM).
--    New rows default to the calling auth.uid().
-- ------------------------------------------------------------
alter table leads              add column if not exists created_by uuid references auth.users(id) default auth.uid();
alter table search_terms       add column if not exists created_by uuid references auth.users(id) default auth.uid();
alter table negative_keywords  add column if not exists created_by uuid references auth.users(id) default auth.uid();
alter table audit_sessions     add column if not exists created_by uuid references auth.users(id) default auth.uid();
alter table email_messages     add column if not exists created_by uuid references auth.users(id) default auth.uid();

-- Index for ownership lookups
create index if not exists leads_created_by_idx             on leads             (created_by);
create index if not exists search_terms_created_by_idx      on search_terms      (created_by);
create index if not exists negative_keywords_created_by_idx on negative_keywords (created_by);
create index if not exists audit_sessions_created_by_idx    on audit_sessions    (created_by);
create index if not exists email_messages_created_by_idx    on email_messages    (created_by);

-- ------------------------------------------------------------
-- 2. Replace blanket authenticated_all policies with granular ones
-- ------------------------------------------------------------

-- ── leads ────────────────────────────────────────────────────
drop policy if exists "authenticated_all"    on leads;
drop policy if exists "leads_select"         on leads;
drop policy if exists "leads_insert"         on leads;
drop policy if exists "leads_update"         on leads;
drop policy if exists "leads_delete"         on leads;

create policy "leads_select" on leads
  for select to authenticated using (true);

create policy "leads_insert" on leads
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "leads_update" on leads
  for update to authenticated
  using (true) with check (true);

create policy "leads_delete" on leads
  for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from admin_users where id = auth.uid())
  );

-- ── search_terms ─────────────────────────────────────────────
drop policy if exists "authenticated_all"       on search_terms;
drop policy if exists "search_terms_select"     on search_terms;
drop policy if exists "search_terms_insert"     on search_terms;
drop policy if exists "search_terms_update"     on search_terms;
drop policy if exists "search_terms_delete"     on search_terms;

create policy "search_terms_select" on search_terms
  for select to authenticated using (true);

create policy "search_terms_insert" on search_terms
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "search_terms_update" on search_terms
  for update to authenticated
  using (true) with check (true);

create policy "search_terms_delete" on search_terms
  for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from admin_users where id = auth.uid())
  );

-- ── negative_keywords ────────────────────────────────────────
drop policy if exists "authenticated_all"            on negative_keywords;
drop policy if exists "negative_keywords_select"     on negative_keywords;
drop policy if exists "negative_keywords_insert"     on negative_keywords;
drop policy if exists "negative_keywords_update"     on negative_keywords;
drop policy if exists "negative_keywords_delete"     on negative_keywords;

create policy "negative_keywords_select" on negative_keywords
  for select to authenticated using (true);

create policy "negative_keywords_insert" on negative_keywords
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "negative_keywords_update" on negative_keywords
  for update to authenticated
  using (true) with check (true);

create policy "negative_keywords_delete" on negative_keywords
  for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from admin_users where id = auth.uid())
  );

-- ── audit_sessions ───────────────────────────────────────────
drop policy if exists "authenticated_all"          on audit_sessions;
drop policy if exists "audit_sessions_select"      on audit_sessions;
drop policy if exists "audit_sessions_insert"      on audit_sessions;
drop policy if exists "audit_sessions_update"      on audit_sessions;
drop policy if exists "audit_sessions_delete"      on audit_sessions;

create policy "audit_sessions_select" on audit_sessions
  for select to authenticated using (true);

create policy "audit_sessions_insert" on audit_sessions
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "audit_sessions_update" on audit_sessions
  for update to authenticated
  using (true) with check (true);

create policy "audit_sessions_delete" on audit_sessions
  for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from admin_users where id = auth.uid())
  );

-- ── email_messages ───────────────────────────────────────────
drop policy if exists "authenticated_all"           on email_messages;
drop policy if exists "email_messages_select"       on email_messages;
drop policy if exists "email_messages_insert"       on email_messages;
drop policy if exists "email_messages_update"       on email_messages;
drop policy if exists "email_messages_delete"       on email_messages;

create policy "email_messages_select" on email_messages
  for select to authenticated using (true);

create policy "email_messages_insert" on email_messages
  for insert to authenticated
  with check (created_by = auth.uid());

create policy "email_messages_update" on email_messages
  for update to authenticated
  using (true) with check (true);

create policy "email_messages_delete" on email_messages
  for delete to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from admin_users where id = auth.uid())
  );

-- ------------------------------------------------------------
-- Verification (run manually after applying)
-- ------------------------------------------------------------
-- select tablename, policyname, cmd, roles
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('leads','search_terms','negative_keywords','audit_sessions','email_messages')
--  order by tablename, cmd;
