-- DRYP client billing, invoicing, and accounts receivable — built in LUNA's
-- own Supabase project, NOT in DRYP Hub's database (DRYP_SUPABASE_URL is a
-- separate, external, live production system this app only reads from /
-- creates projects in via dryp-crm.ts — adding billing tables there would
-- mean altering someone else's production schema blind, which is out of
-- scope here). Rows reference a DRYP account by its real id + a denormalized
-- name (client_name), since a live cross-database foreign key isn't possible.

-- One row per DRYP client — the ongoing relationship terms, not a single
-- invoice.
create table if not exists public.dryp_client_billing (
  id                    uuid default uuid_generate_v4() primary key,
  user_id               uuid references auth.users(id) on delete cascade not null,
  dryp_account_id       text not null,
  client_name           text not null,
  billing_type          text not null default 'one_time' check (billing_type in ('retainer', 'one_time', 'mixed')),
  retainer_amount       numeric(10,2),
  recurring_billing_day smallint check (recurring_billing_day between 1 and 31),
  payment_method        text,
  notes                 text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique (user_id, dryp_account_id)
);

-- One row per invoice — the real lifecycle: draft through paid/overdue,
-- with the exact 9-state status enum and the fields real accounts
-- receivable needs.
create table if not exists public.dryp_invoices (
  id                uuid default uuid_generate_v4() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  dryp_account_id   text not null,
  client_name       text not null,
  invoice_number    text,
  amount            numeric(10,2) not null,
  deposit_required  numeric(10,2),
  deposit_paid      numeric(10,2),
  invoice_date      date,
  due_date          date,
  paid_date         date,
  payment_method    text,
  status            text not null default 'draft' check (status in (
    'draft', 'ready_to_invoice', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled'
  )),
  last_follow_up    date,
  next_follow_up    date,
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table public.dryp_client_billing enable row level security;
create policy "Users manage own client billing" on public.dryp_client_billing for all using (auth.uid() = user_id);

alter table public.dryp_invoices enable row level security;
create policy "Users manage own invoices" on public.dryp_invoices for all using (auth.uid() = user_id);

create index idx_dryp_invoices_user_status on public.dryp_invoices(user_id, status);
create index idx_dryp_invoices_account on public.dryp_invoices(user_id, dryp_account_id);
