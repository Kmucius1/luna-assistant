-- The Wellness page ('wellness'), Astrology page ('astrology'), and the new
-- Today page night reflection ('daily_reflection') all save journal entries
-- with entry_type values that were never added to this table's check
-- constraint — every one of those saves has been silently failing with a
-- 500 that the client didn't surface. Widens the constraint to match what
-- the app actually sends. Run once against the existing table (matches
-- supabase/journal_page_entries_schema.sql, which now creates it correctly
-- from scratch for any fresh environment).
alter table public.journal_page_entries drop constraint journal_page_entries_entry_type_check;
alter table public.journal_page_entries add constraint journal_page_entries_entry_type_check
  check (entry_type in ('journal','dream','gratitude','shadow','lesson','wellness','astrology','daily_reflection'));
