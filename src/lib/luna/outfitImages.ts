// Shared by daily-outfit and weekly-outfit-plan so "today's pick" and "this
// week's plan" always agree, and so the same photo never repeats within a
// single calendar week — Zoe's explicit rule: never the same outfit twice
// in one week. Pinterest/Higgsfield hotlinks aren't reliable image sources
// (see daily-outfit's original comment), so this stays a local pool.
export const OUTFIT_IMAGES = [
  '/images/outfits/streetwear-01.jpg',
  '/images/outfits/streetwear-02.jpg',
  '/images/outfits/streetwear-03.jpg',
  '/images/outfits/streetwear-04.jpg',
]

function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let state = h >>> 0
  function rand() {
    state |= 0
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Monday of the week containing this 'YYYY-MM-DD' date key, as a date key. */
export function mondayOfWeek(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/**
 * Distinct image per day within its calendar week — as long as
 * OUTFIT_IMAGES.length >= 7, no image repeats within any single week.
 * Different weeks get a different shuffle order (seeded by that week's
 * Monday), so the rotation doesn't feel mechanically identical week to week.
 */
export function outfitImageForDate(dateKey: string): string {
  const weekStart = mondayOfWeek(dateKey)
  const shuffled = seededShuffle(OUTFIT_IMAGES, weekStart)
  const dayIndex = Math.round((new Date(`${dateKey}T12:00:00`).getTime() - new Date(`${weekStart}T12:00:00`).getTime()) / 86_400_000)
  return shuffled[((dayIndex % shuffled.length) + shuffled.length) % shuffled.length]
}
