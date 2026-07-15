-- Worn outfits — a log of Zoe's actual daily outfit photos (full-body shot,
-- not cropped). Separate from wardrobe_items (individual garment pieces,
-- auto-cropped from these same uploads) so she has a real day-by-day record
-- of what she wore, not just a garment catalog.
create table if not exists public.worn_outfits (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  date_key    text not null,
  photo_url   text not null,
  created_at  timestamptz default now()
);

alter table public.worn_outfits enable row level security;
create policy "Users manage own worn outfits" on public.worn_outfits for all using (auth.uid() = user_id);
create index idx_worn_outfits_user_date on public.worn_outfits(user_id, date_key desc);
