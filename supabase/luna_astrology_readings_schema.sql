-- ============================================================
-- Luna Astrology & Numerology Guidance — Phase 1 schema
-- Run in Supabase Dashboard -> SQL Editor, AFTER schema.sql and
-- luna_profile_schema.sql. Safe to re-run (idempotent).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── source_registry ──────────────────────────────────────────
-- What data/interpretation sources Luna's astrology system is grounded in
-- or inspired by. Reference table, seeded by source_registry_seed.sql.
create table if not exists public.source_registry (
  id               uuid default uuid_generate_v4() primary key,
  name             text not null unique,
  category         text not null check (category in (
                     'astronomy','western_astrology','chinese_astrology',
                     'numerology','psychology_research'
                   )),
  url              text,
  use_case         text,
  trust_level      text not null check (trust_level in ('primary','secondary','reference')),
  notes            text,
  last_verified_at timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.source_registry enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'source_registry'
      and policyname = 'Anyone can read source registry'
  ) then
    create policy "Anyone can read source registry"
      on public.source_registry for select using (true);
  end if;
end $$;
-- No insert/update/delete policy: only the service-role admin client
-- (which bypasses RLS) writes to this table, via the seed script.

-- ─── daily_readings ───────────────────────────────────────────
create table if not exists public.daily_readings (
  id                        uuid default uuid_generate_v4() primary key,
  user_id                   uuid references auth.users(id) on delete cascade not null,
  reading_date              date not null,
  timezone                  text not null default 'America/New_York',
  sun_sign                  text,
  moon_sign                 text,
  moon_phase                text,
  numerology_personal_day   integer,
  chinese_day_energy        text,
  major_transits_json       jsonb default '[]'::jsonb,
  natal_transits_json       jsonb default '[]'::jsonb,
  reading_json              jsonb not null,
  luna_message              text,
  generated_at              timestamptz default now(),
  expires_at                timestamptz,
  source_log_json           jsonb default '[]'::jsonb,
  status                    text not null default 'ready' check (status in ('pending','ready','stale','error')),
  created_at                timestamptz default now(),
  updated_at                timestamptz default now(),
  unique (user_id, reading_date, timezone)
);

alter table public.daily_readings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_readings'
      and policyname = 'Users manage own daily readings'
  ) then
    create policy "Users manage own daily readings"
      on public.daily_readings for all using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists idx_daily_readings_window
  on public.daily_readings(user_id, reading_date);

-- ─── reading_generation_runs ──────────────────────────────────
-- Audit log for cron / manual backfill runs. Intentionally zero RLS
-- policies — only the service-role admin client can touch this table.
create table if not exists public.reading_generation_runs (
  id               uuid default uuid_generate_v4() primary key,
  run_type         text not null default 'cron' check (run_type in ('cron','manual','backfill')),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  timezone         text default 'America/New_York',
  users_processed  integer default 0,
  readings_created integer default 0,
  readings_updated integer default 0,
  errors_json      jsonb default '[]'::jsonb,
  status           text not null default 'running' check (status in ('running','success','partial','error')),
  created_at       timestamptz default now()
);

alter table public.reading_generation_runs enable row level security;
