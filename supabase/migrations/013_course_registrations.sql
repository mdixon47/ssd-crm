-- ============================================================
-- 013 — Course registration workflow
-- Public landing page → registration → CRM lead (deduped by
-- email) → one onboarding task for the team. Failed submissions
-- are kept in workflow_failures for review.
--
-- Public visitors never touch these tables directly: the
-- /api/learn/courses/* routes call register_for_course() with
-- the service-role key. RLS grants nothing to anon; the team
-- (authenticated) shares read/update like the rest of the CRM
-- (migration 007).
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

-- ------------------------------------------------------------
-- COURSES
-- ------------------------------------------------------------
create table if not exists courses (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  summary     text,
  description text,
  starts_on   date,
  format      text,            -- e.g. "Live online, 4 weeks"
  price       numeric(10,2),   -- display only; checkout comes later
  is_active   boolean not null default false,
  created_by  uuid references auth.users(id) default auth.uid()
);

drop trigger if exists courses_updated_at on courses;
create trigger courses_updated_at
  before update on courses
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- COURSE REGISTRATIONS
-- Keeps the campaign source of *this* registration; the lead
-- keeps its original (first-touch) attribution.
-- ------------------------------------------------------------
create table if not exists course_registrations (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz not null default now(),
  course_id    uuid not null references courses(id) on delete restrict,
  lead_id      uuid not null references leads(id) on delete restrict,
  email        text not null check (email = lower(btrim(email))),
  fname        text not null,
  lname        text not null,
  phone        text,
  org          text,
  status       text not null default 'registered' check (status in ('registered', 'cancelled')),

  -- Attribution
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  utm_term     text,
  utm_content  text,
  click_id     text,           -- gclid / fbclid / li_fat_id
  landing      text,
  referrer     text,

  unique (course_id, email)
);

create index if not exists course_registrations_course_idx  on course_registrations (course_id, created_at desc);
create index if not exists course_registrations_lead_idx    on course_registrations (lead_id);
create index if not exists course_registrations_source_idx  on course_registrations (utm_source);

-- Lead lookup by normalized email (dedupe key for registrations).
create index if not exists leads_email_lower_idx on leads (lower(btrim(email)));

-- ------------------------------------------------------------
-- TASKS (team to-dos; onboarding is the first kind)
-- ------------------------------------------------------------
create table if not exists tasks (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  kind            text not null default 'onboarding' check (kind in ('onboarding')),
  title           text not null,
  status          text not null default 'open' check (status in ('open', 'done')),
  due_date        date default (current_date + 2),
  assignee        text,
  completed_at    timestamptz,
  lead_id         uuid references leads(id) on delete cascade,
  registration_id uuid unique references course_registrations(id) on delete cascade,
  created_by      uuid references auth.users(id) default auth.uid()
);

create index if not exists tasks_status_idx on tasks (status, due_date);

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- WORKFLOW FAILURES (submissions / actions needing review)
-- ------------------------------------------------------------
create table if not exists workflow_failures (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  workflow    text not null,          -- e.g. 'course_registration'
  reference   text,                   -- e.g. course slug
  payload     jsonb not null default '{}',
  error       text not null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id)
);

create index if not exists workflow_failures_open_idx on workflow_failures (created_at desc) where resolved_at is null;

-- ------------------------------------------------------------
-- register_for_course — atomic: match/create lead, register,
-- create one onboarding task. Idempotent per (course, email).
-- ------------------------------------------------------------
create or replace function register_for_course(
  p_course_slug text,
  p_email       text,
  p_fname       text,
  p_lname       text,
  p_phone       text default null,
  p_org         text default null,
  p_attribution jsonb default '{}'
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_email        text := lower(btrim(p_email));
  v_course       courses%rowtype;
  v_lead_id      uuid;
  v_lead_created boolean := false;
  v_reg_id       uuid;
  v_already      boolean := false;
  v_task_id      uuid;
begin
  if v_email is null or v_email = '' then
    raise exception 'email is required' using errcode = '22023';
  end if;

  select * into v_course from courses where slug = p_course_slug and is_active;
  if not found then
    raise exception 'course not found: %', p_course_slug using errcode = 'P0002';
  end if;

  -- Serialize concurrent submissions for the same email so two
  -- requests can't both create a lead.
  perform pg_advisory_xact_lock(hashtextextended('course_registration:' || v_email, 0));

  -- Match an existing CRM contact (oldest wins if legacy duplicates exist).
  select id into v_lead_id
    from leads
   where lower(btrim(email)) = v_email
   order by created_at
   limit 1;

  if v_lead_id is null then
    insert into leads (fname, lname, email, phone, org, interest, stage,
                       source, campaign, keyword, content, gclid, landing, notes)
    values (
      p_fname, p_lname, v_email, nullif(p_phone, ''), coalesce(p_org, ''),
      'Course: ' || v_course.title, 'New Lead',
      nullif(p_attribution ->> 'lead_source', ''),
      nullif(p_attribution ->> 'utm_campaign', ''),
      nullif(p_attribution ->> 'utm_term', ''),
      nullif(p_attribution ->> 'utm_content', ''),
      nullif(p_attribution ->> 'click_id', ''),
      nullif(p_attribution ->> 'landing', ''),
      'Created by course registration: ' || v_course.title
    )
    returning id into v_lead_id;
    v_lead_created := true;
  else
    -- Fill gaps only; never overwrite what the team already has.
    update leads
       set phone = coalesce(phone, nullif(p_phone, ''))
     where id = v_lead_id and phone is null and nullif(p_phone, '') is not null;
  end if;

  insert into course_registrations (
    course_id, lead_id, email, fname, lname, phone, org,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    click_id, landing, referrer)
  values (
    v_course.id, v_lead_id, v_email, p_fname, p_lname, nullif(p_phone, ''), nullif(p_org, ''),
    nullif(p_attribution ->> 'utm_source', ''),
    nullif(p_attribution ->> 'utm_medium', ''),
    nullif(p_attribution ->> 'utm_campaign', ''),
    nullif(p_attribution ->> 'utm_term', ''),
    nullif(p_attribution ->> 'utm_content', ''),
    nullif(p_attribution ->> 'click_id', ''),
    nullif(p_attribution ->> 'landing', ''),
    nullif(p_attribution ->> 'referrer', ''))
  on conflict (course_id, email) do nothing
  returning id into v_reg_id;

  if v_reg_id is null then
    v_already := true;
    select id into v_reg_id from course_registrations
     where course_id = v_course.id and email = v_email;
  end if;

  insert into tasks (kind, title, lead_id, registration_id)
  values ('onboarding',
          'Onboard ' || p_fname || ' ' || p_lname || ' — ' || v_course.title,
          v_lead_id, v_reg_id)
  on conflict (registration_id) do nothing
  returning id into v_task_id;

  if v_task_id is null then
    select id into v_task_id from tasks where registration_id = v_reg_id;
  end if;

  return jsonb_build_object(
    'course_id',          v_course.id,
    'lead_id',            v_lead_id,
    'lead_created',       v_lead_created,
    'registration_id',    v_reg_id,
    'already_registered', v_already,
    'task_id',            v_task_id
  );
end;
$$;

-- Server-only: callable with the service-role key, never by visitors.
revoke all on function register_for_course(text, text, text, text, text, text, jsonb) from public;
revoke all on function register_for_course(text, text, text, text, text, text, jsonb) from anon, authenticated;
grant execute on function register_for_course(text, text, text, text, text, text, jsonb) to service_role;

-- ------------------------------------------------------------
-- RLS — team-shared (authenticated); nothing for anon.
-- ------------------------------------------------------------
alter table courses              enable row level security;
alter table course_registrations enable row level security;
alter table tasks                enable row level security;
alter table workflow_failures    enable row level security;

drop policy if exists "courses_select" on courses;
drop policy if exists "courses_insert" on courses;
drop policy if exists "courses_update" on courses;
create policy "courses_select" on courses for select to authenticated using (true);
create policy "courses_insert" on courses for insert to authenticated with check (created_by = auth.uid());
create policy "courses_update" on courses for update to authenticated using (true) with check (true);

-- Registrations are written only by register_for_course (service role).
drop policy if exists "course_registrations_select" on course_registrations;
drop policy if exists "course_registrations_update" on course_registrations;
create policy "course_registrations_select" on course_registrations for select to authenticated using (true);
create policy "course_registrations_update" on course_registrations for update to authenticated using (true) with check (true);

drop policy if exists "tasks_select" on tasks;
drop policy if exists "tasks_update" on tasks;
create policy "tasks_select" on tasks for select to authenticated using (true);
create policy "tasks_update" on tasks for update to authenticated using (true) with check (true);

drop policy if exists "workflow_failures_select" on workflow_failures;
drop policy if exists "workflow_failures_update" on workflow_failures;
create policy "workflow_failures_select" on workflow_failures for select to authenticated using (true);
create policy "workflow_failures_update" on workflow_failures for update to authenticated using (true) with check (true);
