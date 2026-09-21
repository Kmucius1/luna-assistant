import type { CalendarEvent } from '@/lib/calendar'

// People with their own accent color, so their events are recognizable at a
// glance on the Calendar page, and so other pages (e.g. Work) can identify
// and exclude their events consistently.
export const PEOPLE: { email: string; label: string; color: string }[] = [
  { email: 'mick@hooverdigital.com', label: 'Mick', color: '#E08B4A' },
]

export function personFor(ev: CalendarEvent): { label: string; color: string } | null {
  const emails = [ev.organizer, ...(ev.attendeeEmails ?? [])].filter(Boolean).map(e => e!.toLowerCase())
  const calendarName = ev.calendar?.toLowerCase() ?? ''
  for (const p of PEOPLE) {
    if (emails.includes(p.email.toLowerCase()) || calendarName.includes(p.label.toLowerCase())) return p
  }
  return null
}

export function isMickEvent(ev: CalendarEvent): boolean {
  return personFor(ev)?.label === 'Mick'
}

// Zoe doesn't want anything Mick does surfacing in LUNA, including Gmail
// priority/needs-attention flags. Applied on read so a stale `priority_contacts`
// row for him in the database can't bring him back.
export function isMickContact(c: { name: string; email?: string | null }): boolean {
  const mick = PEOPLE.find(p => p.label === 'Mick')
  return /\bmick\b/i.test(c.name) || (!!mick && (c.email ?? '').toLowerCase() === mick.email.toLowerCase())
}

// Mick's own calendar, subscribed inside a connected Google account. Zoe does
// not want anything he's doing in LUNA, so calendar.ts skips this calendar
// before fetching its events — one filter that every planner and screen inherits.
// Matches the calendar itself, not meetings on Zoe's calendars where he's an attendee.
export function isMickCalendar(cal: { id: string; summary?: string }): boolean {
  const mick = PEOPLE.find(p => p.label === 'Mick')
  if (!mick) return false
  return cal.id.toLowerCase() === mick.email.toLowerCase()
    || (cal.summary ?? '').toLowerCase() === mick.email.toLowerCase()
    || (cal.summary ?? '').toLowerCase().includes('mick')
}
