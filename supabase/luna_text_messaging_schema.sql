-- ============================================================
-- LUNA Text Messaging — first test build (Emma)
-- Run this in the Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── Contacts ──────────────────────────────────────────────────
create table if not exists public.luna_text_contacts (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  identifier    text not null,
  relationship  text,
  tone_notes    text,
  voice_profile jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id, identifier)
);
alter table public.luna_text_contacts enable row level security;
create policy "Users manage own text contacts" on public.luna_text_contacts for all using (auth.uid() = user_id);

-- ─── Threads ───────────────────────────────────────────────────
create table if not exists public.luna_text_threads (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  contact_id       uuid references public.luna_text_contacts(id) on delete cascade not null,
  conversation_id  text not null,
  source           text not null default 'imessage',
  created_at       timestamptz default now(),
  unique (user_id, conversation_id)
);
alter table public.luna_text_threads enable row level security;
create policy "Users manage own text threads" on public.luna_text_threads for all using (auth.uid() = user_id);

-- ─── Messages (+ AI analysis) ─────────────────────────────────
create table if not exists public.luna_text_messages (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  thread_id           uuid references public.luna_text_threads(id) on delete cascade not null,
  contact_id          uuid references public.luna_text_contacts(id) on delete cascade not null,
  sender_name         text not null,
  sender_identifier   text not null,
  message_text        text not null,
  received_at         timestamptz not null,
  source              text default 'imessage',
  dedupe_key          text not null,
  processing_status   text not null default 'pending' check (processing_status in ('pending', 'processing', 'done', 'failed')),
  processing_error    text,
  summary             text,
  request             text,
  urgency             text check (urgency in ('low', 'medium', 'high', 'critical')),
  urgency_reason      text,
  tone                text,
  past_context        text,
  missing_info        text,
  voice_mode          text,
  confidence          numeric,
  analyzed_at         timestamptz,
  created_at          timestamptz default now(),
  unique (dedupe_key)
);
alter table public.luna_text_messages enable row level security;
create policy "Users manage own text messages" on public.luna_text_messages for all using (auth.uid() = user_id);
create index if not exists idx_luna_text_messages_thread on public.luna_text_messages (thread_id, created_at desc);
create index if not exists idx_luna_text_messages_user on public.luna_text_messages (user_id, created_at desc);

-- ─── Drafts ────────────────────────────────────────────────────
create table if not exists public.luna_text_drafts (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  message_id        uuid references public.luna_text_messages(id) on delete cascade not null,
  variant           text not null check (variant in ('quick', 'friendly', 'detailed')),
  ai_original_text  text not null,
  current_text      text not null,
  edited            boolean not null default false,
  edit_diff         jsonb,
  regenerate_count  integer not null default 0,
  status            text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
  approved_at       timestamptz,
  sent_at           timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (message_id, variant)
);
alter table public.luna_text_drafts enable row level security;
create policy "Users manage own text drafts" on public.luna_text_drafts for all using (auth.uid() = user_id);
create index if not exists idx_luna_text_drafts_message on public.luna_text_drafts (message_id);

-- ─── Seed: Emma test contact ───────────────────────────────────
-- Already applied directly via the Supabase Management API on 2026-07-30.
insert into public.luna_text_contacts (user_id, name, identifier, relationship, tone_notes)
values (
  '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb',
  'Emma',
  '+16142265107',
  'friend',
  'Casual, close friend, texts short and warm'
)
on conflict (user_id, identifier) do nothing;
