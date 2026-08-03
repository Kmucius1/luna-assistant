-- Run this in Supabase Dashboard → SQL Editor
-- Real, persisted goal tracking for the Work section's "Goals" quick action
-- (previously a "Soon" placeholder with no backing data at all).

create table if not exists public.work_goals (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  title            text not null,
  notes            text,
  target_date      date,
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  status           text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.work_goals enable row level security;

create policy "Users manage own work goals" on public.work_goals
  for all using (auth.uid() = user_id);

create index if not exists idx_work_goals_user_status
  on public.work_goals(user_id, status, created_at desc);
