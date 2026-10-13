-- Tables the Gmail routes already query but that had no migration.
-- Not yet applied to any database: review, then run in the Supabase SQL editor.
-- Both tables are only touched through the service-role key (server routes), so
-- row level security is enabled with no policies to keep the anon key out.

create table if not exists public.priority_contacts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  created_at  timestamptz not null default now(),
  -- /api/gmail/priority-contacts upserts with onConflict: 'name'
  constraint priority_contacts_name_key unique (name)
);

create table if not exists public.email_classifications (
  -- Gmail message id; /api/gmail/sync upserts with onConflict: 'id'
  id             text primary key,
  category       text not null,
  is_meeting     boolean not null default false,
  is_urgent      boolean not null default false,
  needs_review   boolean not null default false,
  action         text,
  tasks          jsonb not null default '[]'::jsonb,
  classified_at  timestamptz not null default now()
);

create index if not exists email_classifications_classified_at_idx
  on public.email_classifications (classified_at desc);

alter table public.priority_contacts    enable row level security;
alter table public.email_classifications enable row level security;
