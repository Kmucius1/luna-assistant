-- Permanent Food Profile — separate from food_pantry_items (confirmed
-- inventory). Guides meal suggestions, recipes, and grocery lists: brand
-- preferences, favorite dishes by category, behavioral rules (how to be
-- suggested to, not just what), real restaurant technique/seasoning notes
-- per dish family, and a never-suggest list. One row per user.

create table if not exists public.food_profile (
  id                      uuid default uuid_generate_v4() primary key,
  user_id                 uuid references auth.users(id) on delete cascade not null unique,
  preferred_chicken_brand text,
  rice_preference         text,
  dressing_preference     text,
  favorite_meals          jsonb not null default '{}'::jsonb,
  behavior_rules          text[] not null default '{}',
  never_foods             text[] not null default '{}',
  cooking_techniques      jsonb not null default '{}'::jsonb,
  updated_at              timestamptz default now()
);

alter table public.food_profile enable row level security;
create policy "Users manage own food profile" on public.food_profile for all using (auth.uid() = user_id);
