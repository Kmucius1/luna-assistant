-- Adds pantry-staple tracking on top of the existing food_pantry_items log.
-- A "staple" is just a row where staple_group is not null — no new table.
-- status is nullable so existing manual/photo/grocery_list rows (which have
-- no status concept) are completely unaffected.
--
-- Run this once via the Supabase SQL editor — the app's service-role key
-- cannot run DDL, only row-level reads/writes.
alter table public.food_pantry_items
  add column if not exists status text check (status in ('in_stock', 'low', 'empty')),
  add column if not exists staple_group text check (staple_group in ('protein', 'meals', 'breakfast', 'easy_backup'));

create index if not exists idx_food_pantry_items_staple_group
  on public.food_pantry_items(user_id, staple_group) where staple_group is not null;
