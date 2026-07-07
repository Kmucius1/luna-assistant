-- ============================================================
-- LUNA Atelier — Shopping / Wishlist Schema
-- Run in Supabase SQL Editor after atelier_schema.sql
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.shopping_wishlist_items (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  list       text not null default 'Buy' check (list in ('Buy', 'Thrift', 'Fabric', 'Accessory')),
  text       text not null,
  created_at timestamptz default now()
);
alter table public.shopping_wishlist_items enable row level security;
create policy "Users own wishlist items" on public.shopping_wishlist_items for all using (auth.uid() = user_id);
