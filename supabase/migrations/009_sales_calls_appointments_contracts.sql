-- ============================================================
-- SSD Consulting CRM — Sales Calls, Appointments, Contracts
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

-- Sales Calls ─────────────────────────────────────────────────
create table if not exists sales_calls (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  lead_id          uuid references leads(id) on delete cascade,
  scheduled_at     timestamptz not null,
  duration_minutes int not null default 30,
  outcome          text not null default 'scheduled',
  -- scheduled | completed | no_show | rescheduled | cancelled
  notes            text,
  packages_discussed text[], -- which offerings were discussed
  next_step        text,
  created_by       uuid references auth.users(id) on delete set null
);

create index sales_calls_lead_idx      on sales_calls(lead_id);
create index sales_calls_scheduled_idx on sales_calls(scheduled_at desc);

-- Appointments ────────────────────────────────────────────────
create table if not exists appointments (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  lead_id          uuid references leads(id) on delete cascade,
  title            text not null,
  scheduled_at     timestamptz not null,
  duration_minutes int not null default 60,
  type             text not null default 'consultation',
  -- consultation | sales_call | follow_up | other
  status           text not null default 'scheduled',
  -- scheduled | completed | cancelled | no_show
  notes            text,
  location         text, -- Zoom link, phone number, address
  created_by       uuid references auth.users(id) on delete set null
);

create index appointments_lead_idx      on appointments(lead_id);
create index appointments_scheduled_idx on appointments(scheduled_at);
create index appointments_status_idx    on appointments(status);

-- Contracts ───────────────────────────────────────────────────
create table if not exists contracts (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  lead_id          uuid references leads(id) on delete cascade,
  service          text not null,
  -- Grant Writing 101 | Grants Management Consulting | Behavioral Health Consulting
  value            numeric(10, 2) not null default 0,
  signed_at        timestamptz,
  paid_at          timestamptz,
  payment_method   text, -- stripe | check | wire | ach
  notes            text,
  created_by       uuid references auth.users(id) on delete set null
);

create index contracts_lead_idx     on contracts(lead_id);
create index contracts_signed_idx   on contracts(signed_at desc);
