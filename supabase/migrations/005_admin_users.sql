-- ============================================================
-- SSD Consulting CRM — Admin Users
-- ============================================================
-- Tracks which Supabase auth users have admin privileges.
-- References auth.users so deleting a Supabase user automatically
-- removes the corresponding admin record.

-- ------------------------------------------------------------
-- Table
-- ------------------------------------------------------------
create table if not exists admin_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null unique,
  role       text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table admin_users enable row level security;

-- Any authenticated user can read the admin list (needed for UI role checks).
drop policy if exists "authenticated_read" on admin_users;
create policy "authenticated_read" on admin_users
  for select
  to authenticated
  using (true);

-- Only service-role (server-side) can insert/update/delete admin records.
-- No permissive DML policy = client JWT cannot mutate this table.

-- ------------------------------------------------------------
-- Seed: initial superadmin
-- Requires the Supabase auth user to exist first.
-- Create the auth user via the Supabase dashboard or create-user.mjs,
-- then run this migration (or re-run after the user is created).
-- ------------------------------------------------------------
do $$
declare
  v_uid uuid;
begin
  select id into v_uid
    from auth.users
   where email = 'malik.dixon47@gmail.com'
   limit 1;

  if v_uid is not null then
    insert into admin_users (id, name, email, role)
    values (v_uid, 'Malik Dixon', 'malik.dixon47@gmail.com', 'superadmin')
    on conflict (id) do nothing;
  else
    raise notice 'admin_users seed skipped: auth user malik.dixon47@gmail.com not found — create the Supabase auth user first, then re-run this block.';
  end if;
end;
$$;
