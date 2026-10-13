-- Plaud voice recordings, synced in so LUNA's AI can reference what was
-- actually said in Zoe's conversations. One row per Plaud recording;
-- transcript is the full timestamped text, summary is Plaud's auto note.
-- Never overwritten except by a re-sync of the same recording.
create table if not exists public.plaud_conversations (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  plaud_file_id text not null,
  title         text,
  recorded_at   timestamptz not null,
  duration_ms   integer,
  transcript    text,
  summary       text,
  source        text not null default 'plaud',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id, plaud_file_id)
);

alter table public.plaud_conversations enable row level security;
create policy "Users manage own plaud conversations" on public.plaud_conversations for all using (auth.uid() = user_id);
create index idx_plaud_conversations_user_date on public.plaud_conversations(user_id, recorded_at desc);
