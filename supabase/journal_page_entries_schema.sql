-- Journal page entries (freeform journal/dream/gratitude/shadow/lesson) —
-- distinct from the older journal_entries table, which is a once-per-day
-- check-in-style row and doesn't fit this page's multiple-entries-per-day,
-- typed-entry model.
create table if not exists public.journal_page_entries (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  entry_type  text not null default 'journal' check (entry_type in ('journal','dream','gratitude','shadow','lesson','wellness','astrology','daily_reflection')),
  mood        text,
  content     text not null,
  tags        text[] default '{}',
  created_at  timestamptz default now()
);

alter table public.journal_page_entries enable row level security;
create policy "Users manage own journal entries" on public.journal_page_entries for all using (auth.uid() = user_id);
create index idx_journal_page_entries_user_date on public.journal_page_entries(user_id, created_at desc);
