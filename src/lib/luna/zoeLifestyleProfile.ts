export const ZOE_LIFESTYLE_PROFILE = `
ZOE'S CURRENT LIFESTYLE RULES

DAILY ANCHORS
- Wake up at 5:00 AM.
- Shower, get dressed in gym clothes, eat oatmeal, and drink hot tea.
- Leave by 5:35 AM and arrive at the gym no later than 5:45 AM.
- Work is protected from 10:00 AM to 6:00 PM every day of the week.
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
  // No longer an assumed default — the Weekday Planner treats Saturday
  // movement as her choice (gym, an alternative, or an explicit rest day).
  // This string is only used if she actually picks "gym" that week.
  Saturday: 'Full body, glutes, and abs (optional — her choice this week)',
  Sunday: 'Recovery, outdoor walk, stretching, beach, pool, or mobility',
}

// Punchy display copy for the Home/Today/Fitness hero cards — was
// previously duplicated identically in LunaHomeGridPage.tsx and
// LunaTodayPage.tsx, which risked the two silently drifting apart.
// Single source of truth here, alongside the gym data it's built from.
const GYM_HERO_IMAGE = '/images/rooms/hero-gym-focus.jpg'

export const ZOE_HERO_FOCUS_BY_DAY: Record<string, { emoji: string; title: string; subtitle: string; image: string; imagePosition?: string }> = {
  Monday: { emoji: '🍑', title: 'Glute Growth Monday', subtitle: 'Move with purpose. The results follow.', image: GYM_HERO_IMAGE },
  Tuesday: { emoji: '💪', title: 'Sexy Back Tuesday', subtitle: 'Pull, row, and build the back you love.', image: GYM_HERO_IMAGE },
  Wednesday: { emoji: '🔥', title: 'Glute Pump Wednesday', subtitle: 'Light weight, high pump. Feel it work.', image: GYM_HERO_IMAGE },
  Thursday: { emoji: '✨', title: 'Shoulder Sculpt Thursday', subtitle: 'Definition day. Small moves, big difference.', image: GYM_HERO_IMAGE },
  Friday: { emoji: '🍑', title: 'Glute Growth Friday', subtitle: 'Heavy day. Finish the week strong.', image: GYM_HERO_IMAGE },
  Saturday: { emoji: '🌤️', title: 'Light Saturday', subtitle: 'Move if you want to — today is yours.', image: GYM_HERO_IMAGE },
  Sunday: { emoji: '🌊', title: 'Recovery Sunday', subtitle: 'Walk, stretch, and let your body reset.', image: '/images/rooms/hero-recovery-beach.jpg', imagePosition: 'center 62%' },
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

// Default work-location pattern, used to seed the Sunday Weekly Reset's
// work-location step before Zoe confirms/overrides for the coming week.
export const ZOE_WORK_LOCATION_BY_DAY: Record<string, 'home' | 'office'> = {
  Monday: 'office',
  Tuesday: 'office',
  Wednesday: 'home',
  Thursday: 'office',
  Friday: 'office',
  Saturday: 'home',
  Sunday: 'home',
}

// Zoe's own recurring physical locations, for classifying calendar events as
// in-person-office vs. in-person-elsewhere. Addresses are intentionally
// approximate (city-level) rather than exact street addresses.
export interface BusinessFocusDay {
  theme: string
  priorities: string[]
  workLocationDefault: 'home' | 'office'
  /** Documents intent only — no recurring-task data model backs this yet. */
  absorbs?: string[]
  note: string
}

// The Weekday Planner's day-of-week business logic — what Monday through
// Saturday should each prioritize. Sunday is deliberately absent: its
// business logic lives entirely in the Sunday Weekly Reset flow, not here.
export const ZOE_BUSINESS_FOCUS_BY_DAY: Record<string, BusinessFocusDay> = {
  Monday: {
    theme: 'Launch & Communications',
    priorities: ['Urgent client replies', 'Revenue-moving items', 'Deals in motion', 'Weekend follow-ups', "Set the week's frame"],
    workLocationDefault: 'office',
    note: 'Clear communications and re-engage revenue/deal items before new work begins.',
  },
  Tuesday: {
    theme: 'Client Meetings & Sales',
    priorities: ['Fixed client meetings', 'Sales conversations', 'In-person work', 'Travel/errands while out'],
    workLocationDefault: 'office',
    absorbs: ['Car maintenance'],
    note: "Meeting-and-travel day — batch driving-adjacent errands since she's already out.",
  },
  Wednesday: {
    theme: 'Deep Creative & Build Work',
    priorities: ['Website/CRM/deck/campaign build work', 'Uninterrupted focus blocks'],
    workLocationDefault: 'home',
    note: 'WFH by default — protect long focus blocks, no new client meetings by default.',
  },
  Thursday: {
    theme: 'Client Meetings, Proposals & Closing',
    priorities: ['Client meetings', 'Proposals', 'Follow-ups', 'Sales / closing'],
    workLocationDefault: 'office',
    note: 'End with a self-care or fresh-dinner option, not another late push.',
  },
  Friday: {
    theme: 'Finish, Invoice & Close Loops',
    priorities: ['Finish deliverables', 'Invoices', 'Approvals', 'Follow-ups', 'Admin cleanup'],
    workLocationDefault: 'office',
    absorbs: ['Finances / personal admin (if not deferred to Sunday)'],
    note: 'Nothing new starts today — only finishing and clearing.',
  },
  Saturday: {
    theme: 'Light & Social',
    priorities: ['Social', 'Modeling/content work', 'Beach/outdoors', 'Creative time', 'Light errands'],
    workLocationDefault: 'home',
    note: 'Deliberately light — no fixed workout, no forced admin.',
  },
}

const BUSINESS_FOCUS_PROSE = Object.entries(ZOE_BUSINESS_FOCUS_BY_DAY)
  .map(([day, d]) => `- ${day}: ${d.theme}. ${d.note} Priorities in order: ${d.priorities.join(', ')}.`)
  .join('\n')

export const ZOE_WEEKDAY_BUSINESS_FOCUS_PROSE = `WEEKDAY BUSINESS FOCUS\n${BUSINESS_FOCUS_PROSE}`

export const ZOE_KNOWN_LOCATIONS = [
  { label: 'DRYP office', match: ['dryp', 'the office'] },
  { label: 'home', match: ['home'] },
  { label: 'gym', match: ['gym'] },
]

// A suggestion pool the meal-plan AI draws from, not a rigid requirement —
// same "reference data the model weighs against real context" treatment
// ZOE_GYM_BY_DAY gets. Matches her explicit "don't force traditional meal
// prep" framing: Monday/Friday/Saturday are deliberately flexible.
export const ZOE_MEAL_ROTATION_BY_DAY: Record<string, string> = {
  Sunday: 'Chicken, rice, and veggies — her one near-default dinner.',
  Monday: 'Flexible — no theme.',
  Tuesday: 'Optional Taco Tuesday.',
  Wednesday: 'Chicken quesadilla, buffalo chicken wrap, or another chicken use.',
  Thursday: 'Salmon, or eat out.',
  Friday: 'Flexible — no theme.',
  Saturday: 'Flexible — no theme.',
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
