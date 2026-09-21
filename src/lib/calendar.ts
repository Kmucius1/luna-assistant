import { createClient } from '@supabase/supabase-js'
import { localDateKey } from '@/lib/luna/dailyCache'
import { isMickCalendar } from '@/lib/calendarPeople'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

// Vercel's serverless runtime has no TZ set, so plain Date/Intl formatting
// without an explicit timeZone renders in UTC — several hours off from
// Zoe's actual local time. This app is single-tenant for her (Tampa, FL).
const ZOE_TIMEZONE = 'America/New_York'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function refreshAccessToken(refresh_token: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)
  return res.json()
}

async function getValidTokens(): Promise<{ access_token: string; email: string }[]> {
  const db = adminDb()
  const { data } = await db
    .from('gmail_tokens')
    .select('id, email, access_token, refresh_token, token_expiry')
    .order('connected_at', { ascending: true })

  if (!data?.length) return []

  const results: { access_token: string; email: string }[] = []

  await Promise.all(data.map(async (row: {
    id: string; email: string; access_token: string; refresh_token: string; token_expiry: string
  }) => {
    try {
      const expiry       = row.token_expiry ? new Date(row.token_expiry).getTime() : 0
      const needsRefresh = Date.now() > expiry - 60_000
      let access_token   = row.access_token

      if (needsRefresh && row.refresh_token) {
        const refreshed = await refreshAccessToken(row.refresh_token)
        access_token    = refreshed.access_token
        const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        await db.from('gmail_tokens').update({ access_token, token_expiry: newExpiry }).eq('id', row.id)
      }

      results.push({ access_token, email: row.email })
    } catch { /* skip expired/bad token */ }
  }))

  return results
}

async function calFetch(access_token: string, path: string) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!res.ok) throw new Error(`Calendar API ${res.status}: ${await res.text()}`)
  return res.json()
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  startTime: string
  endTime: string
  allDay: boolean
  location?: string
  description?: string
  htmlLink?: string
  colorId?: string
  hangoutLink?: string
  conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] }
  calendar: string
  calendarId: string
  account: string
  isToday: boolean
  isTomorrow: boolean
  isPast: boolean
  status?: string
  organizer?: string
  attendeeCount?: number
  attendeeEmails?: string[]
}

function formatTime(dateStr: string, allDay: boolean): string {
  if (allDay) return 'All day'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: ZOE_TIMEZONE,
  }).format(new Date(dateStr))
}

// Calendar reads fan out across every connected account and calendar on
// every call — a short cache avoids repeating that whole fan-out on every
// Home/dashboard load within the same warm instance.
const EVENTS_CACHE_TTL_MS = 45_000
const eventsCache = new Map<number, { events: CalendarEvent[]; expiresAt: number }>()

export async function getUpcomingEvents(daysAhead = 14): Promise<CalendarEvent[]> {
  const cached = eventsCache.get(daysAhead)
  if (cached && cached.expiresAt > Date.now()) return cached.events

  const tokens = await getValidTokens()
  if (!tokens.length) return []

  const now      = new Date()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const maxTime  = new Date(now); maxTime.setDate(maxTime.getDate() + daysAhead)

  const todayKey    = localDateKey(now, ZOE_TIMEZONE)
  const tomorrowKey = localDateKey(tomorrow, ZOE_TIMEZONE)

  const allEvents: CalendarEvent[] = []

  await Promise.all(tokens.map(async (tok) => {
    try {
      const calList  = await calFetch(tok.access_token, '/users/me/calendarList?maxResults=20')
      // Filtered before the 8-calendar cap and before any events are fetched.
      const calendars: { id: string; summary: string }[] = (calList.items ?? []).filter(
        (c: { id: string; summary: string }) => !isMickCalendar(c),
      )

      await Promise.all(calendars.slice(0, 8).map(async (cal) => {
        try {
          const params = new URLSearchParams({
            timeMin:      now.toISOString(),
            timeMax:      maxTime.toISOString(),
            maxResults:   '50',
            singleEvents: 'true',
            orderBy:      'startTime',
          })
          const data  = await calFetch(tok.access_token, `/calendars/${encodeURIComponent(cal.id)}/events?${params}`)
          const items = (data.items ?? []) as Array<{
            id: string; summary?: string; status?: string
            start?: { dateTime?: string; date?: string }
            end?:   { dateTime?: string; date?: string }
            location?: string; description?: string; htmlLink?: string; colorId?: string
            hangoutLink?: string; conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] }
            organizer?: { email?: string }; attendees?: { email?: string }[]
          }>

          for (const ev of items) {
            if (ev.status === 'cancelled') continue
            const startStr = ev.start?.dateTime ?? ev.start?.date ?? ''
            const endStr   = ev.end?.dateTime   ?? ev.end?.date   ?? ''
            const allDay   = !ev.start?.dateTime
            // All-day events come back as a bare 'YYYY-MM-DD' with no
            // offset — `new Date()` parses that as UTC midnight, which in
            // America/New_York is still the evening BEFORE that date,
            // shifting every all-day event one day earlier. Anchor to UTC
            // noon instead, which stays the correct calendar day in any
            // continental US timezone.
            const startD = allDay
              ? new Date(`${startStr}T12:00:00Z`)
              : new Date(startStr)
            const startKey = localDateKey(startD, ZOE_TIMEZONE)

            allEvents.push({
              id:            ev.id,
              title:         ev.summary ?? '(No title)',
              start:         startStr,
              end:           endStr,
              startTime:     formatTime(startStr, allDay),
              endTime:       formatTime(endStr, allDay),
              allDay,
              location:      ev.location,
              description:   ev.description,
              htmlLink:      ev.htmlLink,
              colorId:       ev.colorId,
              hangoutLink:   ev.hangoutLink,
              conferenceData: ev.conferenceData,
              calendar:      cal.summary,
              calendarId:    cal.id,
              account:       tok.email,
              isToday:       startKey === todayKey,
              isTomorrow:    startKey === tomorrowKey,
              isPast:        startD < now && !allDay,
              status:        ev.status,
              organizer:     ev.organizer?.email,
              attendeeCount: ev.attendees?.length ?? 0,
              attendeeEmails: (ev.attendees ?? []).map(a => a.email).filter((e): e is string => Boolean(e)),
            })
          }
        } catch { /* skip calendar on error */ }
      }))
    } catch { /* skip account on error */ }
  }))

  const seen = new Set<string>()
  const result = allEvents
    .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  eventsCache.set(daysAhead, { events: result, expiresAt: Date.now() + EVENTS_CACHE_TTL_MS })
  return result
}

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const all = await getUpcomingEvents(2)
  return all.filter(e => e.isToday)
}

export async function getWeekEvents(): Promise<CalendarEvent[]> {
  return getUpcomingEvents(7)
}
