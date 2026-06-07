-- ============================================================
-- SSD Consulting CRM — Email Messages
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

create table if not exists email_messages (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  lead_id     uuid not null references leads(id) on delete cascade,
  to_email    text not null,
  from_email  text not null,
  subject     text not null,
  body        text not null,
  status      text not null default 'sent', -- sent | failed
  resend_id   text,
  error       text
);

create index email_messages_lead_idx on email_messages(lead_id);
create index email_messages_created_idx on email_messages(created_at desc);
