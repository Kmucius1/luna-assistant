-- Luna Money System v2 — full replacement of the earlier scaffold schema
-- (plaid_accounts, money_transactions, money_bills, money_subscriptions,
-- money_alerts, money_rules, money_budgets, money_categories, money_imports,
-- money_import_rows, money_reviews). Confirmed with Zoe: zero real rows
-- exist in any of those tables (Plaid was never fully connected), so this
-- is a clean swap, not a data migration.
--
-- plaid_items (the actual OAuth-style connection/access-token store) is
-- kept as-is — it has no equivalent in the new schema and isn't a "money
-- data" table, just credential storage for the live bank sync.

drop table if exists public.plaid_accounts cascade;
drop table if exists public.money_transactions cascade;
drop table if exists public.money_categories cascade;
drop table if exists public.money_budgets cascade;
drop table if exists public.money_bills cascade;
drop table if exists public.money_subscriptions cascade;
drop table if exists public.money_alerts cascade;
drop table if exists public.money_rules cascade;
drop table if exists public.money_imports cascade;
drop table if exists public.money_import_rows cascade;
drop table if exists public.money_reviews cascade;

create extension if not exists pgcrypto;

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  institution_name text,
  account_type text not null check (account_type in ('checking','savings','credit_card','cash','business_checking','business_credit_card','loan')),
  last_four text,
  ownership_type text not null default 'personal' check (ownership_type in ('personal','business')),
  current_balance numeric(12,2),
  available_balance numeric(12,2),
  credit_limit numeric(12,2),
  statement_balance numeric(12,2),
  minimum_payment numeric(12,2),
  payment_due_date date,
  include_in_safe_to_spend boolean not null default true,
  is_archived boolean not null default false,
  -- Additive: links a manually-tracked account to its live Plaid connection.
  -- Null for pure manual/CSV-only accounts.
  plaid_account_id text unique,
  plaid_item_id uuid references public.plaid_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  source_type text not null check (source_type in ('csv','pdf','image','manual','plaid')),
  source_filename text,
  statement_start date,
  statement_end date,
  import_hash text,
  status text not null default 'pending' check (status in ('pending','processing','complete','failed')),
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists financial_imports_user_hash_idx
  on public.financial_imports(user_id, import_hash)
  where import_hash is not null;

create table if not exists public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_pattern text not null,
  normalized_name text not null,
  default_category text,
  default_ownership_type text,
  created_at timestamptz not null default now(),
  unique(user_id, raw_pattern)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,
  import_id uuid references public.financial_imports(id) on delete set null,
  transaction_date date,
  posted_date date,
  merchant_raw text,
  merchant_normalized text,
  description text,
  amount numeric(12,2) not null,
  direction text not null check (direction in ('inflow','outflow')),
  status text not null default 'posted' check (status in ('pending','posted','reversed')),
  category text,
  subcategory text,
  ownership_type text not null default 'unknown' check (ownership_type in ('personal','dryp_business','client_expense','linkd_up_event','reimbursable','shared_expense','transfer','debt_payment','unknown')),
  project_name text,
  reimbursable boolean not null default false,
  recurring_status text not null default 'unknown' check (recurring_status in ('unknown','one_time','recurring','possible_recurring')),
  transfer_pair_id uuid,
  matched_transaction_id uuid references public.transactions(id) on delete set null,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','confirmed','needs_review','ignored')),
  is_refund boolean not null default false,
  original_transaction_id uuid references public.transactions(id) on delete set null,
  fingerprint text not null,
  notes text,
  -- Additive: dedupe key when a transaction arrives via live Plaid sync
  -- rather than csv/pdf/image/manual import.
  plaid_transaction_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, fingerprint)
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, coalesce(posted_date, transaction_date) desc);
create index if not exists transactions_user_merchant_idx on public.transactions(user_id, merchant_normalized);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  name text not null,
  merchant_normalized text,
  expected_amount numeric(12,2),
  minimum_amount numeric(12,2),
  due_date date,
  expected_window_start date,
  expected_window_end date,
  date_is_confirmed boolean not null default false,
  autopay_status text not null default 'unknown' check (autopay_status in ('on','off','unknown')),
  amount_type text not null default 'variable' check (amount_type in ('fixed','variable')),
  requirement_type text not null default 'required' check (requirement_type in ('required','optional')),
  ownership_type text not null default 'personal' check (ownership_type in ('personal','business')),
  status text not null default 'upcoming' check (status in ('upcoming','paid','late','failed','retried','needs_review','canceled')),
  last_three_amounts jsonb not null default '[]'::jsonb,
  last_paid_date date,
  next_expected_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(12,2) not null,
  paid_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  merchant_normalized text not null,
  display_name text not null,
  expected_amount numeric(12,2),
  billing_frequency text,
  last_charge_date date,
  next_expected_date date,
  status text not null default 'review' check (status in ('cancel','review','keep','business','unknown','canceled','paused')),
  ownership_type text not null default 'personal' check (ownership_type in ('personal','business')),
  login_note text,
  cancellation_instructions text,
  monthly_savings numeric(12,2),
  yearly_savings numeric(12,2),
  canceled_at timestamptz,
  verify_no_return_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.duplicate_charge_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_a_id uuid not null references public.transactions(id) on delete cascade,
  transaction_b_id uuid not null references public.transactions(id) on delete cascade,
  severity text not null check (severity in ('low','medium','high')),
  reason text not null,
  status text not null default 'open' check (status in ('open','expected','duplicate','dispute_later','ignored','resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique(user_id, transaction_a_id, transaction_b_id)
);

create table if not exists public.income_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_name text not null,
  income_type text not null check (income_type in ('earned_income','business_income','reimbursement','transfer','gift_support','refund','confirmed_future_income','unconfirmed_expected_income')),
  amount numeric(12,2) not null,
  expected_date date,
  confirmed boolean not null default false,
  include_in_plan boolean not null default false,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  period_type text not null check (period_type in ('weekly','monthly')),
  target_amount numeric(12,2) not null,
  rollover boolean not null default false,
  warning_threshold numeric(5,2) not null default 80,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category, period_type)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal_type text not null check (goal_type in ('bills_reserve','emergency_fund','taxes','car','travel','business_equipment','event_costs','home','custom')),
  target_amount numeric(12,2),
  current_amount numeric(12,2) not null default 0,
  target_date date,
  priority integer not null default 1,
  linked_account_id uuid references public.financial_accounts(id) on delete set null,
  is_reserved boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  creditor text not null,
  balance numeric(12,2) not null,
  balance_is_estimated boolean not null default false,
  credit_limit numeric(12,2),
  apr numeric(7,4),
  minimum_payment numeric(12,2),
  due_date date,
  fees_ytd numeric(12,2) not null default 0,
  interest_ytd numeric(12,2) not null default 0,
  statement_date date,
  target_payoff_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  purchase_date date,
  total_amount numeric(12,2),
  source_file_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  product_raw text not null,
  product_normalized text,
  brand text,
  size_text text,
  quantity numeric(12,3),
  total_price numeric(12,2),
  unit_price numeric(12,4),
  coupon_amount numeric(12,2),
  loyalty_discount numeric(12,2),
  regular_price numeric(12,2),
  sale_price numeric(12,2),
  created_at timestamptz not null default now()
);

create table if not exists public.money_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  checking_safety_buffer numeric(12,2) not null default 100,
  weekly_grocery_target numeric(12,2),
  weekly_gas_target numeric(12,2),
  weekly_personal_target numeric(12,2),
  emergency_goal numeric(12,2) not null default 1000,
  store_switch_savings_threshold numeric(12,2) not null default 10,
  planning_cutoff_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.money_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_type text not null,
  severity text not null check (severity in ('info','low','medium','high')),
  title text not null,
  body text not null,
  related_entity_type text,
  related_entity_id uuid,
  status text not null default 'unread' check (status in ('unread','read','dismissed','resolved')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['financial_accounts','transactions','bills','subscriptions','budgets','savings_goals','debts','money_preferences']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['financial_accounts','financial_imports','merchant_aliases','transactions','bills','bill_payments','subscriptions','duplicate_charge_alerts','income_events','budgets','savings_goals','debts','receipts','receipt_items','money_preferences','money_alerts']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I_select_own on public.%I', t, t);
    execute format('create policy %I_select_own on public.%I for select using (auth.uid() = user_id)', t, t);

    execute format('drop policy if exists %I_insert_own on public.%I', t, t);
    execute format('create policy %I_insert_own on public.%I for insert with check (auth.uid() = user_id)', t, t);

    execute format('drop policy if exists %I_update_own on public.%I', t, t);
    execute format('create policy %I_update_own on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);

    execute format('drop policy if exists %I_delete_own on public.%I', t, t);
    execute format('create policy %I_delete_own on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;
