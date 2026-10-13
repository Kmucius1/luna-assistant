// Luna 30-Day Life OS — the planning engine. Pure functions, no I/O, so the
// page, the API and the cron all derive the same day from the same inputs.
// Dates are Eastern calendar keys (see today.ts), never the server's clock.

import { addDaysToKey } from '@/lib/luna/today'

export const PROGRAM_START = '2026-10-13'
export const PROGRAM_REVIEW = '2026-11-12'
export const PROGRAM_DAYS = 30
export const CORE_PHRASE = 'I am building Zoe, not managing somebody else’s perception of Zoe.'

export type Energy = 'low' | 'normal' | 'high'
export type Mode = 'normal' | 'stuck' | 'spiral'
export type Part = 'morning' | 'work' | 'after' | 'night'

export interface PlanItem {
  id: string          // stable check id; completion is stored against it
  time?: string
  label: string
  detail?: string
  part: Part
  core?: boolean      // non-negotiable
}

export interface DayOverrides {
  offDay?: boolean            // no work today (weekend, PTO, sick)
  workUntil?: number          // 24h hour she actually finishes, e.g. 18
  customEvening?: string      // "dinner with mom" replaces the main block
  skipIds?: string[]
}

export interface DayInput {
  dateKey: string
  energy: Energy
  gymToday: boolean | null    // null = not decided yet (treated as NO for planning)
  overrides?: DayOverrides
}

// ---------- day numbering ----------

export function dayNumber(dateKey: string, start = PROGRAM_START): number {
  const [y1, m1, d1] = start.split('-').map(Number)
  const [y2, m2, d2] = dateKey.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1, 12)
  const b = Date.UTC(y2, m2 - 1, d2, 12)
  return Math.round((b - a) / 86_400_000) + 1
}

export function programPhase(n: number): 'before' | 'active' | 'review' | 'after' {
  if (n < 1) return 'before'
  if (n <= PROGRAM_DAYS) return 'active'
  if (n === PROGRAM_DAYS + 1) return 'review'
  return 'after'
}

export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0 Sun
}

// ---------- weekly rotation ----------

export interface DayTheme {
  name: string
  block: string            // main block title
  done: string             // what DONE means
  options: string[]
}

const THEMES: Record<number, DayTheme> = {
  1: {
    name: 'Create', block: 'Artist Zoe',
    done: 'At least 45 focused minutes, or real progress on one piece.',
    options: ['Painting', 'Drawing', 'Tattoo flash', 'Illustration', 'Digital art', 'Design', 'Collage', 'Lyrics', 'Writing', 'Creative concept'],
  },
  2: {
    name: 'Closet + Money', block: 'Style / Sell / Finances',
    done: 'One measurable money or style action.',
    options: ['Sort one clothing category', 'Photograph 10 items', 'List 3–5 items', 'Answer buyers', 'Package and ship', 'Update fund totals', 'Review spending'],
  },
  3: {
    name: 'Content + Brand', block: 'Content Zoe',
    done: 'One concrete content asset or one organized content action.',
    options: ['Film', 'Edit one Reel/TikTok', 'Outfit content', 'Lifestyle content', 'Organize clips', 'Write hooks', 'Brainstorm a series', 'Plan posts'],
  },
  4: {
    name: 'Body + Beauty', block: 'Body / Beauty Zoe',
    done: 'My body received intentional care.',
    options: ['Gym', 'Walk', 'Pilates', 'Stretch', 'Shave', 'Self tan', 'Hair treatment', 'Nails', 'Skincare deep-dive', 'Book a beauty or health appointment'],
  },
  5: {
    name: 'Social + Fun', block: 'Life Zoe',
    done: 'I experienced something outside work and home.',
    options: ['Friend dinner', 'Brunch', 'Coffee', 'Event or concert', 'Sunset', 'Beach', 'Cute restaurant', 'Art event', 'Solo dinner', 'Family'],
  },
  6: {
    name: 'Explore + Create', block: 'Explore Zoe',
    done: 'Have an experience AND create something from it.',
    options: ['Beach', 'New town or neighborhood', 'Café', 'Market', 'Art store', 'Bookstore', 'Museum or gallery', 'Nature', 'Day trip', 'Photos or a creative shoot', 'Fashion inspiration'],
  },
  0: {
    name: 'Full Reset', block: 'Sunday Reset',
    done: 'The week is set up and I can start Monday light.',
    options: [],
  },
}

export function themeFor(dateKey: string): DayTheme {
  return THEMES[weekdayOf(dateKey)]
}

export const SUNDAY_RESET: string[] = [
  'Groceries', 'Laundry', 'Fresh sheets', 'Bedroom reset', 'Bathroom reset', 'Car reset', 'Trash',
  'Calendar', 'Work schedule', 'Top priorities', 'Gym schedule', 'Outfits', 'Meal ideas', 'Finances',
  'Clothing listings', 'Camera fund', 'Content plan', 'Hobby plan', 'Social plan', 'Solo plan', 'Monday preparation',
]

export const WEEKLY_REFLECTION: string[] = [
  'What worked?', 'What drained me?', 'What did I do for myself?', 'What did I create?', 'What did I earn?',
  'What did I save?', 'What did I sell?', 'What did I learn?', 'Where did I go?', 'Who did I spend time with?',
  'What was my favorite outfit?', 'What content did I make?', 'What do I need to change next week?',
]

export const HOBBY_CATEGORIES: { id: string; label: string; ideas: string }[] = [
  { id: 'art',      label: 'Visual art',     ideas: 'Painting, sketching, tattoo flash, digital art, collage' },
  { id: 'writing',  label: 'Writing',        ideas: 'Journal, lyrics, poetry, stories, personal writing' },
  { id: 'learning', label: 'Learning',       ideas: 'Business, marketing, fashion, finance, design, psychology' },
  { id: 'social',   label: 'Social',         ideas: 'Friends, family, brunch, concert' },
  { id: 'solo',     label: 'Solo activity',  ideas: 'Coffee, bookstore, solo date, art store' },
  { id: 'body',     label: 'Body / wellness', ideas: 'Gym, walk, Pilates, stretch, self-care' },
  { id: 'fun',      label: 'Fun / adventure', ideas: 'Beach, day trip, exploring, new restaurant' },
]

export function homeZone(n: number): { week: number; zone: string; focus: string } {
  if (n <= 7)  return { week: 1, zone: 'Bedroom', focus: 'Declutter, clean surfaces, fresh sheets, clothes put away.' }
  if (n <= 14) return { week: 2, zone: 'Bathroom + beauty', focus: 'Clear counters, organize products, toss expired items.' }
  if (n <= 21) return { week: 3, zone: 'Kitchen + living area', focus: 'Clean surfaces, reset the living space, better lighting.' }
  if (n <= 28) return { week: 4, zone: 'Decor, storage + finishing touches', focus: 'Storage, scent, lighting. Buy slowly, only what you now know you love.' }
  return { week: 5, zone: 'Finish + review', focus: 'Final touches and an honest review of the whole home.' }
}

// ---------- plan generation ----------

const toMin = (h: number, m = 0) => h * 60 + m
function fmt(min: number): string {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`
}

export function morningPlan(gym: boolean): PlanItem[] {
  const P: Part = 'morning'
  if (gym) {
    return [
      { id: 'wake', part: P, time: fmt(toMin(6)), label: 'Wake up', detail: 'Water, bathroom, basic wake-up.' },
      { id: 'water', part: P, time: fmt(toMin(6, 10)), label: 'Water', core: true },
      { id: 'gym', part: P, time: `${fmt(toMin(6, 15))} – ${fmt(toMin(7))}`, label: 'Gym', core: true },
      { id: 'shower', part: P, time: fmt(toMin(7)), label: 'Shower' },
      { id: 'ready', part: P, time: `${fmt(toMin(7, 20))} – ${fmt(toMin(7, 50))}`, label: 'Skincare, hair, makeup, outfit', detail: 'Get dressed intentionally. This is for me.', core: true },
      { id: 'breakfast', part: P, time: fmt(toMin(7, 50)), label: 'Breakfast', core: true },
      { id: 'outfit_photo', part: P, label: 'Photograph outfit', core: true },
      { id: 'capture_am', part: P, label: 'Capture 3–5 morning clips', detail: 'Gym, coffee, breakfast, outfit, hair/makeup, drive.' },
      { id: 'top3_review', part: P, time: fmt(toMin(8)), label: 'Pack, check schedule, review Top 3' },
      { id: 'leave', part: P, time: fmt(toMin(8, 15)), label: 'Leave prepared' },
    ]
  }
  return [
    { id: 'wake', part: P, time: fmt(toMin(6, 30)), label: 'Wake up' },
    { id: 'water', part: P, label: 'Water', core: true },
    { id: 'skincare', part: P, label: 'Wash face and skincare', core: true },
    { id: 'ready', part: P, label: 'Get ready intentionally', detail: 'Get dressed intentionally. This is for me.', core: true },
    { id: 'breakfast', part: P, label: 'Breakfast', core: true },
    { id: 'move_am', part: P, label: '10-minute stretch or walk, if possible' },
    { id: 'mindset', part: P, label: 'Journal / mindset' },
    { id: 'outfit_photo', part: P, label: 'Photograph outfit', core: true },
    { id: 'capture_am', part: P, label: 'Capture 3–5 morning clips' },
    { id: 'top3_review', part: P, label: 'Review Top 3, pack' },
    { id: 'leave', part: P, time: fmt(toMin(8, 15)), label: 'Leave prepared' },
  ]
}

export const WORK_CHECKINS: { hour: number; key: string; title: string; body: string }[] = [
  { hour: 9,  key: 'start',    title: 'Start',            body: 'What are your Top 3? Start Priority #1 before reacting to everybody else.' },
  { hour: 11, key: 'focus',    title: 'Focus check',      body: 'Are you working on your priorities or everybody else’s?' },
  { hour: 13, key: 'lunch',    title: 'Lunch reset',      body: 'Eat. Hydrate. Get away from the screen briefly. What still matters today?' },
  { hour: 15, key: 'afternoon', title: 'Afternoon focus', body: 'Do not scatter. What ONE thing needs to be finished?' },
  { hour: 17, key: 'no_rush',  title: 'Do not rush',      body: 'Your schedule belongs to you. Finish based on YOUR work, not when somebody else leaves.' },
]

export function workPlan(): PlanItem[] {
  const P: Part = 'work'
  return [
    ...WORK_CHECKINS.map(c => ({
      id: `work_${c.key}`, part: P, time: fmt(toMin(c.hour, c.hour === 9 ? 5 : 0)), label: c.title, detail: c.body,
    })),
    { id: 'eod_close', part: P, label: 'Close open tasks' },
    { id: 'eod_summary', part: P, label: 'EOD summary' },
    { id: 'eod_move', part: P, label: 'Decide what moves to tomorrow' },
    { id: 'eod_desk', part: P, label: 'Clean desk, 5 minutes' },
    { id: 'eod_first', part: P, label: 'Write tomorrow’s first work priority' },
  ]
}

export function afterWorkPlan(input: DayInput): PlanItem[] {
  const P: Part = 'after'
  const theme = themeFor(input.dateKey)
  const o = input.overrides ?? {}
  const delta = o.workUntil && o.workUntil > 17 ? Math.min((o.workUntil - 17) * 60, 150) : 0
  const t = (h: number, m = 0) => fmt(toMin(h, m) + delta)
  const low = input.energy === 'low'
  const isSunday = weekdayOf(input.dateKey) === 0
  const gymmed = input.gymToday === true

  const items: PlanItem[] = []
  items.push({
    id: 'transition', part: P,
    time: delta ? `Finish ${fmt(toMin(17) + delta)}` : '5:00 – 6:00 PM',
    label: gymmed ? 'Walk, errands, groceries or dinner' : 'Gym before going home, if you can',
    detail: delta ? 'You stayed late. The evening shifts, it does not fail.' : 'Finish work, commute, transition.',
  })
  items.push({ id: 'move_pm', part: P, label: gymmed ? 'Walk or stretch' : 'Gym, walk or stretch', detail: 'Any movement counts.' })
  items.push({ id: 'body_food', part: P, time: `${t(18)} – ${t(19)}`, label: 'Body + food', detail: 'Movement, dinner, hydrate, a couple of lifestyle clips.', core: true })

  if (o.customEvening) {
    items.push({ id: 'main_block', part: P, time: `${t(19)} – ${t(20, 30)}`, label: o.customEvening, detail: 'Your plan for tonight.', core: true })
  } else if (low) {
    items.push({ id: 'main_block', part: P, time: `${t(19)} – ${t(20, 30)}`, label: `Low-energy version: ${theme.block}`, detail: '10 minutes counts. Stop when 10 minutes is done, or keep going if it feels good.', core: true })
  } else {
    items.push({ id: 'main_block', part: P, time: `${t(19)} – ${t(20, 30)}`, label: `${theme.name}: ${theme.block}`, detail: `DONE means: ${theme.done}`, core: true })
  }
  items.push({ id: 'body_home', part: P, time: `${t(20, 30)} – ${t(21, 30)}`, label: 'Body + home', detail: 'Shower, skincare, shave/tan/hair when needed, 10–20 minute home reset.' })
  items.push({ id: 'home_reset', part: P, label: '10–20 minute home reset', core: true })
  items.push({ id: 'capture_pm', part: P, label: 'Capture evening clips', detail: 'Gym, sunset, dinner, art, errands, outfit, home reset.' })
  items.push({ id: 'private_win', part: P, label: 'One private win', detail: 'Something that does not get posted, sent or shown to anyone.', core: true })
  if (isSunday) {
    items.push({ id: 'sunday_reset', part: P, label: 'Sunday reset checklist', detail: 'Walk through it on the Week tab.', core: true })
  }
  return items
}

export function nightPlan(): PlanItem[] {
  const P: Part = 'night'
  return [
    { id: 'night_prep', part: P, time: '9:30 – 10:15 PM', label: 'Close the day', detail: 'Organize content, outfit, bag, keys, water, food idea, alarm.', core: true },
    { id: 'gym_decision', part: P, label: 'Gym tomorrow? Decide', core: true },
    { id: 'tomorrow_top3', part: P, label: 'Write tomorrow’s Top 3' },
    { id: 'night_journal', part: P, label: 'Night journal' },
    { id: 'wind_down', part: P, label: 'Read, music, a show, sleep' },
  ]
}

export function buildDay(input: DayInput): Record<Part, PlanItem[]> {
  const o = input.overrides ?? {}
  const skip = new Set(o.skipIds ?? [])
  const gym = input.gymToday === true
  const day: Record<Part, PlanItem[]> = {
    morning: morningPlan(gym),
    work: o.offDay ? [] : workPlan(),
    after: afterWorkPlan(input),
    night: nightPlan(),
  }
  if (input.energy === 'low') {
    // Low energy trims, it never removes the core care.
    day.morning = day.morning.filter(i => i.core || i.id === 'wake' || i.id === 'leave')
  }
  for (const k of Object.keys(day) as Part[]) day[k] = day[k].filter(i => !skip.has(i.id))
  return day
}

export function nonNegotiables(plan: Record<Part, PlanItem[]>): PlanItem[] {
  return Object.values(plan).flat().filter(i => i.core)
}

// ---------- I'M STUCK / I'M SPIRALING ----------

export const STUCK_STEPS: string[] = [
  'Feet on the floor.',
  'Bathroom.',
  'Wash your face and brush your teeth.',
  'Drink water.',
  'Put on clean clothes.',
  'Eat something small.',
  'Open the window or step outside for one minute.',
  'Pick up one thing you can see. Put it where it goes.',
  'Now: what is the next action?',
]

export const SPIRAL_QUESTIONS: string[] = [
  'What actually happened?',
  'What are you assuming?',
  'Is there a real action you need to take?',
  'If not, what does Zoe need to do next?',
]

export const SPIRAL_REMINDERS: string[] = [
  'His mood does not determine your day.',
  'You can care without chasing.',
  'You do not need to solve uncertainty right now.',
  'Do not abandon your plan because somebody else changed theirs.',
  'Would you still do this if nobody knew?',
  'Back to your life.',
]

export const NIGHT_JOURNAL_PROMPTS: string[] = [
  'What actually happened today?',
  'What story did anxiety add?',
  'What did I do today that belonged to me?',
  'What am I proud of?',
  'What do I need tomorrow?',
]

export const NIGHT_ASKS: string[] = [
  'Gym tomorrow?', 'What outfit?', 'What are the Top 3?', 'What content do we need?',
  'What hobby or creative block?', 'Any appointment?', 'Any errand?', 'Breakfast and lunch plan?',
  'What is tomorrow’s 30-day project action?',
]

export const STYLE_WORDS = ['Luxury', 'Creative', 'Feminine', 'Artistic', 'Interesting', 'Polished', 'Sexy', 'Confident']

export const CLOSET_QUESTIONS = [
  'Would Zoe Taylor buy this today?',
  'Does this belong to the life I am building?',
  'Does this feel intentional?',
]

export const BRAND_IDEA_KINDS: { id: string; label: string }[] = [
  { id: 'name', label: 'Brand names' }, { id: 'customer', label: 'Customer' }, { id: 'style', label: 'Style' },
  { id: 'silhouette', label: 'Silhouettes' }, { id: 'color', label: 'Colors' }, { id: 'texture', label: 'Textures + fabrics' },
  { id: 'quality', label: 'Quality' }, { id: 'price', label: 'Price point' }, { id: 'wish', label: 'Pieces I wish existed' },
  { id: 'wear', label: 'Pieces I constantly wear' }, { id: 'inspo', label: 'Pinterest / inspiration' },
  { id: 'first', label: 'Possible first products' }, { id: 'feeling', label: 'Brand feeling + luxury positioning' },
]

// ---------- "what is Zoe doing next?" ----------

export function nextAction(plan: Record<Part, PlanItem[]>, checks: Record<string, boolean>, hour: number): PlanItem | null {
  const order: Part[] = hour < 9 ? ['morning', 'work', 'after', 'night']
    : hour < 17 ? ['work', 'morning', 'after', 'night']
    : hour < 21 ? ['after', 'night', 'morning', 'work']
    : ['night', 'after', 'morning', 'work']
  for (const part of order) {
    const hit = plan[part].find(i => !checks[i.id])
    if (hit) return hit
  }
  return null
}

// ---------- progress ----------

export interface DayRecord {
  date_key: string
  energy?: Energy | null
  checks?: Record<string, boolean>
  stats?: Record<string, number | string | boolean>
  notes?: Record<string, string>
  top3?: { text: string; done?: boolean }[]
}

export interface Progress {
  movement: number
  gettingReady: number
  outfitPhotos: number
  contentCapture: number
  creative: number
  nightPrep: number
  noZero: number
  gymSessions: number
  clips: number
  edited: number
  posted: number
  ideas: number
  privateWins: number
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function computeProgress(days: DayRecord[]): Progress {
  const p: Progress = { movement: 0, gettingReady: 0, outfitPhotos: 0, contentCapture: 0, creative: 0, nightPrep: 0, noZero: 0, gymSessions: 0, clips: 0, edited: 0, posted: 0, ideas: 0, privateWins: 0 }
  for (const d of days) {
    const c = d.checks ?? {}
    const s = d.stats ?? {}
    const moved = !!(c.gym || c.move_am || c.move_pm)
    if (moved) p.movement++
    if (c.gym) p.gymSessions++
    if (c.ready) p.gettingReady++
    if (c.outfit_photo) p.outfitPhotos++
    if (num(s.clips) > 0 || c.capture_am || c.capture_pm) p.contentCapture++
    if (c.main_block || c.hobby_done) p.creative++
    if (c.night_prep) p.nightPrep++
    const anyAction = Object.values(c).some(Boolean) || num(s.clips) > 0
    if (anyAction) p.noZero++
    p.clips += num(s.clips)
    p.edited += num(s.edited)
    p.posted += num(s.posted)
    p.ideas += num(s.ideas)
    if (c.private_win || d.notes?.private_win) p.privateWins++
  }
  return p
}

export function weekHits(items: { kind: string; data?: Record<string, unknown>; date_key?: string | null }[], weekStart: string, weekEnd: string): Record<string, boolean> {
  const hits: Record<string, boolean> = {}
  for (const it of items) {
    if (it.kind !== 'hobby' || !it.date_key) continue
    if (it.date_key < weekStart || it.date_key > weekEnd) continue
    const cat = String(it.data?.category ?? '')
    if (cat) hits[cat] = true
  }
  return hits
}

export function weekRange(dateKey: string): { start: string; end: string } {
  const dow = weekdayOf(dateKey)
  const start = addDaysToKey(dateKey, dow === 0 ? -6 : 1 - dow)
  return { start, end: addDaysToKey(start, 6) }
}

/** Friday planning prompt: from Wednesday on, until a plan is saved. */
export function fridayPrompt(dateKey: string, hasFridayPlan: boolean): string | null {
  const dow = weekdayOf(dateKey)
  if ((dow === 3 || dow === 4) && !hasFridayPlan) return 'What are we doing Friday?'
  return null
}
