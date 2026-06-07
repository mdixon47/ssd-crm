-- ============================================================
-- SSD Consulting CRM — Supabase Schema
-- Run in: https://app.supabase.com/project/_/sql
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- LEADS
-- ------------------------------------------------------------
create table if not exists leads (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Contact
  fname       text not null,
  lname       text not null,
  email       text not null,
  phone       text,
  org         text not null,
  title       text,

  -- Interest
  interest    text,
  stage       text not null default 'New Lead',
  qualified   text check (qualified in ('yes','no','partial','')),

  -- Ad tracking
  source      text,   -- google | facebook | instagram | linkedin | email | organic
  campaign    text,
  keyword     text,
  content     text,   -- ad version / creative
  gclid       text,   -- Google Click ID or fbclid / li_fat_id
  landing     text,

  -- Outcome
  revenue     numeric(10,2) default 0,
  notes       text,
  lead_date   date default current_date
);

-- Index for fast pipeline queries
create index leads_stage_idx on leads(stage);
create index leads_campaign_idx on leads(campaign);
create index leads_source_idx on leads(source);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- SEARCH TERMS
-- ------------------------------------------------------------
create table if not exists search_terms (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  week_date    date not null default current_date,

  term         text not null,
  campaign     text not null,
  platform     text not null default 'google', -- google | facebook | instagram | linkedin
  impressions  integer default 0,
  clicks       integer default 0,
  cost         numeric(10,2) default 0,
  conversions  integer default 0,
  label        text check (label in ('keep','watch','negative','build_page','new_campaign',''))
                 default ''
);

create index search_terms_campaign_idx on search_terms(campaign);
create index search_terms_label_idx on search_terms(label);
create index search_terms_week_idx on search_terms(week_date);

create trigger search_terms_updated_at
  before update on search_terms
  for each row execute function update_updated_at();

-- ------------------------------------------------------------
-- NEGATIVE KEYWORDS
-- ------------------------------------------------------------
create table if not exists negative_keywords (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  keyword    text not null,
  category   text not null default 'General',
  platform   text not null default 'all', -- all | google | facebook | linkedin
  active     boolean not null default true
);

create index neg_kw_category_idx on negative_keywords(category);
create index neg_kw_platform_idx on negative_keywords(platform);

-- ------------------------------------------------------------
-- AUDIT SESSIONS
-- ------------------------------------------------------------
create table if not exists audit_sessions (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  week_date   date not null default current_date,
  status      text not null default 'in_progress', -- in_progress | complete
  report      jsonb,           -- AI-generated weekly report stored as JSON
  checklist   jsonb default '{}' -- { "step_0_check_0": true, ... }
);

-- ------------------------------------------------------------
-- SEED: Default negative keywords
-- ------------------------------------------------------------
insert into negative_keywords (keyword, category, platform) values
  ('free jobs', 'General', 'all'),
  ('hiring', 'General', 'all'),
  ('salary', 'General', 'all'),
  ('employment', 'General', 'all'),
  ('internship', 'General', 'all'),
  ('template only', 'General', 'all'),
  ('definition', 'General', 'all'),
  ('DIY free', 'General', 'all'),
  ('government job', 'General', 'all'),
  ('volunteer', 'General', 'all'),
  ('grant writer jobs', 'Grant Writing Campaigns', 'google'),
  ('grant writing salary', 'Grant Writing Campaigns', 'google'),
  ('grant writer resume', 'Grant Writing Campaigns', 'google'),
  ('grant writing employment', 'Grant Writing Campaigns', 'google'),
  ('free grant money for individuals', 'Grant Writing Campaigns', 'google'),
  ('personal grants', 'Grant Writing Campaigns', 'google'),
  ('government grants for personal use', 'Grant Writing Campaigns', 'google'),
  ('therapist near me', 'Behavioral Health Campaigns', 'all'),
  ('psychiatrist near me', 'Behavioral Health Campaigns', 'all'),
  ('inpatient treatment', 'Behavioral Health Campaigns', 'all'),
  ('crisis hotline', 'Behavioral Health Campaigns', 'all'),
  ('free counseling', 'Behavioral Health Campaigns', 'all'),
  ('medication management', 'Behavioral Health Campaigns', 'all'),
  ('individual therapy', 'Behavioral Health Campaigns', 'all');

-- ------------------------------------------------------------
-- SEED: Sample leads
-- ------------------------------------------------------------
insert into leads (fname, lname, email, phone, org, title, interest, stage, campaign, keyword, gclid, landing, revenue, notes, qualified, source) values
  ('Diana','Okafor','dokafor@bridgecommunity.org','(312) 555-0182','Bridge Community Foundation','Executive Director','Grant Writing 101 (Paid)','Became Consulting Client','Grant Writing 101','grant writing course with certificate','CjwK_abc123','/grant-writing-101',3500,'Enrolled in GW101, then inquired about grants management consulting.','yes','google'),
  ('Marcus','Reid','mreid@wellspringnp.org','(404) 555-0291','Wellspring Nonprofit Solutions','Program Manager','Grants Management Consulting','Proposal Sent','Grants Management Consulting','grants management consultant','CjwK_def456','/grants-management',0,'Federal grant compliance needs. Strong budget authority.','yes','google'),
  ('Priya','Sharma','priya@unitedwaydc.org','(202) 555-0374','United Way Metro DC','Development Director','Grants Management Consulting','Booked Consultation','Grants Management Consulting','nonprofit grants management','CjwK_ghi789','/grants-management',0,'Interested in compliance and reporting support.','partial','google'),
  ('James','Whitfield','jwhitfield@hopeforever.org','(713) 555-0419','Hope Forever Ministries','Finance Director','Free Grant Writing Course','Purchased Course','Free Grant Writing Course','free grant writing course','CjwK_jkl012','/free-course',0,'Signed up for free course. Sent GW101 discount email.','yes','google'),
  ('Angela','Torres','atorres@communityrise.net','(787) 555-0537','CommunityRise Behavioral Health','CEO','Behavioral Health Consulting','Qualified','Behavioral Health Consulting','behavioral health consultant','CjwK_mno345','/behavioral-health',0,'Running workforce training programs. Wants trauma-informed care training support.','yes','google'),
  ('Tamara','Jackson','tjackson@lifepath.org','(901) 555-0761','LifePath Human Services','Grants Manager','Grant Writing 101 (Paid)','Purchased Course','Grant Writing 101','online grant writing training','CjwK_stu901','/grant-writing-101',597,'Enrolled in GW101. Excellent candidate for consulting upsell.','yes','google'),
  ('Angela','Chen','achen@nonprofitalliance.org','(415) 555-0834','Nonprofit Alliance SF','Development Director','Grants Management Consulting','Booked Consultation','FB — Nonprofit Audience',NULL,'fb_1234567','/grants-management',0,'Came from Facebook lead ad. Interested in compliance support.','yes','facebook'),
  ('Robert','Mensah','rmensah@urbanhealth.org','(617) 555-0882','Urban Health Initiative','Program Director','Behavioral Health Consulting','New Lead','LI — BH Agency Leaders',NULL,'li_7654321','/behavioral-health',0,'Downloaded contact page from LinkedIn ad. No response yet.','','linkedin');

-- ------------------------------------------------------------
-- Row Level Security (enable for production)
-- ------------------------------------------------------------
-- alter table leads enable row level security;
-- alter table search_terms enable row level security;
-- alter table negative_keywords enable row level security;
-- alter table audit_sessions enable row level security;
-- Uncomment and add policies when adding auth
