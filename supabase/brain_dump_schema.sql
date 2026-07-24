-- Brain Dump — instant capture, one row per thought (not one row per
-- session like the older `brain_dumps` table, which stays untouched and
-- still backs the "Sort it out" task-classification flow at /brain-dump's
-- older sibling route). This is the real per-entry table the new capture-
-- first Brain Dump room reads and writes.

create table if not exists public.brain_dump_entries (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  raw_content         text not null,
  entry_type          text not null default 'text' check (entry_type in ('text', 'voice', 'image', 'link', 'mixed')),
  title               text,
  category            text check (category in ('thoughts', 'todos', 'ideas', 'feelings', 'work', 'other', 'personal', 'creative', 'content', 'shopping', 'research', 'people', 'money', 'health', 'later')),
  status              text not null default 'unsorted' check (status in ('unsorted', 'kept', 'converted', 'archived')),
  is_pinned           boolean not null default false,
  is_archived         boolean not null default false,
  is_locked           boolean not null default false,
  ai_analysis_enabled boolean not null default true,
  ai_summary          text,
  ai_suggested_title  text,
  ai_suggested_category text,
  ai_confidence       text check (ai_confidence in ('low', 'medium', 'high')),
  analysis_status     text not null default 'pending' check (analysis_status in ('pending', 'processing', 'done', 'skipped', 'failed')),
  -- Voice: original audio is never discarded even if transcription fails.
  audio_storage_path  text,
  audio_duration_seconds int,
  transcript          text,
  transcription_status text check (transcription_status in ('pending', 'done', 'failed', 'not_applicable')),
  -- Links out to wherever an entry got converted to, without losing the original.
  linked_type         text check (linked_type in ('task', 'later', 'note', 'project', 'calendar_event', 'reminder', 'creative_memory', 'shopping_item')),
  linked_id           text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.brain_dump_entries enable row level security;
create policy "Users manage own brain dump entries" on public.brain_dump_entries for all using (auth.uid() = user_id);
create index idx_brain_dump_entries_user_created on public.brain_dump_entries(user_id, created_at desc);
create index idx_brain_dump_entries_status on public.brain_dump_entries(user_id, status) where status = 'unsorted';

-- Non-audio attachments (photos, screenshots, files). Voice audio has its
-- own dedicated columns above since every entry has at most one recording;
-- an entry can have multiple photo/file attachments, hence a child table.
create table if not exists public.brain_dump_attachments (
  id              uuid default uuid_generate_v4() primary key,
  entry_id        uuid references public.brain_dump_entries(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  attachment_type text not null check (attachment_type in ('image', 'screenshot', 'file')),
  storage_path    text not null,
  filename        text,
  mime_type       text,
  size_bytes      int,
  created_at      timestamptz default now()
);

alter table public.brain_dump_attachments enable row level security;
create policy "Users manage own brain dump attachments" on public.brain_dump_attachments for all using (auth.uid() = user_id);
create index idx_brain_dump_attachments_entry on public.brain_dump_attachments(entry_id);

-- "Later" list — connected to Brain Dump per spec (an entry can become a
-- Later item and be returned back). Backed by its own table since nothing
-- like it existed anywhere in the app before this (confirmed: only a dead,
-- never-read `LATER_KEY` localStorage constant existed on the Work page).
create table if not exists public.later_items (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  content         text not null,
  source          text not null default 'manual' check (source in ('manual', 'brain_dump', 'work_session')),
  source_entry_id uuid references public.brain_dump_entries(id) on delete set null,
  status          text not null default 'open' check (status in ('open', 'converted_to_task', 'returned_to_brain_dump', 'dismissed')),
  created_at      timestamptz default now()
);

alter table public.later_items enable row level security;
create policy "Users manage own later items" on public.later_items for all using (auth.uid() = user_id);
create index idx_later_items_user_status on public.later_items(user_id, status);

-- Storage bucket for Brain Dump voice recordings and image attachments.
-- Private by default (no public read) — access only via signed URLs
-- generated server-side for the owning user, per the privacy requirements.
insert into storage.buckets (id, name, public)
values ('brain-dump', 'brain-dump', false)
on conflict (id) do nothing;

create policy "Users manage own brain dump storage objects"
  on storage.objects for all
  using (bucket_id = 'brain-dump' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'brain-dump' and (storage.foldername(name))[1] = auth.uid()::text);
