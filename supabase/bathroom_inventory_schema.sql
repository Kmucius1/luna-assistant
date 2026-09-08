-- Real bathroom/self-care restock tracking — an editable list, not a fixed
-- staple set like the pantry: every row (seeded defaults included) is a real,
-- deletable/renameable item from day one, so "editable" actually means
-- editable rather than a virtual merge over a hardcoded array.
create table if not exists public.bathroom_inventory_items (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  status          text not null default 'in_stock' check (status in ('in_stock', 'low', 'empty')),
  created_at      timestamptz default now()
);

alter table public.bathroom_inventory_items enable row level security;
create policy "Users manage own bathroom inventory" on public.bathroom_inventory_items for all using (auth.uid() = user_id);
create index idx_bathroom_inventory_user on public.bathroom_inventory_items(user_id, created_at);
