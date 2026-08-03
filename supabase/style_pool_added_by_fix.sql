-- The daily style-pool generator inserts Pinterest finds with
-- added_by: 'pinterest', but this table's check constraint never allowed
-- that value (only 'seed'/'zoe'/'ai_generated') — every Pinterest insert
-- has been silently failing since this feature shipped. The generation
-- route reported success anyway (it counted images before the insert, not
-- after), so the pool has been stuck at its original 33 seed/ai_generated
-- images for weeks while daily_generation_cache kept marking each day
-- "done" and never retrying. Once every one of those 33 gets voted on,
-- the UI falls back to 3 hardcoded local images with no vote tracking at
-- all, which is why the same image kept reappearing.
alter table public.style_pool_images drop constraint style_pool_images_added_by_check;
alter table public.style_pool_images add constraint style_pool_images_added_by_check
  check (added_by in ('seed','zoe','ai_generated','pinterest'));
