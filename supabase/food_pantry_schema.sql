-- Food room: real fridge/pantry inventory with expiration tracking, and
-- persisted AI-generated weekly meal plans (replaces the old hardcoded
-- TODAY_MEALS sample in src/lib/luna/todayMeals.ts, which never changed
-- day to day). Follows the same pattern as brain_dump_schema.sql.

create table if not exists public.food_pantry_items (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  category    text not null default 'pantry' check (category in ('produce', 'protein', 'dairy', 'bakery_and_grains', 'pantry', 'frozen', 'other')),
  quantity    text,
  expires_on  date,
  source      text not null default 'manual' check (source in ('manual', 'photo', 'grocery_list')),
  consumed_at timestamptz,
  created_at  timestamptz default now()
);

alter table public.food_pantry_items enable row level security;
create policy "Users manage own pantry items" on public.food_pantry_items for all using (auth.uid() = user_id);
create index idx_food_pantry_items_user_expires on public.food_pantry_items(user_id, expires_on) where consumed_at is null;

-- One row per week. plan_json is the AI response verbatim (week_summary,
-- breakfasts/lunches/dinners/snacks, grocery_list, prep_plan,
-- estimated_waste_savers, meals_out). Regenerating a week upserts this row
-- rather than creating a duplicate.
create table if not exists public.food_weekly_plans (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  week_start    date not null,
  plan_json     jsonb not null,
  checked_items text[] not null default '{}',
  created_at    timestamptz default now()
);

alter table public.food_weekly_plans enable row level security;
create policy "Users manage own weekly meal plans" on public.food_weekly_plans for all using (auth.uid() = user_id);
create unique index idx_food_weekly_plans_user_week on public.food_weekly_plans(user_id, week_start);
