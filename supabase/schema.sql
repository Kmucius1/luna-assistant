-- ============================================================
-- Zoe Assistant — Full Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────
create table if not exists public.users (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text unique not null,
  name       text,
  timezone   text default 'America/New_York',
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "Users own record" on public.users for all using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── User Preferences ─────────────────────────────────────────
create table if not exists public.user_preferences (
  id                         uuid default uuid_generate_v4() primary key,
  user_id                    uuid references auth.users(id) on delete cascade not null unique,
  wake_goal                  time default '08:00',
  sleep_goal_hours           integer default 8,
  bedtime_prep_minutes       integer default 45,
  default_drive_home_minutes integer default 0,
  tone_preference            text default 'soft and spiritual',
  spiritual_preferences      text[] default '{}',
  human_design_type          text default 'Projector',
  human_design_authority     text default 'Self-Projected',
  human_design_profile       text default '4/6',
  astrology_summary          text default 'Scorpio Sun, Cancer Moon, Gemini Rising',
  notification_style         text default 'gentle',
  work_start_goal            time default '09:00',
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);
alter table public.user_preferences enable row level security;
create policy "Users manage own preferences" on public.user_preferences for all using (auth.uid() = user_id);

-- ─── Assistant Profile ────────────────────────────────────────
create table if not exists public.assistant_profile (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null unique,
  preferred_tone   text default 'Clear, warm, human, soft, spiritual, and confident',
  business_context text,
  personal_context text,
  banned_phrases   text[] default '{}',
  response_style   text,
  main_projects    text[] default '{}',
  common_contacts  text,
  daily_routine    text,
  personal_goals   text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.assistant_profile enable row level security;
create policy "Users manage own profile" on public.assistant_profile for all using (auth.uid() = user_id);

-- ─── Tasks ───────────────────────────────────────────────────
create table if not exists public.tasks (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  title            text not null,
  description      text,
  category         text,
  project          text,
  client_name      text,
  status           text not null default 'todo' check (status in ('todo','in_progress','waiting','done','cancelled')),
  due_date         date,
  priority_score   integer default 50,
  urgency_level    text not null default 'medium' check (urgency_level in ('low','medium','high','critical')),
  money_impact     integer default 0 check (money_impact >= 0 and money_impact <= 100),
  emotional_weight integer default 5 check (emotional_weight >= 1 and emotional_weight <= 10),
  estimated_minutes integer,
  source           text default 'manual' check (source in ('manual','email','calendar','brain_dump','crm','message','dictation')),
  source_id        text,
  next_action      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id);
create index if not exists idx_tasks_user_id    on public.tasks(user_id);
create index if not exists idx_tasks_status     on public.tasks(status);
create index if not exists idx_tasks_priority   on public.tasks(priority_score desc);
create index if not exists idx_tasks_due_date   on public.tasks(due_date);

-- ─── Projects / Vault ─────────────────────────────────────────
create table if not exists public.projects (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  description    text,
  type           text,
  status         text not null default 'active' check (status in ('active','paused','completed','on_hold')),
  priority_level text not null default 'medium' check (priority_level in ('critical','high','medium','low')),
  next_action    text,
  deadline       date,
  waiting_on     text,
  notes          text,
  parked         boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);
alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id);

-- ─── Dictation Entries ───────────────────────────────────────
create table if not exists public.dictation_entries (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  raw_text         text not null,
  summary          text,
  emotional_read   text,
  tags             text[] default '{}',
  entry_type       text default 'journal' check (entry_type in ('journal','dream','task','work_note','message_draft','email_draft','project_note','money_note','spiritual','career')),
  extracted_tasks  jsonb,
  extracted_people text[] default '{}',
  extracted_dates  text[] default '{}',
  next_step        text,
  affirmation      text,
  human_design_note text,
  created_at       timestamptz default now()
);
alter table public.dictation_entries enable row level security;
create policy "Users manage own dictation" on public.dictation_entries for all using (auth.uid() = user_id);
create index if not exists idx_dictation_user    on public.dictation_entries(user_id);
create index if not exists idx_dictation_created on public.dictation_entries(created_at desc);

-- ─── Journal Entries ─────────────────────────────────────────
create table if not exists public.journal_entries (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  date                date not null default current_date,
  mood_rating         integer check (mood_rating >= 1 and mood_rating <= 10),
  energy_rating       integer check (energy_rating >= 1 and energy_rating <= 10),
  sleep_rating        integer check (sleep_rating >= 1 and sleep_rating <= 10),
  body_state          text,
  entry_text          text,
  assistant_reflection text,
  wake_time           time,
  support_need        text,
  pride_goal          text,
  created_at          timestamptz default now()
);
alter table public.journal_entries enable row level security;
create policy "Users manage own journal" on public.journal_entries for all using (auth.uid() = user_id);
create unique index if not exists idx_journal_user_date on public.journal_entries(user_id, date);

-- ─── Dream Logs ──────────────────────────────────────────────
create table if not exists public.dream_logs (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date        date not null default current_date,
  raw_text    text not null,
  emotions    text[] default '{}',
  symbols     text[] default '{}',
  people      text[] default '{}',
  reflection  text,
  prompt      text,
  created_at  timestamptz default now()
);
alter table public.dream_logs enable row level security;
create policy "Users manage own dreams" on public.dream_logs for all using (auth.uid() = user_id);

-- ─── External Emails ─────────────────────────────────────────
create table if not exists public.external_emails (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  account_id        uuid,
  provider_message_id text,
  sender            text,
  recipients        text[] default '{}',
  subject           text,
  snippet           text,
  received_at       timestamptz default now(),
  labels            text[] default '{}',
  needs_reply       boolean default false,
  urgency_level     text default 'medium' check (urgency_level in ('low','medium','high','critical')),
  client_name       text,
  extracted_tasks   jsonb,
  suggested_reply   text,
  ai_summary        text,
  suggested_action  text,
  source_url        text,
  created_at        timestamptz default now()
);
alter table public.external_emails enable row level security;
create policy "Users manage own emails" on public.external_emails for all using (auth.uid() = user_id);

-- ─── Legacy email tables ──────────────────────────────────────
create table if not exists public.emails (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  gmail_message_id text,
  sender          text,
  sender_email    text,
  subject         text,
  snippet         text,
  body            text,
  received_at     timestamptz default now(),
  urgency_level   text default 'medium',
  needs_response  boolean default false,
  ai_summary      text,
  suggested_action text,
  created_at      timestamptz default now()
);
alter table public.emails enable row level security;
create policy "Users manage own legacy emails" on public.emails for all using (auth.uid() = user_id);

create table if not exists public.email_suggestions (
  id         uuid default uuid_generate_v4() primary key,
  email_id   uuid references public.emails(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade not null,
  tone       text check (tone in ('short','professional','warm')),
  reply_text text,
  created_at timestamptz default now()
);
alter table public.email_suggestions enable row level security;
create policy "Users manage own email suggestions" on public.email_suggestions for all using (auth.uid() = user_id);

-- ─── Calendar Events ─────────────────────────────────────────
create table if not exists public.calendar_events (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  account_id       uuid,
  external_event_id text,
  title            text not null,
  start_time       timestamptz not null,
  end_time         timestamptz,
  attendees        text[] default '{}',
  location         text,
  description      text,
  meeting_link     text,
  prep_notes       text,
  priority         text default 'medium',
  created_at       timestamptz default now()
);
alter table public.calendar_events enable row level security;
create policy "Users manage own events" on public.calendar_events for all using (auth.uid() = user_id);

-- ─── Connected Accounts ──────────────────────────────────────
create table if not exists public.connected_accounts (
  id                      uuid default uuid_generate_v4() primary key,
  user_id                 uuid references auth.users(id) on delete cascade not null,
  provider                text not null check (provider in ('gmail','google_calendar','dryphub','other')),
  email_address           text,
  access_token_encrypted  text,
  refresh_token_encrypted text,
  scopes                  text[] default '{}',
  connected_at            timestamptz default now(),
  last_sync_at            timestamptz,
  status                  text default 'connected' check (status in ('connected','disconnected','error','pending'))
);
alter table public.connected_accounts enable row level security;
create policy "Users manage own accounts" on public.connected_accounts for all using (auth.uid() = user_id);

-- ─── Gmail Tokens ─────────────────────────────────────────────
-- NOTE: gmail_tokens already exists live with real connected accounts
-- (different structure, no user_id) — intentionally skipped here so
-- this script doesn't collide with it. Do not recreate.

-- ─── DRYPHub Tasks ──────────────────────────────────────────
create table if not exists public.dryphub_tasks (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  dryphub_task_id text,
  client_name     text,
  project_name    text,
  title           text not null,
  description     text,
  status          text default 'todo',
  priority        text default 'medium',
  due_date        date,
  assigned_to     text,
  source_url      text,
  last_synced_at  timestamptz default now()
);
alter table public.dryphub_tasks enable row level security;
create policy "Users manage own dryphub tasks" on public.dryphub_tasks for all using (auth.uid() = user_id);

-- ─── Daily Briefs ─────────────────────────────────────────────
create table if not exists public.daily_briefs (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references auth.users(id) on delete cascade not null,
  date                 date not null default current_date,
  mood_summary         text,
  work_summary         text,
  email_summary        text,
  calendar_summary     text,
  top_3                text[] default '{}',
  can_wait             text[] default '{}',
  spiritual_message    text,
  human_design_message text,
  chart_reflection     text,
  affirmation          text,
  first_step           text,
  ai_message           text,
  created_at           timestamptz default now()
);
alter table public.daily_briefs enable row level security;
create policy "Users manage own briefs" on public.daily_briefs for all using (auth.uid() = user_id);

-- ─── Message Suggestions ─────────────────────────────────────
create table if not exists public.message_suggestions (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  original_message text not null,
  sender_name     text,
  context         text,
  ai_summary      text,
  emotional_tone  text,
  urgency_level   text default 'medium',
  wound_reply     text,
  wisdom_reply    text,
  suggested_reply text,
  short_reply     text,
  soft_reply      text,
  direct_reply    text,
  reflection      text,
  created_at      timestamptz default now()
);
alter table public.message_suggestions enable row level security;
create policy "Users manage own message suggestions" on public.message_suggestions for all using (auth.uid() = user_id);

-- ─── Brain Dumps ─────────────────────────────────────────────
create table if not exists public.brain_dumps (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  raw_text      text not null,
  ai_summary    text,
  emotional_note text,
  created_tasks jsonb,
  created_at    timestamptz default now()
);
alter table public.brain_dumps enable row level security;
create policy "Users manage own brain dumps" on public.brain_dumps for all using (auth.uid() = user_id);

-- ─── Money Logs ──────────────────────────────────────────────
create table if not exists public.money_logs (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null default current_date,
  type       text not null check (type in ('expense','income','saving','investment')),
  amount     numeric(12,2) not null,
  category   text,
  note       text,
  created_at timestamptz default now()
);
alter table public.money_logs enable row level security;
create policy "Users manage own money logs" on public.money_logs for all using (auth.uid() = user_id);
create index if not exists idx_money_user_date on public.money_logs(user_id, date desc);

-- ─── Trading Journal ─────────────────────────────────────────
create table if not exists public.trading_journal (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  date            date not null default current_date,
  asset           text not null,
  setup           text not null,
  entry           numeric(12,4),
  exit            numeric(12,4),
  risk            text,
  result          text check (result in ('win','loss','breakeven','open')),
  pnl             numeric(12,2),
  emotion_before  text,
  emotion_after   text,
  lesson          text,
  followed_rules  boolean default true,
  created_at      timestamptz default now()
);
alter table public.trading_journal enable row level security;
create policy "Users manage own trading" on public.trading_journal for all using (auth.uid() = user_id);

-- ─── Bedtime Plans ───────────────────────────────────────────
create table if not exists public.bedtime_plans (
  id                 uuid default uuid_generate_v4() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  date               date not null default current_date,
  wake_goal          time,
  sleep_goal_hours   numeric(3,1),
  drive_home_minutes integer default 0,
  prep_minutes       integer default 45,
  stop_work_time     time,
  leave_time         time,
  home_time          time,
  bed_time           time,
  lights_out_time    time,
  current_location   text,
  message            text,
  created_at         timestamptz default now()
);
alter table public.bedtime_plans enable row level security;
create policy "Users manage own bedtime plans" on public.bedtime_plans for all using (auth.uid() = user_id);

-- ─── Career Reflections ──────────────────────────────────────
create table if not exists public.career_reflections (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  date                date not null default current_date,
  current_pattern     text,
  highest_self_action text,
  career_lesson       text,
  recognition_check   text,
  top_career_priority text,
  chart_theme         text,
  created_at          timestamptz default now()
);
alter table public.career_reflections enable row level security;
create policy "Users manage own career reflections" on public.career_reflections for all using (auth.uid() = user_id);

-- ─── Lesson Tracker ──────────────────────────────────────────
create table if not exists public.lesson_tracker (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references auth.users(id) on delete cascade not null,
  week_start           date not null,
  triggers             text,
  avoided_items        text,
  completed_items      text,
  lessons              text,
  overgave_to          text,
  protected_peace      text,
  highest_self_moments text,
  chart_theme          text,
  ai_reflection        text,
  created_at           timestamptz default now()
);
alter table public.lesson_tracker enable row level security;
create policy "Users manage own lessons" on public.lesson_tracker for all using (auth.uid() = user_id);
create unique index if not exists idx_lesson_user_week on public.lesson_tracker(user_id, week_start);

-- ─── Notifications ───────────────────────────────────────────
create table if not exists public.notifications (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  type           text,
  title          text,
  body           text,
  scheduled_for  timestamptz,
  sent_at        timestamptz,
  status         text default 'pending' check (status in ('pending','sent','failed','cancelled')),
  tone           text default 'gentle'
);
alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications for all using (auth.uid() = user_id);

-- ─── Sync Logs ───────────────────────────────────────────────
create table if not exists public.sync_logs (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  provider         text,
  sync_started_at  timestamptz default now(),
  sync_finished_at timestamptz,
  status           text default 'running' check (status in ('running','success','error')),
  error_message    text
);
alter table public.sync_logs enable row level security;
create policy "Users manage own sync logs" on public.sync_logs for all using (auth.uid() = user_id);

-- ─── Morning Messages ─────────────────────────────────────────
create table if not exists public.morning_messages (
  id                   uuid default uuid_generate_v4() primary key,
  user_id              uuid references auth.users(id) on delete cascade not null,
  date                 date not null,
  greeting             text,
  soul_read            text,
  astrology_reflection text,
  human_design_reminder text,
  work_awareness       text,
  highest_self_lesson  text,
  protect              text,
  release              text,
  first_move           text,
  crystal              text,
  crystal_why          text,
  mantra               text,
  tone_mode            text,
  day_theme            text,
  astrology_context    jsonb,
  life_context         jsonb,
  generated_from       jsonb,
  user_rating          smallint check (user_rating between 1 and 5),
  created_at           timestamptz default now()
);
alter table public.morning_messages enable row level security;
create policy "Users manage own morning messages" on public.morning_messages for all using (auth.uid() = user_id);
create unique index morning_messages_user_date_idx on public.morning_messages (user_id, date);
