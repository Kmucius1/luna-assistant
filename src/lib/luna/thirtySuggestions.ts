// Suggestion engine for the 30-day plan lists. Pure and deterministic: the same
// day + list + refresh count always gives the same options, and each refresh
// brings a different, still-sensible set. "Sensible" means filtered by what day
// it is (the weekly theme), her energy, morning vs evening, and what she has
// already added or done, then lightly shuffled so refreshing never repeats.

import { weekdayOf } from '@/lib/luna/thirtyDay'

export type SuggestKind =
  | 'outfit' | 'content' | 'creative' | 'errands' | 'block'
  | 'top_work' | 'top_life' | 'top_create'

export interface SuggestCtx {
  dateKey: string
  energy: 'low' | 'normal' | 'high'
  themeOptions: string[]       // options for today's weekly theme
  keptPieces: string[]         // closet items she marked KEEP
  savedCombos: string[]        // outfit combos she saved
  repeatOutfits: string[]      // favorite elements from outfits she rated 8+
}

interface Cand {
  t: string
  days?: number[]              // 0=Sun..6=Sat; omit = any day
  when?: 'am' | 'pm'
  lowOk?: boolean              // fine on a low-energy day
  heavy?: boolean              // skip on low-energy days
}

const CONTENT: Cand[] = [
  { t: 'Coffee or water being poured', when: 'am', lowOk: true },
  { t: 'Skincare routine, close-up', when: 'am', lowOk: true },
  { t: 'Outfit check in the mirror', when: 'am', lowOk: true },
  { t: 'Hair and makeup getting-ready montage', when: 'am' },
  { t: 'Drive or walk to start the day', when: 'am', lowOk: true },
  { t: 'Gym or warm-up clip', when: 'am', heavy: true },
  { t: 'Breakfast or lunch plating', when: 'am', lowOk: true },
  { t: 'Work setup, desk and tools', when: 'am', lowOk: true },
  { t: 'Spoken thought: one thing on your mind today', lowOk: true },
  { t: 'Sunset or golden-hour sky', when: 'pm', lowOk: true },
  { t: 'Dinner cooking or plating', when: 'pm', lowOk: true },
  { t: 'Art or sketch in progress', when: 'pm' },
  { t: 'Errand or shopping detail shots', when: 'pm' },
  { t: 'Home reset, before and after', when: 'pm' },
  { t: 'Night skincare and wind-down', when: 'pm', lowOk: true },
  { t: 'Outfit for the evening, full-length', when: 'pm' },
  { t: 'Closet piece you are deciding on (keep or sell)', days: [2, 0], lowOk: true },
  { t: 'Three hook ideas spoken to camera', days: [3] },
  { t: 'B-roll of a place you pass every day', days: [6, 3] },
  { t: 'New place, new angle: café, shop or street', days: [6, 5] },
]

const ERRANDS: Cand[] = [
  { t: 'Groceries', days: [0, 6, 3], lowOk: true },
  { t: 'Laundry', days: [0, 6] },
  { t: 'Fresh sheets', days: [0] },
  { t: 'Take out the trash', lowOk: true },
  { t: 'Return or ship a package', lowOk: true },
  { t: 'Pack the gym bag for tomorrow', when: 'pm', lowOk: true },
  { t: 'Refill water bottle and prep lunch', when: 'pm', lowOk: true },
  { t: 'Pay or review one bill', days: [2, 0], lowOk: true },
  { t: 'Answer one message you have been avoiding', lowOk: true },
  { t: 'Book one appointment (hair, nails, health)', days: [4], lowOk: true },
  { t: 'Wash the car or clear the car interior', days: [0, 6] },
  { t: 'Put away everything sitting on a chair or floor', lowOk: true },
  { t: 'Charge camera, phone and earbuds', when: 'pm', lowOk: true },
  { t: 'Photograph 5 clothing items to sell', days: [2], lowOk: true },
  { t: 'Prepare tomorrow’s outfit', when: 'pm', lowOk: true },
]

const CREATIVE_BY_DAY: Record<number, Cand[]> = {
  1: [
    { t: '45 minutes on a painting' }, { t: 'Sketch three tattoo flash ideas' }, { t: 'Finish one illustration' },
    { t: 'Digital art: one clean piece' }, { t: 'Write the first verse of a lyric', lowOk: true }, { t: '10 minutes of loose drawing, no goal', lowOk: true },
  ],
  2: [
    { t: 'Sketch a piece you wish existed in your closet', lowOk: true }, { t: 'Collage a mood board for your style', lowOk: true },
    { t: 'Draw an outfit idea', lowOk: true },
  ],
  3: [
    { t: 'Edit one Reel or TikTok' }, { t: 'Write 5 hooks', lowOk: true }, { t: 'Storyboard a short series', lowOk: true },
    { t: 'Organize this week’s clips into folders', lowOk: true },
  ],
  4: [{ t: '10 minutes sketching for fun', lowOk: true }, { t: 'Write in your journal with music on', lowOk: true }],
  5: [{ t: 'Take photos while you are out', lowOk: true }, { t: 'Sketch something you see tonight', lowOk: true }],
  6: [
    { t: 'Longer painting or drawing block' }, { t: 'Creative shoot: outfit plus a location' }, { t: 'Sketch from a place you visit today' },
    { t: 'Collect fashion inspiration, then draw from it', lowOk: true },
  ],
  0: [{ t: '10 minutes sketching to start the week', lowOk: true }, { t: 'Plan next week’s creative blocks', lowOk: true }],
}
const CREATIVE_ANY: Cand[] = [
  { t: 'One page of writing: lyrics, poetry or a story', lowOk: true },
  { t: 'Add 3 ideas to your clothing-brand idea bank', lowOk: true },
  { t: 'Learn one thing: design, fashion, business or finance', lowOk: true },
  { t: 'Practice a skill for 20 minutes' },
]

const TOP_WORK: Cand[] = [
  { t: 'Finish one client deliverable start to finish' },
  { t: 'Send the follow-up you have been putting off', lowOk: true },
  { t: 'Block 90 minutes of deep work before checking messages' },
  { t: 'Invoice or follow up on anything unpaid', lowOk: true },
  { t: 'Close out one open task from yesterday', lowOk: true },
  { t: 'Plan this week’s DRYP priorities', days: [1, 0] },
  { t: 'Review your numbers and move money to the Camera Fund', days: [2, 0], lowOk: true },
  { t: 'Reply to your most important client message first', lowOk: true },
]
const TOP_LIFE: Cand[] = [
  { t: 'Eat three real meals and finish your water', lowOk: true },
  { t: '15-minute reset of the room you are in', lowOk: true },
  { t: 'Call or text one person who makes you feel good', lowOk: true },
  { t: 'Book the appointment you keep postponing', lowOk: true },
  { t: 'Go to the gym or take a 20-minute walk' },
  { t: 'Be in bed with lights out by 10:30', lowOk: true },
  { t: 'Do one thing just because you want to', lowOk: true },
  { t: 'Plan your Friday', days: [3, 4], lowOk: true },
]

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pool(kind: SuggestKind, ctx: SuggestCtx, when: 'am' | 'pm' | 'any'): Cand[] {
  const dow = weekdayOf(ctx.dateKey)
  switch (kind) {
    case 'outfit':
      return [
        ...ctx.savedCombos.map(t => ({ t, lowOk: true })),
        ...ctx.repeatOutfits.map(t => ({ t: `Re-wear what worked: ${t}`, lowOk: true })),
        ...ctx.keptPieces.slice(0, 40).map(t => ({ t: `Build around: ${t}`, lowOk: true })),
        { t: 'Something comfortable but elevated', lowOk: true },
        { t: 'All black with one gold piece', lowOk: true },
        { t: 'Soft neutrals, textured knit', lowOk: true },
        { t: 'Polished and sexy: fitted, one statement piece', days: [5, 6] },
        { t: 'Camera-ready: clean lines, no logos', days: [3] },
        { t: 'Artist look: layered, interesting shoes', days: [1, 6] },
        { t: 'Gym set that is also cute enough for errands', days: [4], lowOk: true },
        { t: 'Luxury basics: tailored trousers, silk or satin top' },
      ]
    case 'content':
      return CONTENT
    case 'errands':
      return ERRANDS
    case 'creative':
      return [...(CREATIVE_BY_DAY[dow] ?? []), ...CREATIVE_ANY]
    case 'block':
      return ctx.themeOptions.map(t => ({ t, lowOk: true }))
    case 'top_work':
      return TOP_WORK
    case 'top_life':
      return TOP_LIFE
    case 'top_create': {
      const base = [...(CREATIVE_BY_DAY[dow] ?? []), ...CREATIVE_ANY]
      return when === 'pm' ? base : [...base, { t: 'Capture 5 usable clips today', lowOk: true }]
    }
  }
}

/**
 * Up to `n` suggestions for a list. `seed` increases by one every time she taps
 * refresh. Options already on her list (`exclude`) are never offered again.
 */
export function suggestions(
  kind: SuggestKind, ctx: SuggestCtx, seed: number, exclude: string[], n = 4, when: 'am' | 'pm' | 'any' = 'any',
): string[] {
  const dow = weekdayOf(ctx.dateKey)
  const taken = new Set(exclude.map(x => x.trim().toLowerCase()))
  // Order is fixed for a given day and list; refresh pages through it, so a
  // refresh never repeats an option until everything sensible has been shown.
  const r = rng(hash(`${ctx.dateKey}:${kind}`))

  const scored = pool(kind, ctx, when)
    .filter(c => !taken.has(c.t.toLowerCase()))
    .filter(c => !(ctx.energy === 'low' && c.heavy))
    .map(c => {
      let score = r() * 0.6
      if (c.days) score += c.days.includes(dow) ? 1.2 : -2   // wrong-day items sink, not vanish
      if (c.when && when !== 'any') score += c.when === when ? 0.8 : -1.5
      if (ctx.energy === 'low') score += c.lowOk ? 0.8 : -0.6
      return { t: c.t, score }
    })
    .sort((a, b) => b.score - a.score)

  // Each refresh walks further down the ranked list so options keep changing,
  // wrapping back to the top only after everything sensible has been shown.
  const usable = scored.filter(s => s.score > -1)
  const list = usable.length >= n ? usable : scored
  if (list.length === 0) return []
  const start = (seed * n) % list.length
  const out: string[] = []
  for (let i = 0; i < Math.min(n, list.length); i++) out.push(list[(start + i) % list.length].t)
  return out
}
