-- Web Push subscriptions, one row per device/browser Zoe has enabled
-- notifications on. Follows the same pattern as other feature tables in
-- this repo: uuid_generate_v4() PK, user_id FK to auth.users, RLS scoped
-- to the owning user.

create table if not exists public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_all_own" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tracks which notification "slots" (morning_briefing, work_nudge,
-- evening_wind_down, astrology_ready, etc.) have already been sent today,
-- so the cron — which runs hourly — never double-sends the same
-- notification within one local day.
create table if not exists public.push_notification_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  date_key text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, notification_key, date_key)
);

alter table public.push_notification_log enable row level security;

create policy "push_notification_log_all_own" on public.push_notification_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
