-- Extends the DRYP billing system (built earlier this session) with real
-- opportunity/pipeline value and the contract-date fields MRR delta metrics
-- actually need. Same reasoning as before: lives in LUNA's own Supabase
-- project, not DRYP Hub's separate external database.

alter table public.dryp_client_billing
  add column if not exists contract_start date,
  add column if not exists contract_end date,
  add column if not exists next_invoice_date date,
  add column if not exists renewal_date date;

-- One row per pipeline opportunity — a deal has no dollar value in DRYP CRM
-- itself until it becomes an active retainer, so this is where "potential
-- value" and "probability" actually live.
create table if not exists public.dryp_opportunities (
  id                        uuid default uuid_generate_v4() primary key,
  user_id                   uuid references auth.users(id) on delete cascade not null,
  dryp_account_id           text not null,
  client_name               text not null,
  potential_value           numeric(10,2),
  probability_pct           smallint check (probability_pct between 0 and 100),
  deal_stage                text,
  expected_close_date       date,
  expected_payment_schedule text,
  next_action               text,
  status                    text not null default 'open' check (status in ('open', 'won', 'lost')),
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

alter table public.dryp_opportunities enable row level security;
create policy "Users manage own dryp opportunities" on public.dryp_opportunities for all using (auth.uid() = user_id);
create index idx_dryp_opportunities_user_status on public.dryp_opportunities(user_id, status);
