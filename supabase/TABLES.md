# Table register

Generated 2026-10-13 from a static read of `src/`.

## Tables owned by the DRYP Hub database, not this one

`accounts`, `contacts`, `notes` (and the DRYP-side `tasks`, `services`, `projects`) are read
through `src/lib/dryp-crm.ts`, which connects to a **separate** Supabase project
(`DRYP_SUPABASE_URL`). They are deliberately not defined in this folder.

## Defined here, no `.from('<table>')` call found in `src/`

These are candidates for cleanup. **Nothing here drops them.** Before removing any,
confirm they are empty in the live database and that nothing reaches them through
raw SQL, RPC, or a multi-line `.from(` call that the scan could not see.

| Table | Defined in |
|---|---|
| `bedtime_plans` | `supabase/schema.sql` |
| `bill_payments` | `supabase/luna_money_v2_schema.sql` |
| `budgets` | `supabase/luna_money_v2_schema.sql` |
| `calendar_events` | `supabase/schema.sql` |
| `career_reflections` | `supabase/schema.sql` |
| `connected_accounts` | `supabase/schema.sql` |
| `daily_briefs` | `supabase/schema.sql` |
| `dream_logs` | `supabase/schema.sql` |
| `dryphub_tasks` | `supabase/schema.sql` |
| `email_suggestions` | `supabase/schema.sql` |
| `emails` | `supabase/schema.sql` |
| `external_emails` | `supabase/schema.sql` |
| `fashion_materials` | `supabase/atelier_schema.sql` |
| `generated_looks` | `supabase/atelier_schema.sql` |
| `journal_entries` | `supabase/schema.sql` |
| `lesson_tracker` | `supabase/schema.sql` |
| `money_bills` | `supabase/plaid_banking.sql` |
| `money_budgets` | `supabase/plaid_banking.sql` |
| `money_categories` | `supabase/plaid_banking.sql` |
| `money_import_rows` | `supabase/plaid_banking.sql` |
| `money_imports` | `supabase/plaid_banking.sql` |
| `money_logs` | `supabase/schema.sql` |
| `money_reviews` | `supabase/plaid_banking.sql` |
| `money_rules` | `supabase/plaid_banking.sql` |
| `money_subscriptions` | `supabase/plaid_banking.sql` |
| `money_transactions` | `supabase/plaid_banking.sql` |
| `morning_messages` | `supabase/schema.sql` |
| `notifications` | `supabase/schema.sql` |
| `personality_patterns` | `supabase/luna_profile_schema.sql` |
| `plaid_accounts` | `supabase/plaid_banking.sql` |
| `plaud_conversations` | `supabase/plaud_conversations_schema.sql` |
| `receipt_items` | `supabase/luna_money_v2_schema.sql` |
| `receipts` | `supabase/luna_money_v2_schema.sql` |
| `source_registry` | `supabase/luna_astrology_readings_schema.sql` |
| `style_avatar_profiles` | `supabase/atelier_schema.sql` |
| `style_feedback` | `supabase/atelier_schema.sql` |
| `style_profile` | `supabase/luna_profile_schema.sql` |
| `sync_logs` | `supabase/schema.sql` |
| `trading_journal` | `supabase/schema.sql` |
| `trip_collaborators` | `supabase/travel_schema.sql` |
| `users` | `supabase/schema.sql` |

The whole `money_*` v1 family was replaced by the v2 tables in
`luna_money_v2_schema.sql`. Prefer a `DROP` in a reviewed, dated migration over
editing the old files.

## Tables with migrations added

- `priority_contacts`, `email_classifications` → `gmail_priority_and_classification_schema.sql`
