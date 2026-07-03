// Lightweight Chinese astrology — Phase 1 scope only: the 60-day
// Sexagenary cycle DAY stem/branch/element, computed via pure Julian Day
// Number modular arithmetic. This works for any date with no lunisolar
// calendar or solar-term data, because the day cycle repeats continuously
// from a fixed historical epoch — unlike month/year pillars, which need
// solar-term boundaries and are out of scope here (Phase 3, full BaZi).
//
// Verified against a published worked example: March 13, 1781 → JDN
// 2371629 → stem index 9 ("Rén"), branch index 11 ("Xū").

const STEMS = ['Jiǎ', 'Yǐ', 'Bǐng', 'Dīng', 'Wù', 'Jǐ', 'Gēng', 'Xīn', 'Rén', 'Guǐ'] as const
const BRANCHES = [
  'Zǐ', 'Chǒu', 'Yín', 'Mǎo', 'Chén', 'Sì',
  'Wǔ', 'Wèi', 'Shēn', 'Yǒu', 'Xū', 'Hài',
] as const

export type FiveElement = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water'

const STEM_ELEMENT: Record<(typeof STEMS)[number], FiveElement> = {
  'Jiǎ': 'Wood', 'Yǐ': 'Wood',
  'Bǐng': 'Fire', 'Dīng': 'Fire',
  'Wù': 'Earth', 'Jǐ': 'Earth',
  'Gēng': 'Metal', 'Xīn': 'Metal',
  'Rén': 'Water', 'Guǐ': 'Water',
}

export interface ChineseDayEnergy {
  stem: string
  branch: string
  label: string
  element: FiveElement
  cycleIndex: number
}

/** Fliegel & Van Flandern algorithm — Julian Day Number from a Gregorian Y/M/D. */
export function toJulianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return (
    day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045
  )
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function getChineseDayEnergy(year: number, month: number, day: number): ChineseDayEnergy {
  const jdn = toJulianDayNumber(year, month, day)
  const stemIndex = 1 + mod(jdn - 1, 10)
  const branchIndex = 1 + mod(jdn + 1, 12)
  const stem = STEMS[stemIndex - 1]
  const branch = BRANCHES[branchIndex - 1]
  // 1-60 position in the combined stem/branch cycle (LCM of 10 and 12).
  const cycleIndex = 1 + mod(jdn - 1, 60)

  return {
    stem,
    branch,
    label: `${stem} ${branch}`,
    element: STEM_ELEMENT[stem],
    cycleIndex,
  }
}

export const ELEMENT_GUIDANCE: Record<FiveElement, string> = {
  Wood: 'Today\'s energy may support growth, initiative, and new beginnings — a day to notice where you want to expand.',
  Fire: 'Today\'s energy may support visibility, passion, and connection — a day to notice where your warmth wants to be expressed.',
  Earth: 'Today\'s energy may support stability, nourishment, and groundedness — a day to notice where you need more steadiness.',
  Metal: 'Today\'s energy may support clarity, structure, and letting go of what\'s no longer useful — a day to notice what needs sharpening or releasing.',
  Water: 'Today\'s energy may support intuition, reflection, and emotional depth — a day to notice what wants to be felt rather than fixed.',
}
