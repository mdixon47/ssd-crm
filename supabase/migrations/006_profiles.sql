-- ============================================================
-- SSD Consulting CRM — User Profiles
-- ============================================================
-- One profile row per auth user, created automatically via trigger.

-- ------------------------------------------------------------
-- Table
-- ------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Auto-update updated_at (reuses function from 001_initial.sql)
-- ------------------------------------------------------------
drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table profiles enable row level security;

-- Any authenticated user can read all profiles (needed for assignee lists, etc.)
drop policy if exists "authenticated_read" on profiles;
create policy "authenticated_read" on profiles
  for select
  to authenticated
  using (true);

-- Each user can update only their own profile.
drop policy if exists "owner_update" on profiles;
create policy "owner_update" on profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- Trigger: auto-create a profile on new auth user signup
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ------------------------------------------------------------
-- Seed: backfill profiles for any existing auth users
-- (covers users created before this migration, including Malik)
-- ------------------------------------------------------------
insert into profiles (id, name, email)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', email),
  email
from auth.users
on conflict (id) do nothing;
