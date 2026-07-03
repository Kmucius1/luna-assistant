-- Run this in Supabase Dashboard → SQL Editor, AFTER atelier_schema.sql.
-- Needed so the style board's like/unlike upsert (src/app/api/atelier/style-board/route.ts)
-- can target one row per (user, preloaded look) instead of creating duplicates.

alter table public.style_references
  add constraint style_references_user_ref_unique unique (user_id, ref_number);
