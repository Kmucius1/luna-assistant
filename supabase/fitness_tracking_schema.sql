-- Backs the Fitness page's Weight and Progress Photos tracking - both were
-- previously "Coming Soon" placeholders with no real feature behind them.

create table if not exists public.body_weight_logs (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date_key    text not null,
  weight_lbs  numeric not null,
  created_at  timestamptz default now(),
  unique (user_id, date_key)
);

alter table public.body_weight_logs enable row level security;
create policy "Users manage own weight logs" on public.body_weight_logs for all using (auth.uid() = user_id);
create index idx_body_weight_logs_user_date on public.body_weight_logs(user_id, date_key desc);

-- Photo itself is stored as a base64 data URL, same pattern as
-- worn_outfits.photo_url - read once for display, never uploaded to a
-- separate storage bucket.
create table if not exists public.progress_photos (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date_key    text not null,
  photo_url   text not null,
  note        text,
  created_at  timestamptz default now()
);

alter table public.progress_photos enable row level security;
create policy "Users manage own progress photos" on public.progress_photos for all using (auth.uid() = user_id);
create index idx_progress_photos_user_date on public.progress_photos(user_id, date_key desc);
