-- Travel room — trip planning, saved places, packing, and budget. Follows
-- the newer gen_random_uuid() convention (matches luna_money_v2_schema.sql,
-- the most recently built schema) and the standard RLS pattern used
-- throughout the app (auth.uid() = user_id).

create table if not exists public.travel_profiles (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  home_airport                text,
  home_city                   text,
  passport_status              text check (passport_status in ('valid', 'expiring_soon', 'expired', 'none', 'unknown')) default 'unknown',
  preferred_trip_length_days  int,
  preferred_climates          text[] default '{}',
  preferred_pace              text check (preferred_pace in ('slow', 'balanced', 'full_itinerary', 'spontaneous')),
  preferred_budget_tier       text check (preferred_budget_tier in ('affordable', 'moderate', 'luxury')),
  flight_tolerance_hours      int,
  travel_interests            text[] default '{}',
  accessibility_preferences    text,
  liked_destination_ids       text[] default '{}',
  rejected_destination_ids    text[] default '{}',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (user_id)
);
alter table public.travel_profiles enable row level security;
create policy "Users manage own travel profile" on public.travel_profiles for all using (auth.uid() = user_id);

create table if not exists public.trips (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  destination_name  text not null,
  destination_id    text,
  status            text not null default 'idea' check (status in ('idea', 'draft', 'planning', 'booked', 'active', 'completed', 'archived')),
  start_date        date,
  end_date          date,
  date_flexibility  text check (date_flexibility in ('exact', 'flexible', 'not_sure')) default 'not_sure',
  trip_type         text,
  travelers         text default 'solo',
  budget_amount     numeric(12,2),
  currency          text default 'USD',
  capture_mode      text check (capture_mode in ('just_enjoy', 'maybe', 'help_capture')) default 'maybe',
  notes             text,
  cover_image_path  text,
  source            text default 'manual' check (source in ('manual', 'brain_dump', 'recommendation', 'surprise_me')),
  source_entry_id   uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.trips enable row level security;
create policy "Users manage own trips" on public.trips for all using (auth.uid() = user_id);
create index idx_trips_user_status on public.trips(user_id, status);

create table if not exists public.trip_days (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date,
  title       text,
  notes       text,
  sort_order  int not null default 0
);
alter table public.trip_days enable row level security;
create policy "Users manage own trip days" on public.trip_days for all using (auth.uid() = user_id);
create index idx_trip_days_trip on public.trip_days(trip_id, sort_order);

create table if not exists public.trip_activities (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null references public.trips(id) on delete cascade,
  trip_day_id        uuid references public.trip_days(id) on delete set null,
  user_id            uuid not null references auth.users(id) on delete cascade,
  place_id           text,
  title              text not null,
  description        text,
  time_of_day        text check (time_of_day in ('morning', 'afternoon', 'evening', 'flexible')),
  start_time         time,
  end_time           time,
  status             text not null default 'would_love' check (status in ('must_do', 'would_love', 'optional', 'reserved', 'completed', 'skipped')),
  category           text,
  cost               numeric(12,2),
  currency           text default 'USD',
  booking_required   boolean default false,
  confirmation_id    text,
  notes              text,
  sort_order         int not null default 0
);
alter table public.trip_activities enable row level security;
create policy "Users manage own trip activities" on public.trip_activities for all using (auth.uid() = user_id);
create index idx_trip_activities_trip on public.trip_activities(trip_id, sort_order);

create table if not exists public.trip_bookings (
  id                     uuid primary key default gen_random_uuid(),
  trip_id                uuid not null references public.trips(id) on delete cascade,
  user_id                uuid not null references auth.users(id) on delete cascade,
  booking_type           text not null check (booking_type in ('flight', 'hotel', 'rental', 'train', 'tickets', 'tour', 'restaurant', 'transfer', 'insurance', 'other')),
  provider               text,
  confirmation_number    text,
  start_at               timestamptz,
  end_at                 timestamptz,
  amount                 numeric(12,2),
  currency               text default 'USD',
  status                 text default 'confirmed' check (status in ('confirmed', 'pending', 'canceled')),
  cancellation_deadline  timestamptz,
  attachment_path        text,
  notes                  text,
  created_at             timestamptz not null default now()
);
alter table public.trip_bookings enable row level security;
create policy "Users manage own trip bookings" on public.trip_bookings for all using (auth.uid() = user_id);
create index idx_trip_bookings_trip on public.trip_bookings(trip_id);

create table if not exists public.trip_budget_items (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  category        text not null check (category in ('flights', 'lodging', 'food', 'transportation', 'activities', 'shopping', 'emergency_buffer', 'other')),
  description     text,
  planned_amount  numeric(12,2),
  actual_amount   numeric(12,2),
  currency        text default 'USD',
  status          text default 'planned' check (status in ('planned', 'paid', 'remaining')),
  payment_date    date
);
alter table public.trip_budget_items enable row level security;
create policy "Users manage own trip budget items" on public.trip_budget_items for all using (auth.uid() = user_id);
create index idx_trip_budget_items_trip on public.trip_budget_items(trip_id);

create table if not exists public.trip_packing_items (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  category         text not null check (category in ('clothing', 'shoes', 'beauty', 'wellness', 'documents', 'technology', 'work', 'camera', 'fitness', 'medication', 'travel_day', 'other')),
  quantity         int default 1,
  is_packed        boolean not null default false,
  closet_item_id   uuid references public.wardrobe_items(id) on delete set null,
  notes            text,
  sort_order       int not null default 0
);
alter table public.trip_packing_items enable row level security;
create policy "Users manage own trip packing items" on public.trip_packing_items for all using (auth.uid() = user_id);
create index idx_trip_packing_items_trip on public.trip_packing_items(trip_id);

-- Saved places: cities/countries/venues bookmarked from search, recs, Brain
-- Dump, or manual entry. `external_place_id` maps to destinations.json's
-- `id` field when it's a curated destination, null for custom venues.
create table if not exists public.saved_places (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  external_place_id  text,
  name               text not null,
  city               text,
  country            text,
  category           text check (category in ('city', 'country', 'region', 'hotel', 'restaurant', 'beach', 'activity', 'neighborhood', 'venue', 'photo_location')) default 'city',
  list_name          text default 'must_visit',
  reason_saved       text,
  tags               text[] default '{}',
  image_url          text,
  source             text default 'manual' check (source in ('search', 'recommendation', 'brain_dump', 'astrology', 'manual', 'ask_luna')),
  created_at         timestamptz not null default now()
);
alter table public.saved_places enable row level security;
create policy "Users manage own saved places" on public.saved_places for all using (auth.uid() = user_id);
create index idx_saved_places_user on public.saved_places(user_id, created_at desc);

-- Like/dislike/save history so "Best For You" recommendations improve over time.
create table if not exists public.travel_recommendations (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  destination_id       text not null,
  match_score          int,
  match_factors        jsonb,
  recommendation_reason text,
  status               text not null default 'suggested' check (status in ('suggested', 'saved', 'liked', 'rejected', 'planned')),
  created_at           timestamptz not null default now()
);
alter table public.travel_recommendations enable row level security;
create policy "Users manage own travel recommendations" on public.travel_recommendations for all using (auth.uid() = user_id);
create index idx_travel_recommendations_user on public.travel_recommendations(user_id, destination_id);

create table if not exists public.travel_memories (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references public.trips(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  memory_type  text not null check (memory_type in ('photo', 'video', 'journal', 'voice_note', 'highlight', 'favorite_place', 'lesson', 'expense_note', 'outfit', 'food', 'people', 'creative_work')),
  content      text,
  media_path   text,
  place_id     text,
  recorded_at  timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.travel_memories enable row level security;
create policy "Users manage own travel memories" on public.travel_memories for all using (auth.uid() = user_id);
create index idx_travel_memories_trip on public.travel_memories(trip_id);

-- Optional trip sharing — collaborators only ever see records explicitly
-- attached to the trip (trip_days/activities/bookings/budget/places), never
-- other Luna data (enforced at the application layer, not by this table).
create table if not exists public.trip_collaborators (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references public.trips(id) on delete cascade,
  owner_user_id         uuid not null references auth.users(id) on delete cascade,
  collaborator_email    text not null,
  collaborator_user_id  uuid references auth.users(id) on delete set null,
  role                  text not null default 'view' check (role in ('view', 'suggest', 'edit')),
  status                text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'removed')),
  created_at            timestamptz not null default now()
);
alter table public.trip_collaborators enable row level security;
create policy "Owners manage their trip collaborators" on public.trip_collaborators for all using (auth.uid() = owner_user_id);

-- Storage bucket for trip attachments (booking confirmations, trip photos,
-- packing photos) — private by default, same pattern as brain-dump's bucket.
insert into storage.buckets (id, name, public)
values ('travel', 'travel', false)
on conflict (id) do nothing;

create policy "Users manage own travel storage objects"
  on storage.objects for all
  using (bucket_id = 'travel' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'travel' and (storage.foldername(name))[1] = auth.uid()::text);

-- Extend Brain Dump's linked_type enum so an entry can become a trip idea,
-- following the same conversion pattern used for tasks/later items.
alter table public.brain_dump_entries drop constraint if exists brain_dump_entries_linked_type_check;
alter table public.brain_dump_entries add constraint brain_dump_entries_linked_type_check
  check (linked_type in ('task', 'later', 'note', 'project', 'calendar_event', 'reminder', 'creative_memory', 'shopping_item', 'trip', 'saved_place'));
