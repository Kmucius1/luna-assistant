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
