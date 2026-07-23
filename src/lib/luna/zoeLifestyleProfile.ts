export const ZOE_LIFESTYLE_PROFILE = `
ZOE'S CURRENT LIFESTYLE RULES

DAILY ANCHORS
- Wake up at 5:00 AM.
- Shower, get dressed in gym clothes, eat oatmeal, and drink hot tea.
- Leave by 5:35 AM and arrive at the gym no later than 5:45 AM.
- Work is protected from 10:30 AM to 5:30 PM every day of the week.
- Breakfast, lunch, and dinner are required daily and must appear as protected schedule anchors.
- Default lunch is around 12:30 PM. Default dinner is around 6:00 PM.
- Plans must feel structured but flexible. Do not make Zoe feel punished when a day changes.
- Include buffers, transition time, and at least one enjoyable or restorative activity.
- Protect weekly time for sewing, outfit planning, self-tan, beach or pool, outdoor walks, and rest.

WEEKLY GYM SPLIT
- Monday: Heavy glutes. Hip thrusts, Romanian deadlifts, Bulgarian split squats, cable kickbacks, hip abductor, glute-focused back extensions.
- Tuesday: Sexy back, arms, and abs. Pull-ups or assisted pull-ups, lat pulldown, cable row, face pulls, curls, triceps, hanging knee raises, cable crunches, planks.
- Wednesday: Glute pump and core. Lighter hip thrusts, Smith squats, walking lunges, cable abductions, frog pumps, glute bridges, core work.
- Thursday: Shoulders, arms, and core. Shoulder press, lateral raises, rear delts, triceps, biceps, reverse crunches, dead bugs, side planks.
- Friday: Heavy glutes. Hip thrusts, sumo deadlifts, step-ups, cable kickbacks, hip abductor burnout.
- Saturday: Full body, glutes, and abs. Kettlebell swings, push-ups, lunges, TRX rows, conditioning, cable crunches, hanging leg raises.
- Sunday: Recovery. Outdoor walk, stretching, beach, pool, mobility, or sauna.

FITNESS GOALS
- Main goals: stronger and rounder glutes, toned abs, slightly stronger arms, and a defined sexy back.
- Zoe is 5'2 and about 115 lb, with naturally strong legs and a good back.
- Prioritize glute growth, core strength, back definition, and moderate arm strength.
- Do not frame food as punishment or use restrictive crash-diet language.

WEEKLY PERSONAL RHYTHM
- One self-tan session each week, with prep scheduled separately when useful.
- One beach or pool block each week.
- At least two outdoor walks each week.
- One longer sewing and outfit-planning block each week.
- One shorter sewing practice block while she learns her machine.
- Luna should ask how her energy feels and scale the day when needed.

FOOD PREFERENCES
Favorite foods and meal directions:
- Protein oatmeal with frozen blueberries and peanut butter.
- Hot tea in the morning.
- Greek yogurt with granola, not berries.
- Protein pancakes, Kodiak waffles, bagels, overnight oats, smoothies, and PB&J sandwiches.
- Chick-fil-A.
- Chicken-only sushi.
- Mexican meals with chicken or steak.
- BBQ chicken pizza and Margherita pizza.
- Chicken parmesan, chicken Alfredo, crispy fried chicken sandwiches, chicken tenders, rice, buffalo chicken dishes, buffalo chicken salads, and Caesar salads.
- Salmon, grilled chicken, chicken fajitas, steak fajitas, chicken tacos, rice bowls, potatoes, sweet potatoes, fruit, popcorn, protein shakes, and protein bars.
- Frozen blueberries with peanut butter is a favorite snack.

NEVER RECOMMEND
- Eggs.
- Turkey sausage.
- Turkey taco bowls.
- Ground beef.
- Shrimp.
- Pork.
- Burgers of any kind.
- Beef jerky.
- Cottage cheese.
- Mahi-mahi.
- Cod.
- Hummus.
- Feta.
- Lunch meat.
- Tuna with crackers.
- Black beans.
- Ranch.
- Mayonnaise or mayo-based sauces.

MEAL-PLANNING RULES
- Ask how many breakfasts, lunches, and dinners Zoe will eat at home that week.
- Ask how many people she is feeding, her grocery budget, meals out, cravings, and any temporary dislikes.
- Build only the number of meals she needs.
- Reuse ingredients across meals to reduce waste and cost.
- Organize the grocery list by store section and include realistic quantities.
- Favor meals she enjoys over generic fitness foods.
- Pair comfort foods with protein, produce, or practical sides without labeling them cheat meals.
- Keep breakfast, lunch, and dinner visible in every daily plan.
`

export const ZOE_GYM_BY_DAY: Record<string, string> = {
  Monday: 'Heavy glutes',
  Tuesday: 'Sexy back, arms, and abs',
  Wednesday: 'Glute pump and core',
  Thursday: 'Shoulders, arms, and core',
  Friday: 'Heavy glutes',
  Saturday: 'Full body, glutes, and abs',
  Sunday: 'Recovery, outdoor walk, stretching, beach, pool, or mobility',
}

// Punchy display copy for the Home/Today/Fitness hero cards — was
// previously duplicated identically in LunaHomeGridPage.tsx and
// LunaTodayPage.tsx, which risked the two silently drifting apart.
// Single source of truth here, alongside the gym data it's built from.
export const ZOE_HERO_FOCUS_BY_DAY: Record<string, { emoji: string; title: string; subtitle: string }> = {
  Monday: { emoji: '🍑', title: 'Glute Growth Monday', subtitle: 'Move with purpose. The results follow.' },
  Tuesday: { emoji: '💪', title: 'Sexy Back Tuesday', subtitle: 'Pull, row, and build the back you love.' },
  Wednesday: { emoji: '🔥', title: 'Glute Pump Wednesday', subtitle: 'Light weight, high pump. Feel it work.' },
  Thursday: { emoji: '✨', title: 'Shoulder Sculpt Thursday', subtitle: 'Definition day. Small moves, big difference.' },
  Friday: { emoji: '🍑', title: 'Glute Growth Friday', subtitle: 'Heavy day. Finish the week strong.' },
  Saturday: { emoji: '⚡', title: 'Full Body Saturday', subtitle: 'One workout, everything included.' },
  Sunday: { emoji: '🌊', title: 'Recovery Sunday', subtitle: 'Walk, stretch, and let your body reset.' },
}

// Structured version of the exercise lists embedded in ZOE_GYM_BY_DAY's prose
// above — kept in sync manually since the AI prompt needs prose and the UI
// (the /today Gym card) needs a real list to render, not string-parsing.
export const ZOE_EXERCISES_BY_DAY: Record<string, string[]> = {
  Monday: ['Hip Thrusts', 'Romanian Deadlifts', 'Bulgarian Split Squats', 'Cable Kickbacks', 'Hip Abductor', 'Glute-Focused Back Extensions'],
  Tuesday: ['Pull-Ups (or Assisted)', 'Lat Pulldown', 'Cable Row', 'Face Pulls', 'Curls', 'Triceps', 'Hanging Knee Raises', 'Cable Crunches', 'Planks'],
  Wednesday: ['Lighter Hip Thrusts', 'Smith Squats', 'Walking Lunges', 'Cable Abductions', 'Frog Pumps', 'Glute Bridges', 'Core Work'],
  Thursday: ['Shoulder Press', 'Lateral Raises', 'Rear Delts', 'Triceps', 'Biceps', 'Reverse Crunches', 'Dead Bugs', 'Side Planks'],
  Friday: ['Hip Thrusts', 'Sumo Deadlifts', 'Step-Ups', 'Cable Kickbacks', 'Hip Abductor Burnout'],
  Saturday: ['Kettlebell Swings', 'Push-Ups', 'Lunges', 'TRX Rows', 'Conditioning', 'Cable Crunches', 'Hanging Leg Raises'],
  Sunday: ['Outdoor Walk', 'Stretching', 'Beach or Pool', 'Mobility', 'Sauna'],
}

export const ZOE_NEVER_FOODS = [
  'eggs',
  'turkey sausage',
  'turkey taco bowls',
  'ground beef',
  'shrimp',
  'pork',
  'burgers',
  'beef jerky',
  'cottage cheese',
  'mahi-mahi',
  'cod',
  'hummus',
  'feta',
  'lunch meat',
  'tuna with crackers',
  'black beans',
  'ranch',
  'mayonnaise',
]
