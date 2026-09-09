import { localDateKey, localHour } from './dailyCache'

/**
 * Both the daily plan and the weekly reset roll over at 4am local, not
 * midnight — she's often still up past midnight, and a plan for "today"
 * that flips over while she's still awake in the previous day is wrong.
 */
export const PLANNING_RESET_HOUR = 4

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export type WeekdayName = typeof WEEKDAY_NAMES[number]

/** 'YYYY-MM-DD' for the current planning day — before 4am local still counts as yesterday. */
export function planningDateKey(date: Date, timezone: string): string {
  const hour = localHour(date, timezone)
  const effective = hour < PLANNING_RESET_HOUR ? new Date(date.getTime() - 24 * 60 * 60 * 1000) : date
  return localDateKey(effective, timezone)
}

/** Weekday name ('Monday'..'Sunday') for a 'YYYY-MM-DD' key, parsed at noon UTC to dodge DST edges. */
export function weekdayOfKey(dateKey: string): WeekdayName {
  const [y, m, d] = dateKey.split('-').map(Number)
  return WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]
}

function mondayOfKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  const day = dt.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setUTCDate(dt.getUTCDate() + diff)
  return dt.toISOString().split('T')[0]
}

/**
 * This planning cycle's Monday key. Sunday from 4am local already counts
 * as the week ahead (its Monday is tomorrow) rather than the week that's
 * ending — that's the actual moment the weekly reset requirement flips.
 */
export function planningWeekMondayKey(date: Date, timezone: string): string {
  const pKey = planningDateKey(date, timezone)
  if (weekdayOfKey(pKey) === 'Sunday') {
    const [y, m, d] = pKey.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d, 12))
    dt.setUTCDate(dt.getUTCDate() + 1)
    return dt.toISOString().split('T')[0]
  }
  return mondayOfKey(pKey)
}

export const FULL_WEEK: WeekdayName[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Which weekdays this reset actually needs to plan. Run fresh at the start
 * of the cycle (Monday, or Sunday once the cycle has flipped) -> the full
 * week. Run as a mid-week catch-up (Sunday got missed) -> only today
 * through Saturday, since Monday/Tuesday already happened and Sunday
 * belongs to the next cycle's own reset, not this one.
 */
export function daysToPlanFor(date: Date, timezone: string): WeekdayName[] {
  const weekday = weekdayOfKey(planningDateKey(date, timezone))
  if (weekday === 'Monday' || weekday === 'Sunday') return FULL_WEEK
  return FULL_WEEK.slice(FULL_WEEK.indexOf(weekday), 6)
}
