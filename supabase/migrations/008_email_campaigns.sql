-- ============================================================
-- SSD Consulting CRM — Email Campaigns
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

create table if not exists email_campaigns (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  name             text not null,
  subject          text not null,
  body             text not null,
  status           text not null default 'draft', -- draft | sending | sent | failed
  recipient_filter jsonb not null default '{"stages":[],"sources":[]}',
  recipient_count  integer not null default 0,
  sent_at          timestamptz,
  created_by       uuid references auth.users(id) on delete set null
);

create table if not exists email_campaign_recipients (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz not null default now(),
  campaign_id  uuid not null references email_campaigns(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  email        text not null,
  lead_name    text,
  status       text not null default 'pending', -- pending | sent | failed
  resend_id    text,
  error        text
);

create index email_campaigns_status_idx      on email_campaigns(status);
create index email_campaigns_created_idx     on email_campaigns(created_at desc);
create index ecr_campaign_idx               on email_campaign_recipients(campaign_id);
