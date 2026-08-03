-- Adds an explicit storage location (fridge/freezer/pantry) to
-- food_pantry_items, separate from `category` (which is about food type
-- for grocery-list grouping, not where it physically lives — e.g. frozen
-- blueberries are category=frozen already, but raw chicken breast is
-- category=protein whether it's in the fridge or freezer). Backfills
-- existing rows with a sensible default derived from category.

alter table public.food_pantry_items
  add column if not exists storage text not null default 'fridge'
  check (storage in ('fridge', 'freezer', 'pantry'));

update public.food_pantry_items
set storage = case
  when category = 'frozen' then 'freezer'
  when category in ('pantry', 'bakery_and_grains') then 'pantry'
  else 'fridge'
end;
