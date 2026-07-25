-- Logged completed workouts
create table if not exists public.workout_logs (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  date_key          text not null,
  day_of_week       text not null,
  focus             text,
  exercises         jsonb,
  duration_minutes  int,
  completed_at      timestamptz not null default now(),
  created_at        timestamptz default now()
);

alter table public.workout_logs enable row level security;
create policy "Users manage own workout logs" on public.workout_logs for all using (auth.uid() = user_id);
create index idx_workout_logs_user_date on public.workout_logs(user_id, date_key desc);
