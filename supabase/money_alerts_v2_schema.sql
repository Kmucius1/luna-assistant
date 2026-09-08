-- The original money_alerts table was dropped in luna_money_v2_schema.sql
-- and never replaced — /api/money/alerts has been querying a table that
-- doesn't exist. This recreates it as a real, generic alerts feed with a
-- dedupe_key so regenerating on every GET stays idempotent (no duplicate
-- alerts piling up), rather than a one-shot insert.
create table if not exists public.money_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('bill_due_soon', 'bill_overdue')),
  title       text not null,
  detail      text,
  status      text not null default 'unread' check (status in ('unread', 'read', 'dismissed', 'resolved')),
  dedupe_key  text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

alter table public.money_alerts enable row level security;
create policy "money_alerts_select_own" on public.money_alerts for select using (auth.uid() = user_id);
create policy "money_alerts_insert_own" on public.money_alerts for insert with check (auth.uid() = user_id);
create policy "money_alerts_update_own" on public.money_alerts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_money_alerts_user_status on public.money_alerts(user_id, status);
