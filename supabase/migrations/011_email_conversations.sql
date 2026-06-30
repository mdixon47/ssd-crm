-- ============================================================
-- SSD Consulting CRM — Email Conversations
-- Turns the outbound-only email_messages log into a two-way
-- conversation thread by recording message direction.
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

-- Direction of the message relative to SSD Consulting.
--   outbound = we sent it (via Resend)
--   inbound  = the lead replied (logged manually or via inbound webhook)
alter table email_messages
  add column if not exists direction text not null default 'outbound';

-- Existing rows are all outbound sends — the default backfills them.
alter table email_messages
  drop constraint if exists email_messages_direction_check;
alter table email_messages
  add constraint email_messages_direction_check
  check (direction in ('outbound', 'inbound'));

-- Inbound replies use status 'received'; outbound stays 'sent' | 'failed'.
alter table email_messages
  drop constraint if exists email_messages_status_check;
alter table email_messages
  add constraint email_messages_status_check
  check (status in ('sent', 'failed', 'received'));

-- Read the whole thread for a lead in chronological order.
create index if not exists email_messages_lead_created_idx
  on email_messages (lead_id, created_at);
