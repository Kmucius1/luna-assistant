-- Adds activity_type to workout_logs so non-gym movement choices (walk,
-- pilates/yoga, dance, beach, trail, treadmill+stretch, mobility/stretch,
-- rest) can be logged without forcing gym-shaped fields. Defaults existing
-- rows to 'gym' for backward compatibility.
--
-- Run this once via the Supabase SQL editor — the app's service-role key
-- cannot run DDL, only row-level reads/writes, so this can't be applied
-- automatically from the codebase.
alter table public.workout_logs add column if not exists activity_type text default 'gym';
