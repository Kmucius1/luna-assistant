-- Communication Coach v2 — replaces the old message_suggestions-based flow
-- for this feature (message_suggestions stays untouched; it's still read by
-- the unrelated /relationships quick-ask, which this does not touch).

-- Real saved contacts — the old /relationships page used a hardcoded PEOPLE
-- array (Mom, Jasmine Lee, Marcus...), never real data. This is the actual
-- table: per-contact relationship type + free-text notes the coach uses to
-- personalize tone instead of one generic template for everyone.
create table if not exists public.coach_contacts (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  name              text not null,
  relationship_type text not null default 'other',
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table public.coach_contacts enable row level security;
create policy "Users manage own coach contacts" on public.coach_contacts for all using (auth.uid() = user_id);
create index idx_coach_contacts_user on public.coach_contacts(user_id);

-- Every analysis + generated response — the source of "don't repeat what
-- you already told this person" and of the feedback loop below.
create table if not exists public.coach_responses (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  contact_id      uuid references public.coach_contacts(id) on delete set null,
  contact_name    text,
  direction       text not null check (direction in ('received', 'written')),
  relationship_type text,
  goal            text,
  original_message text not null,
  analysis        jsonb,
  best_response   jsonb,
  alternatives    jsonb,
  created_at      timestamptz default now()
);
alter table public.coach_responses enable row level security;
create policy "Users manage own coach responses" on public.coach_responses for all using (auth.uid() = user_id);
create index idx_coach_responses_user_contact on public.coach_responses(user_id, contact_id, created_at desc);

-- Per-reply feedback ("too soft", "sounds like me", etc). Individual ratings
-- don't touch the profile — only a repeated pattern (see coach_profile) does.
create table if not exists public.coach_feedback (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  response_id uuid references public.coach_responses(id) on delete cascade not null,
  tag         text not null check (tag in ('sounds_like_me', 'too_soft', 'too_harsh', 'too_long', 'too_formal', 'not_what_i_meant')),
  created_at  timestamptz default now()
);
alter table public.coach_feedback enable row level security;
create policy "Users manage own coach feedback" on public.coach_feedback for all using (auth.uid() = user_id);
create index idx_coach_feedback_user on public.coach_feedback(user_id, created_at desc);

-- One row per user. learned_notes accumulates only after a feedback pattern
-- repeats (see /api/ai/communication-coach/feedback) — never from one rating.
create table if not exists public.coach_profile (
  user_id       uuid references auth.users(id) on delete cascade primary key,
  learned_notes text not null default '',
  updated_at    timestamptz default now()
);
alter table public.coach_profile enable row level security;
create policy "Users manage own coach profile" on public.coach_profile for all using (auth.uid() = user_id);
