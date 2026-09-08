-- Payday Reset + "When I Get Paid" wishlist + purchase prioritization —
-- the three remaining personal-financials gaps, all in the same Money
-- module as everything else this session.

create table if not exists public.wishlist_items (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  expected_price  numeric(10,2),
  category        text not null check (category in ('need_now', 'makes_life_easier', 'feel_good_upgrade', 'can_wait')),
  why_wanted      text,
  purchased       boolean not null default false,
  created_at      timestamptz default now()
);

alter table public.wishlist_items enable row level security;
create policy "Users manage own wishlist items" on public.wishlist_items for all using (auth.uid() = user_id);
create index idx_wishlist_items_user on public.wishlist_items(user_id, purchased, category);

-- One row per payday — the real allocation she chose, kept as history
-- rather than only a live in-the-moment calculation.
create table if not exists public.payday_allocations (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  pay_date          date not null,
  total_amount      numeric(10,2) not null,
  allocations       jsonb not null default '{}'::jsonb,
  created_at        timestamptz default now()
);

alter table public.payday_allocations enable row level security;
create policy "Users manage own payday allocations" on public.payday_allocations for all using (auth.uid() = user_id);
create index idx_payday_allocations_user_date on public.payday_allocations(user_id, pay_date desc);
