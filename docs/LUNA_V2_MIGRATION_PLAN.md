# LUNA V2 Migration Plan

> Companion to `LUNA_V2_ARCHITECTURE.md`. This phases the move from the current 5-dock nav to the 12-room structure, grounded in an actual read of every existing route (not just names) as of 2026-07-21. Nothing in this plan has been executed — it's a proposal awaiting Zoe's sign-off, phase by phase.
>
> **Update 2026-07-23:** `/home` (12-room grid), `/today` (daily dashboard), `/food`, `/style`, and `/fitness` are now built for real on the `luna-v2-home` branch — the table below describing them as "net-new"/not-yet-built is stale for those five. See `LunaHomeGridPage`, `LunaTodayPage`, `LunaFoodPage`, `LunaStylePage`, `LunaFitnessPage` in `src/components/home/` for current state. Astrology/Money/Work/Brain-Dump/Atelier are unchanged from the findings below. Wellness/Travel/Next Move are still genuinely not built (honest "coming soon" stub pages only).

## Current State Per Room

| Room | Status | What exists |
|---|---|---|
| Astrology | **(a) rename only** | `astrology/page.tsx` + 8 sub-pages, already the most V2-ready room in the app. One dead-link bug found in passing (`astrology-home` links to `/astrology/chart`/`/astrology/love`/`/astrology/calendar`, none of which exist at those paths). |
| Money | **(a) rename only** | `money/page.tsx` dashboard + 8 sub-routes, fully wired to real Supabase/Plaid data. |
| Work | **(a) mostly rename** | `work/`, `work-home/`, `dryp-hub/`, `career/`, `tasks/`, `calendar/`, `email/`, `projects/` all real and functional; needs folding into one tree, not rebuilding. |
| Style | **(b) split from `/creative`** | Closet/oracle/shopping tabs live inside the 1112-line `creative/page.tsx`, plus standalone `outfit-today/page.tsx`. Needs extraction. |
| Atelier | **(b) split from `/creative`** | Sewing/studio/vault/inspiration tabs in the *same* `creative/page.tsx` file, plus `atelier/style-board/page.tsx`. Style and Atelier are currently fused together in one file and need to be pulled apart, not merged with anything else. |
| Today | **(b) consolidation of 5 pages** | `today/`, `morning/`, `midday/`, `night/`, `daily-glance/`, `rush-mode/`, `late-mode/`, `plan-my-day/` all cover a slice; `daily-glance` is the best seed for the real aggregator. |
| Brain Dump | **(b) consolidation of 3 pages** | `brain-dump/` (capture), `dictation/` (voice capture), `memory/` (archive/search) each cover one third of the spec; `vault/` has a non-functional "add to vault" button. |
| Food | **(c) net-new** | Only a backend contract exists: `/api/ai/weekly-meal-plan` + `/api/ai/plan-my-day` (both already deployed and confirmed working, see 2026-07-21 deploy verification). Zero frontend page, zero DB tables (`foods`/`recipes`/`groceries`/`meal_plans`). |
| Fitness | **(c) net-new** | Nothing real exists. `health/page.tsx` is a UI shell over 100% hardcoded mock data — reusable as a visual seed only. |
| Wellness | **(c) net-new** | Same `health/page.tsx` mock shell is the closest analog; no self-care/skincare/meditation content or tables anywhere. |
| Travel | **(c) net-new** | Zero trace in the codebase. |
| Next Move | **(c) net-new, depends on Food/Fitness/Travel** | Can't do real cross-domain synthesis until those rooms have real data to draw from. Closest existing analog: `/api/ai/daily-brief` (tasks-only, not cross-domain). |

## Orphans Needing a Decision

These don't map cleanly to any of the 12 rooms. Recommended defaults below — flag if any should go differently:

| Route | Recommendation |
|---|---|
| `more/page.tsx` | Delete — `explore/page.tsx`'s own comments say it already absorbed this. |
| `dashboard/page.tsx` | Delete — it's just `redirect('/')`, pure cruft. |
| `relationships/page.tsx` | Fold into Work as a "People/CRM" sub-tab (closest fit — client/team relationship tracking). |
| `highest-self/page.tsx` | Fold into Astrology (chart-connection framing) rather than standalone. |
| `growth/page.tsx` | Keep as a global/shared feature, not a 13th room — it's meta-analytics over every room's patterns. |
| `weekly/page.tsx` (Weekly Reset) | Keep as its own cross-room ritual, surfaced from Today rather than owned by one room. |
| `lessons/page.tsx` | Fold into Astrology (closest thematic fit with the human-design/reflection framing already there). |
| `messages/page.tsx` (Communication Coach) | Fold into Work as a sub-tool. |
| `luna/page.tsx` vs `chat/page.tsx` | **Needs your input** — both appear to be full LUNA chat implementations. Before folding either away, need to know which one is actually in current use. |

## Phased Execution (proposed order, each phase gated on the previous being confirmed working)

1. **Shared component library first.** Extract `GlassTabBar`, `HeroCard`, `RoomCard`, etc. from existing usage before any room-folder moves, so every subsequent phase builds on the same primitives instead of retrofitting later.
2. **Rename-only rooms:** Astrology, Money, Work. Lowest risk, no logic changes, but still touches live routing on a production app — do locally, verify every internal link, then a single confirmed deploy rather than piecemeal.
3. **Split `/creative` into Style + Atelier.** Highest-value untangling since these two rooms currently share one 1112-line file.
4. **Consolidate Today** (seed: `daily-glance`) **and Brain Dump** (seed: `brain-dump` + `dictation` + `memory`).
5. **Resolve orphans** per the table above (or your corrections).
6. **Build net-new rooms:** Food first (backend contract already exists and is deployed), then Fitness, Wellness, Travel.
7. **Next Move last** — only once Food/Fitness/Travel have real data to synthesize across.
8. **Dock/nav cutover** from 5-dock to 12-room — the single highest-blast-radius step since it changes what you see immediately on the live site. Recommend a feature flag or soft-launch (new rooms reachable but old dock still default) rather than a hard cutover.

Each phase should land as its own reviewed change, not one giant rewrite — this app is live at mylunaguide.online and Zoe uses it daily.
