-- Luna 30-Day Life OS (Oct 13 – Nov 12, 2026).
-- Three small tables; day-level detail lives in jsonb so the plan can evolve
-- without migrations. History is never deleted: rolling a day over only reads
-- yesterday, it never edits it.

create table if not exists public.luna_30d_program (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  start_date     text not null default '2026-10-13',
  review_date    text not null default '2026-11-12',
  camera_target  numeric,
  settings       jsonb not null default '{}'::jsonb,
  created_at     timestamptz default now()
);

create table if not exists public.luna_30d_days (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date_key    text not null,
  energy      text check (energy in ('low','normal','high')),
  mode        text check (mode in ('normal','stuck','spiral')) default 'normal',
  gym_today   boolean,
  gym_tomorrow boolean,
  top3        jsonb not null default '[]'::jsonb,   -- [{text, done}]
  checks      jsonb not null default '{}'::jsonb,   -- {check_id: true}
  stats       jsonb not null default '{}'::jsonb,   -- clips, edited, posted, ideas, outfit_rating...
  notes       jsonb not null default '{}'::jsonb,   -- outfit notes, private win, journal, EOD
  overrides   jsonb not null default '{}'::jsonb,   -- unusual-day edits (late work, off day, custom evening)
  updated_at  timestamptz default now(),
  unique (user_id, date_key)
);

create table if not exists public.luna_30d_items (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  kind        text not null,   -- closet | brand_idea | fund_entry | content_idea | win | outfit_combo | hobby | place | social | camera_note
  status      text,            -- closet: sort|keep|sell|donate|maybe|photographed|listed|sold
  amount      numeric,         -- closet sold price / fund entry
  data        jsonb not null default '{}'::jsonb,
  date_key    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.luna_30d_program enable row level security;
alter table public.luna_30d_days enable row level security;
alter table public.luna_30d_items enable row level security;
create policy "own program" on public.luna_30d_program for all using (auth.uid() = user_id);
create policy "own days" on public.luna_30d_days for all using (auth.uid() = user_id);
create policy "own items" on public.luna_30d_items for all using (auth.uid() = user_id);
create index if not exists idx_30d_days_user_date on public.luna_30d_days(user_id, date_key desc);
create index if not exists idx_30d_items_user_kind on public.luna_30d_items(user_id, kind, created_at desc);
