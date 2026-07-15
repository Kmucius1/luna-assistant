-- Manifestation intentions / vision board
create table if not exists public.intentions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  text        text not null,
  done        boolean default false,
  created_at  timestamptz default now()
);

alter table public.intentions enable row level security;
create policy "Users manage own intentions" on public.intentions for all using (auth.uid() = user_id);
create index idx_intentions_user_created on public.intentions(user_id, created_at desc);
