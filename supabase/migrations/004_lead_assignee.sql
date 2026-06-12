-- ============================================================
-- SSD Consulting CRM — Lead assignee column
-- Run in: https://app.supabase.com/project/_/sql
-- Or via Supabase CLI: supabase db push
-- ============================================================
--
-- Adds free-text `assignee` to the leads table. Single-role app;
-- this is a label (e.g. "Malik") rather than a FK to auth.users.
-- Upgrade path to an FK (issues.md #2 / future) only changes the
-- column type — UI already treats it as a string suggestion.
--
-- `source` column needs no schema change; 'bark' joins the existing
-- text column. Documented in this migration for grep-discoverability:
--   source values now: google | facebook | instagram | linkedin
--                       | email | organic | bark

alter table leads
  add column if not exists assignee text;

create index if not exists leads_assignee_idx on leads(assignee);
