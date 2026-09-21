// Today + the next 5 local calendar dates, as 'YYYY-MM-DD' keys — the
// shared 6-day window used by both the daily-readings route and the
// generate-readings cron. DST-safe: once we've resolved "today" in the
// target timezone down to plain Y/M/D numbers, every subsequent day is
// just a calendar increment (no further timezone math), so a DST
// transition mid-window can't skip or duplicate a date.

function localYMD(date: Date, timezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? '0')
  return { year: get('year'), month: get('month'), day: get('day') }
}

function formatYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/** The 'YYYY-MM-DD' calendar date `date` falls on in `timezone`. Used to check
    whether a stored reading's generated_at actually happened on the calendar
    day it's serving as "today" for, vs. having been pre-generated earlier as
    part of a prior window fetch. */
export function localDateKeyFromDate(date: Date, timezone: string): string {
  const { year, month, day } = localYMD(date, timezone)
  return formatYMD(year, month, day)
}

export function getSixDayWindow(timezone: string = 'America/New_York'): string[] {
  const { year, month, day } = localYMD(new Date(), timezone)
  // Anchor at UTC noon on the resolved local date — plenty of margin from
  // any UTC-day boundary, so day-by-day increments never roll over wrong.
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

  const keys: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(anchor)
    d.setUTCDate(d.getUTCDate() + i)
    keys.push(formatYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()))
  }
  return keys
}

/** Parse a 'YYYY-MM-DD' date key back into a real Date for calculation use. */
export function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * The instant of 12:00 noon on `dateKey` in `timezone`. Readings are calculated
 * for this moment, not `dateFromKey()`: that returns server-local midnight, which
 * on Vercel (UTC) is 8 PM ET the evening BEFORE — so every reading carried the
 * previous day's date, and its Moon sign/phase came from the previous night's sky.
 * DST-safe: the offset is measured at the noon instant itself.
 */
export function localNoonFromKey(dateKey: string, timezone: string = 'America/New_York'): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  const guess = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(guess)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const asIfLocalWereUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return new Date(guess.getTime() - (asIfLocalWereUTC - guess.getTime()))
}
