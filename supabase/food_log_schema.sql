-- Run this in Supabase Dashboard → SQL Editor
-- Real, persisted "what I actually ate today" log — backs the Meal Plan
-- tab's checkmark-to-log and free-text "Log Meal" flows. Previously there
-- was no way to record eating a planned meal or anything off-plan (like a
-- banana); Daily Nutrition Goals only ever summed the PLAN, not real intake.

create table if not exists public.food_log_entries (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date_key    text not null,                    -- 'YYYY-MM-DD'
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  source      text not null default 'custom' check (source in ('planned', 'custom')),
  title       text not null,
  calories    int,
  protein_g   int,
  logged_at   timestamptz default now()
);

alter table public.food_log_entries enable row level security;

create policy "Users manage own food log" on public.food_log_entries
  for all using (auth.uid() = user_id);

create index if not exists idx_food_log_user_date
  on public.food_log_entries(user_id, date_key);
