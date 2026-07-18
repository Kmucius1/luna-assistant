# Luna Money System — Setup & Known Limits

Built against `CLAUDE_CODE_LUNA_MONEY_SYSTEM_SPEC.md`, `luna_money_schema.sql`, and
`luna_money_initial_recurring_charges.json`. Covers Phase 1 and Phase 2 of the spec's
build order. Phase 3 (budgets, savings, debt UI, alerts, chat tools) and Phase 4
(receipts, price book, store comparison) have their database tables in place but no
UI/logic yet — see "Pending" below.

## Setup

1. **Run the migration.** In the Supabase SQL editor, run `supabase/luna_money_v2_schema.sql`.
   This drops the old empty scaffold tables (`plaid_accounts`, `money_transactions`,
   `money_bills`, `money_subscriptions`, `money_alerts`, `money_rules`, `money_budgets`,
   `money_categories`, `money_imports`, `money_import_rows`, `money_reviews` — confirmed
   zero real rows in any of them before dropping) and creates the full new schema:
   `financial_accounts`, `financial_imports`, `merchant_aliases`, `transactions`, `bills`,
   `bill_payments`, `subscriptions`, `duplicate_charge_alerts`, `income_events`, `budgets`,
   `savings_goals`, `debts`, `receipts`, `receipt_items`, `money_preferences`, `money_alerts`.
   Every table has RLS restricting all four operations to `auth.uid() = user_id`.

2. **Environment variables required** — no new ones. Reuses:
   - `GROQ_API_KEY` — merchant/category AI and statement/screenshot extraction
   - `PLAID_CLIENT_ID`, `PLAID_SANDBOX_SECRET` (or `PLAID_SECRET` for production) — bank linking
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — data access

3. **Seed starting data.** `POST /api/money/seed` — creates the 3 manual accounts
   (Bank of America SafeBalance ···6200, Chase Total Checking ···8619, Credit One Visa
   ···0372) and the 26 subscription review entries from `luna_money_initial_recurring_charges.json`
   (Credit One Credit Protect flagged to cancel, eDreams Prime flagged to cancel, Acorns/South
   Beach Tanning/Fanbasis/Frontier AI flagged to review, etc). Safe to call more than once —
   skips accounts/subscriptions that already exist.

4. **Connect a real bank** (optional, in addition to manual/CSV/PDF/screenshot import) —
   `/money/connect` uses Plaid Link. Real Plaid transactions run through the exact same
   pipeline as an imported statement (merchant normalization, transfer/card-payment/refund
   matching, recurring + duplicate detection).

## Features completed (Phase 1 + 2)

- **Database + RLS** — full schema live, every table locked to its owner.
- **Financial accounts** — checking/savings/credit card/cash/business/loan, manual add,
  balance, credit limit, minimum payment, due date, include-in-safe-to-spend toggle.
- **Imports** — CSV (flexible header detection), PDF (text extraction via `pdf-parse` +
  AI structuring), screenshot/image (Groq vision), and manual entry. All idempotent via a
  fingerprint of user + account + posted date + normalized merchant + amount + direction —
  re-uploading the same statement doesn't duplicate transactions.
- **Transactions** — full CRUD, filterable by ownership/category/account/search, inline
  correction of category/ownership (acceptance test 12).
- **Merchant normalization** — every merchant from the spec's list (OpenAI, Anthropic,
  AutoDS, Vercel, GoDaddy, Netflix, Hulu, Credit One, AT&T, Spectrum, Acorns, eDreams
  Prime, Fanbasis, Frontier AI, South Beach Tanning, and the rest), plus Zoe's own saved
  aliases which override the built-ins, with a "reapply to existing transactions" option.
- **Transfer matching** — same amount, opposite direction, different account, within 3
  days → marked `transfer`, never counted as income or spending.
- **Credit-card payment matching** — inflow on a credit-card account paired with a
  matching outflow on another account → both marked `debt_payment`, not spending.
- **Refund matching** — inflow on the same account matching an earlier outflow's merchant
  → marked as a refund, category copied from the original charge.
- **Personal vs. business labels** — all 9 ownership types from the spec, plus the 8
  business-project options, with a dashboard card for business expenses paid personally.
- **Recurring-charge detection** — groups by merchant, infers weekly/biweekly/monthly/
  quarterly/annual cadence, 2 occurrences → `possible_recurring`, 3+ → `recurring` and a
  `subscriptions` row (never resets a status Zoe already set).
- **Duplicate detector** — exact severity rules from the spec: high (same merchant+amount
  within 10 days), medium (same merchant within 35 days), low (different account, or a
  price increase past a threshold). Canceled-subscription-charging-again is always high
  priority (acceptance test 5).
- **Bills calendar** — due-date urgency coloring, autopay/estimated-vs-confirmed labeling,
  mark paid.
- **Subscription cleanup center** — all 7 statuses, seeded from the initial review list,
  canceled subscriptions get watched for stray charges.
- **Safe-to-spend** — the exact formula from the spec (posted checking/cash + confirmed
  income − pending outflows − bills due − grocery/gas reserves − minimum debt payments −
  planned savings − safety buffer), plus the daily-spending-amount division.
- **Mobile Money dashboard** — Safe to Spend as the largest number, plus all 12 spec'd
  cards (bills due, subscription alerts, duplicates, personal/business spending,
  reimbursements owed, savings, debt, unknown transactions).

## Known limits / honestly not computed

- **Medication & necessity reserve** — the spec's safe-to-spend formula includes this, but
  `money_preferences` (as given in the schema) only has grocery/gas/personal weekly
  targets, no necessity field. Currently contributes `$0` rather than guessing a number.
- **Planned savings (per-period)** — `savings_goals` has `target_amount`/`current_amount`
  but no recurring contribution-rule field in the given schema, so it also contributes
  `$0` to safe-to-spend rather than inventing a contribution amount.
- **Subscription price-increase threshold** — the spec calls for "beyond Zoe's threshold"
  but there's no schema field for it; a fixed 15% default is used (`src/lib/money/duplicates.ts`).
- **Screenshots of every mobile screen** — I don't have a way to produce these. Browser
  automation is off-limits this session per your own instruction, and every `/money/*`
  page sits behind Supabase auth, so it can't be captured via a plain request either. Happy
  to walk through the pages live with you instead, or take screenshots if you send them
  from your phone.

## Pending (Phase 3 / Phase 4 — tables exist, no UI/logic yet)

- Budgets (`/money/budgets`), Savings (`/money/savings`), Debt (`/money/debt`) screens
- Weekly reports, the full alerts feed beyond duplicates/subscriptions, Luna chat tools
  ("What can I spend today?", "Where can I cut $300?", etc.)
- Receipts, price book, shopping-list comparison, store savings suggestions (`/money/stores`)
- Credit One debt seed data (limit $300, statement balance, fees/interest YTD) — the
  `debts` table exists but nothing seeds it yet; that's Phase 3 scope.

## Tests

The spec's 15 acceptance tests can't be run as an automated suite yet (no test runner
wired into this app for API routes). I verified the logic directly against representative
scenarios instead — transfer matching, credit-card payment matching, and duplicate
severity all produced correct results when exercised with realistic transaction data. A
full pass against your real imported statements will be the strongest verification once
the migration is run and a first import happens.
