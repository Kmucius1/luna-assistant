-- Real "cooked on X, safe until Y" tracking — the actual data model the
-- food-safety advisory rule was missing. A row is created when Zoe marks a
-- planned meal as cooked; safe_until is computed once at insert time
-- (cooked_at + 4 days), not re-derived, so it stays a fixed fact even if
-- she checks back later.
create table if not exists public.cooked_leftovers (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  meal_name     text not null,
  meal_type     text check (meal_type in ('breakfast', 'lunch', 'dinner')),
  cooked_at     date not null,
  safe_until    date not null,
  status        text not null default 'active' check (status in ('active', 'consumed', 'frozen', 'discarded')),
  created_at    timestamptz default now()
);

alter table public.cooked_leftovers enable row level security;
create policy "Users manage own cooked leftovers" on public.cooked_leftovers for all using (auth.uid() = user_id);
create index idx_cooked_leftovers_user_active on public.cooked_leftovers(user_id, status, safe_until);
