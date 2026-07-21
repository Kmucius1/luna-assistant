# LUNA V2 — Target Application Architecture

> **Status: PROPOSED, NOT YET IMPLEMENTED.** This document captures Zoe's target architecture for a future rebuild of Luna into 12 consistent "rooms." It is a design target, not the current state of the codebase.
>
> **Conflict with current state:** the live app currently uses a locked 5-dock navigation model (Home · Work · LUNA · Astrology · Creative — see `project_luna_assistant` memory) with ~45 top-level routes that don't map 1:1 onto the room structure below (e.g. current `astrology-home`, `creative-home`, `work-home`, `morning`, `midday`, `night`, `late-mode`, `rush-mode`, `highest-self`, `relationships`, `dryp-hub`, etc.). Migrating to this V2 structure is a real rearchitecture — do not start moving/renaming existing routes or deleting existing pages to match this document without Zoe explicitly signing off on a migration plan first. Visual/UI rules from `LUNA_DESIGN_BIBLE.md` apply regardless of whether V2 routing has been adopted.

## Guiding Principle

Every room should have the same internal structure so users instantly know where to find things, while still allowing each room its own photography, color theme, and specialized features. Consistency reduces cognitive load; character keeps it from feeling generic.

### Standard Room Pattern

```
Room
│
├── Dashboard
├── Today
├── Planner
├── Library
├── Favorites
├── History
├── Insights
├── AI Assistant
└── Settings (room-specific)
```

## Folder Structure

```
src/
├── app/
│   ├── page.tsx
│   ├── today/page.tsx
│   ├── food/page.tsx
│   ├── style/page.tsx
│   ├── fitness/page.tsx
│   ├── work/page.tsx
│   ├── atelier/page.tsx
│   ├── wellness/page.tsx
│   ├── astrology/page.tsx
│   ├── money/page.tsx
│   ├── brain/page.tsx
│   ├── travel/page.tsx
│   └── next/page.tsx
├── components/
│   ├── home/
│   ├── today/
│   ├── food/
│   ├── style/
│   ├── fitness/
│   ├── work/
│   ├── atelier/
│   ├── wellness/
│   ├── astrology/
│   ├── money/
│   ├── brain/
│   ├── travel/
│   ├── next/
│   └── shared/       ← everything shared goes here
```

### Shared Components

`GlassTabBar`, `HeroCard`, `RoomCard`, `ImageCard`, `LuxuryButton`, `RoomHeader`, `SectionHeader`, `LargeQuote`, `FloatingActionButton`, `WeatherWidget`, `SearchBar`, `ProfileChip`, `DateHeader`, `SectionDivider`, `PremiumCard`, `BlurCard`, `Timeline`, `BottomSheet`, `Modal`, `LoadingState`, `EmptyState`, `Skeleton`, `Toast`, `ImageBanner`, `PageTransition`, `PageWrapper`.

## Rooms

### Home — navigation only, zero business logic

Flow: Greeting → Weather → Daily Quote → Today's Hero → Room Grid → Bottom Navigation.

### Today — aggregates cards from every other room, owns nothing itself

Flow: Morning Routine → Today's Outfit → Breakfast → Workout → Post-Workout Meal → Work Timeline → Reminders → Tonight → Next Move.

### Food — everything related to eating

Flow: Dashboard → Today's Meals → Weekly Meal Plan → Breakfast → Lunch → Dinner → Snacks → Recipes → Restaurants → Groceries → Pantry → Favorites → Nutrition → Water.

- **Components:** MealCard, RecipeCard, RestaurantCard, GroceryCard, NutritionCard, MacroCard, WaterTracker, ShoppingList, RecipeCarousel, MealPlanner.
- **Database:** foods, recipes, groceries, favorites, restaurants, meal_plans, nutrition, water_logs.
- **AI:** suggest meals, generate grocery list, create recipes, restaurant recommendations, meal prep, healthy swaps, nutrition coaching.

### Style

Flow: Today's Outfit → Closet → Pinterest Inspiration → Outfit Builder → Shopping Wishlist → Hair → Makeup → Jewelry → Perfume → Shoes → Accessories → Seasonal Collections.

- **Components:** ClosetCard, OutfitCard, WardrobeGrid, PinterestGallery, ShoppingCard, HairCard, AccessoryCard, Lookbook, Moodboard, LuxuryCarousel.
- **AI:** build today's outfit, create outfits from Pinterest, suggest purchases, pack suitcase, color matching, weather matching.

### Fitness

Flow: Today's Workout → Workout Split → Exercise Library → Progress → Body Measurements → Gym History → Stretching → Recovery → Goals → Nutrition Targets.

- **Components:** WorkoutCard, ExerciseCard, ProgressChart, BodyTracker, MeasurementCard, GymCalendar, RecoveryCard, WorkoutHistory, RepCounter.
- **AI:** build workout, progressive overload, track strength, adjust split, recovery suggestions.

### Work

Flow: Dashboard → Calendar → Today's Priorities → Clients → DRYP → Link'd Up → EHM → Tasks → Meetings → CRM → Projects → Invoices → Content Calendar.

- **Components:** ClientCard, ProjectCard, MeetingCard, CalendarCard, ContentCard, TaskCard, PipelineCard, InvoiceCard, DashboardStats.
- **AI:** prioritize work, summaries, meeting prep, email drafting, task breakdown, project planning.

### Atelier — the creative heart

Flow: Inspiration → Moodboards → Pinterest → Sketchbook → Sewing Studio → Fabric Library → Patterns → Photography → Content Studio → Portfolio → Creative Journal → AI Design Lab.

- **Components:** Moodboard, FabricCard, PatternCard, SketchCanvas, PhotographyGallery, CreativeTimeline, ProjectGallery, CollectionCard, StudioCard.
- **AI:** generate outfit concepts, fashion ideas, editorial concepts, photoshoot ideas, branding, art critiques, creative prompts.

### Wellness

Flow: Dashboard → Sleep → Beach → Pool → Walks → Self Tan → Skincare → Hair Care → Mental Health → Meditation → Recovery → Habits.

- **AI:** self-care reminders, recovery, mood insights, habit coaching.

### Astrology — nothing removed, only organized

Flow: Today → Birth Chart → Transits → Moon → Planetary → Compatibility → Manifestation → Tarot → Crystals → Angel Numbers → Journal → Dream Log.

- **AI:** daily reading, transit explanations, tarot guidance, manifestation, dream interpretation.

### Money

Flow: Overview → Accounts → Bills → Budget → Subscriptions → Savings → Goals → Investments → Income → Expenses → Safe To Spend.

- **AI:** budgeting, savings, subscription analysis, cash flow, spending insights.

### Brain Dump

Flow: Quick Notes → Voice Notes → Ideas → Saved Chats → Projects → Archives → Search → Tags.

- **AI:** organize ideas, categorize notes, create tasks, summaries, search memory.

### Travel

Flow: Upcoming Trips → Dream Trips → Packing Lists → Hotels → Flights → Restaurants → Maps → Itineraries → Memories.

- **AI:** travel planning, packing, restaurant suggestions, day itineraries.

### Next Move — Luna's executive assistant

One screen. One question: **"What should I do next?"** Everything feeds this. AI analyzes calendar, work, goals, food, wellness, fitness, weather, deadlines, energy, and habits, then gives exactly one recommendation.

## Visual/Responsive Rules

See `LUNA_DESIGN_BIBLE.md` for the full locked design system (colors, typography, photography, iconography, animation, and the mandatory mobile-first / iPhone 17 Pro responsive standard). Those rules apply to any room built under this architecture.
