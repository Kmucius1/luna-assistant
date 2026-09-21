// "Today" for this app is Zoe's calendar day in America/New_York — never the
// server's. Vercel runs in UTC, so `new Date().toISOString().split('T')[0]`
// flips to tomorrow at 8 PM ET; every evening, features built on it treated
// tomorrow as today (bills due today looked overdue, meals logged at 9 PM were
// filed under tomorrow, the week/month rolled over early). Use these instead.
// No server-only imports, so this is safe anywhere.

export const APP_TIMEZONE = 'America/New_York'

/** 'YYYY-MM-DD' for `date` as seen on the wall calendar in `tz`. */
export function todayKey(date: Date = new Date(), tz: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Add whole calendar days to a 'YYYY-MM-DD' key (noon-anchored, so DST can't shift it). */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
}

/** 'YYYY-MM-DD' `n` calendar days after today in `tz`. */
export function daysFromNow(n: number, tz: string = APP_TIMEZONE): string {
  return addDaysToKey(todayKey(new Date(), tz), n)
}

/** Monday of the week containing `date` (in `tz`), as a date key. */
export function mondayKeyOf(date: Date = new Date(), tz: string = APP_TIMEZONE): string {
  const key = todayKey(date, tz)
  const [y, m, d] = key.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0 = Sunday
  return addDaysToKey(key, dow === 0 ? -6 : 1 - dow)
}

/** First and last day of the current month in `tz`, as date keys. */
export function monthBoundsKeys(tz: string = APP_TIMEZONE): { start: string; end: string } {
  const [y, m] = todayKey(new Date(), tz).split('-').map(Number)
  return { start: `${y}-${String(m).padStart(2, '0')}-01`, end: new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10) }
}
