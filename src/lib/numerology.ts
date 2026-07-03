// Pure-arithmetic numerology (Pythagorean method). No external dependency —
// every value here is derived from simple digit-sum reduction.

export interface LifePathResult {
  number: number
  isMasterNumber: boolean
}

const MASTER_NUMBERS = new Set([11, 22, 33])

/** Sum of the decimal digits of |n| (single pass, not reduced further). */
export function digitSum(n: number): number {
  return Math.abs(n)
    .toString()
    .split('')
    .reduce((sum, d) => sum + Number(d), 0)
}

/**
 * Repeatedly digit-sums n until it's a single digit, unless allowMaster is
 * true and the running value lands on 11, 22, or 33 — in which case it
 * stops there (the standard Pythagorean master-number exception).
 */
export function reduceNumber(n: number, allowMaster: boolean): number {
  let value = Math.abs(n)
  while (value > 9 && !(allowMaster && MASTER_NUMBERS.has(value))) {
    value = digitSum(value)
  }
  return value
}

/**
 * Life Path Number: month, day, and year are each reduced separately
 * (allowed to stop on a master number), then the three reduced values are
 * summed and that sum is reduced the same way. This three-component method
 * is the standard convention (matches World Numerology / Token Rock).
 */
export function calculateLifePath(birthDate: Date): LifePathResult {
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  const year = birthDate.getFullYear()

  const reducedMonth = reduceNumber(month, true)
  const reducedDay = reduceNumber(day, true)
  const reducedYear = reduceNumber(year, true)

  const number = reduceNumber(reducedMonth + reducedDay + reducedYear, true)
  return { number, isMasterNumber: MASTER_NUMBERS.has(number) }
}

/**
 * Personal Year/Month/Day numbers. Unlike Life Path, these are
 * conventionally fully reduced to 1-9 for practical day-to-day guidance —
 * master numbers are not preserved here, which is a deliberate difference
 * from calculateLifePath, not an oversight.
 */
export function calculatePersonalYear(birthDate: Date, currentYear: number): number {
  const month = birthDate.getMonth() + 1
  const day = birthDate.getDate()
  return reduceNumber(month + day + currentYear, false)
}

export function calculatePersonalMonth(birthDate: Date, currentDate: Date): number {
  const personalYear = calculatePersonalYear(birthDate, currentDate.getFullYear())
  const month = currentDate.getMonth() + 1
  return reduceNumber(personalYear + month, false)
}

export function calculatePersonalDay(birthDate: Date, currentDate: Date): number {
  const personalMonth = calculatePersonalMonth(birthDate, currentDate)
  const day = currentDate.getDate()
  return reduceNumber(personalMonth + day, false)
}

export const PERSONAL_DAY_MEANINGS: Record<number, string> = {
  1: 'A day that favors starting something, taking initiative, or making a decision you\'ve been sitting on.',
  2: 'A day that favors patience, partnership, and listening — cooperation over solo effort.',
  3: 'A day that favors expression — conversation, creativity, being seen and heard.',
  4: 'A day that favors structure — organizing, finishing practical tasks, building something steady.',
  5: 'A day that favors flexibility — change, movement, and staying open to the unexpected.',
  6: 'A day that favors care — home, relationships, responsibility to people you love.',
  7: 'A day that favors reflection — solitude, research, and trusting your inner read on things.',
  8: 'A day that favors action on ambition — money, work, and claiming your own authority.',
  9: 'A day that favors release — closing a chapter, letting go of what no longer fits.',
}

export function getPersonalDayMeaning(day: number): string {
  return PERSONAL_DAY_MEANINGS[day] ?? 'A day to notice what feels aligned and what feels forced.'
}

// Phase 2 (deferred, not implemented): Expression/Destiny Number, Soul Urge
// Number, and Personality Number all require a full legal birth name, which
// isn't part of this app's current profile data. Add calculateExpression /
// calculateSoulUrge / calculatePersonality once a name field exists.
