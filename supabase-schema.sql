-- ============================================================
-- FLOURISH — Supabase Schema
-- Run this entire file in: Supabase dashboard > SQL Editor > New query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (mirrors Clerk user, stores app-specific profile)
-- ============================================================
create table if not exists users (
  id            uuid primary key default uuid_generate_v4(),
  clerk_id      text unique not null,
  name          text,
  email         text,
  age           int,
  weight_lbs    numeric,
  height_in     numeric,
  experience    text check (experience in ('beginner','intermediate','advanced')),
  goals         text[],
  health_notes  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- CYCLES
-- ============================================================
create table if not exists cycles (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade not null,
  name        text not null,
  goals       text[],
  start_date  date,
  end_date    date,
  weeks       int default 12,
  active      boolean default true,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- COMPOUNDS (per-cycle stack)
-- ============================================================
create table if not exists compounds (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade not null,
  cycle_id    uuid references cycles(id) on delete cascade not null,
  name        text not null,
  category    text,
  dose        numeric,
  unit        text,
  frequency   text,
  status      text default 'active' check (status in ('active','paused','completed')),
  titration   jsonb default '[]',
  notes       text,
  start_date  date,
  end_date    date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- DAILY LOGS
-- ============================================================
create table if not exists logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references users(id) on delete cascade not null,
  cycle_id      uuid references cycles(id) on delete cascade not null,
  date          date not null default current_date,
  weight_lbs    numeric,
  sleep_score   numeric,
  hrv           numeric,
  mood          int check (mood between 1 and 10),
  stress        int check (stress between 1 and 10),
  appetite      int check (appetite between 1 and 10),
  energy        int check (energy between 1 and 10),
  libido        int check (libido between 1 and 10),
  side_effects  text,
  physique_notes text,
  general_notes text,
  doses         jsonb default '{}',
  created_at    timestamptz default now()
);

-- ============================================================
-- TRAINING SESSIONS
-- ============================================================
create table if not exists training_sessions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade not null,
  cycle_id    uuid references cycles(id) on delete cascade not null,
  date        date not null default current_date,
  type        text check (type in ('lift','cardio')),
  exercise    text,
  sets        jsonb default '[]',
  duration_min int,
  distance_mi  numeric,
  notes       text,
  created_at  timestamptz default now()
);

-- ============================================================
-- BLOOD PANELS
-- ============================================================
create table if not exists blood_panels (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references users(id) on delete cascade not null,
  date            date not null,
  lab_name        text,
  file_url        text,
  markers         jsonb default '{}',
  ai_summary      text,
  raw_text        text,
  created_at      timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — users can only see their own data
-- ============================================================
alter table users           enable row level security;
alter table cycles          enable row level security;
alter table compounds       enable row level security;
alter table logs            enable row level security;
alter table training_sessions enable row level security;
alter table blood_panels    enable row level security;

-- Helper: get current user's UUID from their clerk_id stored in JWT
create or replace function get_user_id()
returns uuid
language sql stable
as $$
  select id from users where clerk_id = (
    current_setting('request.jwt.claims', true)::json->>'sub'
  )
$$;

-- Users policies
create policy "users: own row only"  on users for all using (id = get_user_id());

-- Cycles policies
create policy "cycles: own rows only" on cycles for all using (user_id = get_user_id());

-- Compounds policies
create policy "compounds: own rows only" on compounds for all using (user_id = get_user_id());

-- Logs policies
create policy "logs: own rows only" on logs for all using (user_id = get_user_id());

-- Training policies
create policy "training: own rows only" on training_sessions for all using (user_id = get_user_id());

-- Blood panels policies
create policy "blood_panels: own rows only" on blood_panels for all using (user_id = get_user_id());

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index on cycles          (user_id, active);
create index on compounds       (user_id, cycle_id, status);
create index on logs            (user_id, cycle_id, date desc);
create index on training_sessions (user_id, cycle_id, date desc);
create index on blood_panels    (user_id, date desc);

-- ============================================================
-- Auto-update updated_at timestamps
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at    before update on users    for each row execute function update_updated_at();
create trigger cycles_updated_at   before update on cycles   for each row execute function update_updated_at();
create trigger compounds_updated_at before update on compounds for each row execute function update_updated_at();
