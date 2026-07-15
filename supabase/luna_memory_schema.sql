-- Long-term memory — one row per day, holding what LUNA learned about Zoe
-- from that day's chat + check-ins. Never overwritten by later days, never
-- deleted; the chat's daily session rolling over at midnight is what "clears"
-- day-to-day, but this table is the permanent record that persists across it.
create table if not exists public.luna_memory (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date_key    text not null,
  summary     text not null,
  source      text not null default 'ai' check (source in ('ai', 'fallback')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, date_key)
);

alter table public.luna_memory enable row level security;
create policy "Users manage own memory" on public.luna_memory for all using (auth.uid() = user_id);
create index idx_luna_memory_user_date on public.luna_memory(user_id, date_key desc);
