-- Run this in Supabase Dashboard → SQL Editor, after luna_profile_schema.sql
-- has already been applied.
--
-- Seeds one row per profile table for Zoe so buildLunaContext() (src/lib/luna/context.ts)
-- has real data to read instead of nulls. The column DEFAULTs on these tables already
-- encode Zoe's known chart/Human Design/personality (see luna_profile_schema.sql), so a
-- bare insert of just user_id is enough — every other column fills in from its default.
--
-- Uses the same ZOE_USER_ID already hardcoded across the app (src/app/api/chat/message,
-- src/app/api/money/*, etc.) so this seed lines up with existing single-tenant behavior.

insert into public.luna_identity_profile (user_id)
values ('98f5b277-bb63-41d5-89ec-0edadc1e2858')
on conflict (user_id) do nothing;

insert into public.astrology_profiles (user_id)
values ('98f5b277-bb63-41d5-89ec-0edadc1e2858')
on conflict (user_id) do nothing;

insert into public.human_design_profile (user_id)
values ('98f5b277-bb63-41d5-89ec-0edadc1e2858')
on conflict (user_id) do nothing;
