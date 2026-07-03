-- Run this in Supabase Dashboard → SQL Editor
-- Real, persisted daily-content cache — replaces the in-memory Map pattern
-- previously used by /api/astrology/daily-guidance (wiped on every deploy).

create table if not exists public.daily_generation_cache (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  date_key        text not null,                 -- 'YYYY-MM-DD' in the user's local timezone
  timezone        text not null default 'America/New_York',
  generation_type text not null,                  -- 'luna_message' | 'daily_tarot' | 'daily_crystal' | ...
  payload         jsonb not null,
  source          text not null default 'ai',     -- 'ai' | 'fallback'
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id, date_key, generation_type)
);

alter table public.daily_generation_cache enable row level security;

create policy "Users manage own daily cache" on public.daily_generation_cache
  for all using (auth.uid() = user_id);

create index if not exists idx_daily_cache_lookup
  on public.daily_generation_cache(user_id, date_key, generation_type);
