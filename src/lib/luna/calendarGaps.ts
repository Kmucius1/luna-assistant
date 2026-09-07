// Pure gap-finder over real calendar events — no AI involved. Slot labels
// are built directly from actual free time, not invented. Serves both
// grocery-time and meal-prep-time slot pickers by calling this with
// different options; it does NOT model kitchen-proximity or reason about
// whether a gap is realistically usable for a given errand (e.g. a 90-minute
// gap wedged between two out-of-town meetings still counts as "free"). A
// documented simplification, not a silently-assumed-solved one.
import type { CalendarEvent } from '@/lib/calendar'

const ZOE_TIMEZONE = 'America/New_York'
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export interface FreeSlot {
  day: string
  date: string
  start: string
  end: string
  durationMinutes: number
  label: string
}

export interface GapFindingOptions {
  minDurationMinutes: number
  windowStartHour: number
  windowEndHour: number
  excludeWorkHours: boolean
  daysAhead: number
  maxResults: number
}

const DEFAULT_OPTIONS: GapFindingOptions = {
  minDurationMinutes: 60,
  windowStartHour: 6,
  windowEndHour: 21,
  excludeWorkHours: false,
  daysAhead: 7,
  maxResults: 6,
}

function localParts(iso: string): { dateKey: string; minutesOfDay: number; day: string } {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZOE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long',
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const dateKey = `${get('year')}-${get('month')}-${get('day')}`
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  return { dateKey, minutesOfDay: hour * 60 + minute, day: get('weekday') }
}

function formatClock(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60)
  const m = minutesOfDay % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function findFreeSlots(events: CalendarEvent[], options: Partial<GapFindingOptions> = {}): FreeSlot[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const windowStart = opts.windowStartHour * 60
  const windowEnd = opts.windowEndHour * 60

  const now = new Date()
  const maxDate = new Date(now)
  maxDate.setDate(maxDate.getDate() + opts.daysAhead)

  const busyByDate = new Map<string, { start: number; end: number }[]>()
  for (const ev of events) {
    if (ev.allDay) continue
    const startD = new Date(ev.start)
    if (startD > maxDate) continue
    const { dateKey, minutesOfDay: startMin } = localParts(ev.start)
    const { minutesOfDay: rawEndMin, dateKey: endDateKey } = localParts(ev.end)
    // Clamp events that cross midnight to the end of the start day — this
    // gap-finder works within a single day's window, not across days.
    const endMin = endDateKey === dateKey ? rawEndMin : 24 * 60
    const list = busyByDate.get(dateKey) ?? []
    list.push({ start: startMin, end: endMin })
    busyByDate.set(dateKey, list)
  }
  for (const list of busyByDate.values()) list.sort((a, b) => a.start - b.start)

  const results: FreeSlot[] = []

  for (let offset = 0; offset < opts.daysAhead && results.length < opts.maxResults; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    const { dateKey, day } = localParts(d.toISOString())

    const busy = (busyByDate.get(dateKey) ?? []).slice()
    if (opts.excludeWorkHours && day !== 'Saturday' && day !== 'Sunday') {
      busy.push({ start: 10 * 60, end: 18 * 60 })
      busy.sort((a, b) => a.start - b.start)
    }

    let cursor = offset === 0 ? Math.max(windowStart, localParts(now.toISOString()).minutesOfDay) : windowStart
    for (const block of busy) {
      if (block.start > cursor && block.start - cursor >= opts.minDurationMinutes && cursor < windowEnd) {
        const slotEnd = Math.min(block.start, windowEnd)
        if (slotEnd - cursor >= opts.minDurationMinutes) {
          results.push({
            day, date: dateKey, start: formatClock(cursor), end: formatClock(slotEnd),
            durationMinutes: slotEnd - cursor,
            label: `${day} ${formatClock(cursor)}–${formatClock(slotEnd)}`,
          })
        }
      }
      cursor = Math.max(cursor, block.end)
    }
    if (windowEnd - cursor >= opts.minDurationMinutes) {
      results.push({
        day, date: dateKey, start: formatClock(cursor), end: formatClock(windowEnd),
        durationMinutes: windowEnd - cursor,
        label: `${day} ${formatClock(cursor)}–${formatClock(windowEnd)}`,
      })
    }
  }

  return results.slice(0, opts.maxResults)
}

export { WEEKDAY_NAMES }
