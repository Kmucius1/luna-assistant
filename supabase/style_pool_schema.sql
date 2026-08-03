-- Style pool — a growing set of real Pinterest-style images Zoe reviews with
-- heart (like) / deny (dislike). Rotates a random daily selection so LUNA
-- builds an understanding of her taste over time without repeating images
-- she's already voted on.
create table if not exists public.style_pool_images (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  image_url   text not null,
  label       text,
  added_by    text not null default 'seed' check (added_by in ('seed','zoe','ai_generated','pinterest')),
  created_at  timestamptz default now()
);

alter table public.style_pool_images enable row level security;
create policy "Users manage own style pool images" on public.style_pool_images for all using (auth.uid() = user_id);

create table if not exists public.style_pool_votes (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  image_id    uuid references public.style_pool_images(id) on delete cascade not null,
  vote        text not null check (vote in ('liked','denied')),
  created_at  timestamptz default now(),
  unique (user_id, image_id)
);

alter table public.style_pool_votes enable row level security;
create policy "Users manage own style pool votes" on public.style_pool_votes for all using (auth.uid() = user_id);
create index idx_style_pool_votes_user on public.style_pool_votes(user_id, image_id);
