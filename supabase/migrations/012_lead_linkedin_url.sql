-- ============================================================
-- 012 — LinkedIn profile URL on leads (PhantomBuster imports)
-- Stores the scraped profile URL and powers duplicate detection
-- on re-imports. The import endpoint degrades gracefully (URL
-- goes into notes) until this migration has been applied.
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

alter table leads add column if not exists linkedin_url text;

create index if not exists leads_linkedin_url_idx on leads(linkedin_url);
