-- Laundry and cleaning, tracked for real per week — one row per (user, week,
-- type), so Sunday's choice and its later completion live in the same place
-- instead of a single AI-invented sentence with nothing to check off.
create table if not exists public.home_tasks (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  week_start      date not null,
  type            text not null check (type in ('laundry', 'cleaning')),
  choice          text not null,
  categories      text[],
  completed_at    timestamptz,
  created_at      timestamptz default now(),
  unique (user_id, week_start, type)
);

alter table public.home_tasks enable row level security;
create policy "Users manage own home tasks" on public.home_tasks for all using (auth.uid() = user_id);
create index idx_home_tasks_user_week on public.home_tasks(user_id, week_start desc);
