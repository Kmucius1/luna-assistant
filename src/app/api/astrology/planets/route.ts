import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPlanets, getRetrogradePlanets, getUpcomingEclipses, getUpcomingMoonPhases, getNextStation } from '@/lib/astrology'

export async function GET(req: NextRequest) {
  try {
    const tz = new URL(req.url).searchParams.get('tz') || 'America/New_York'
    const now = new Date()

    const planets = getCurrentPlanets(now)
    const retrogrades = getRetrogradePlanets(now)
    const eclipses = getUpcomingEclipses(now)

    // Format dates in user's timezone
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })

    // One merged, chronological list for the "Upcoming Cosmic Dates" box — exact
    // Moon phases, eclipses (with zodiac placement) and Mercury's next station.
    const upcoming: Array<{ kind: 'moon' | 'eclipse' | 'station'; title: string; detail: string; date: string; dateFormatted: string }> = [
      ...getUpcomingMoonPhases(now, 4).map(p => ({ kind: 'moon' as const, title: p.name, detail: '', date: p.date })),
      ...eclipses.map(e => ({ kind: 'eclipse' as const, title: e.type, detail: e.placement, date: e.date })),
    ].map(e => ({ ...e, date: e.date.toISOString(), dateFormatted: fmt.format(new Date(e.date)) }))
    const merc = getNextStation('Mercury', now)
    if (merc) upcoming.push({
      kind: 'station',
      title: merc.type === 'retrograde' ? 'Mercury turns retrograde' : 'Mercury turns direct',
      detail: merc.placement, date: merc.date.toISOString(), dateFormatted: fmt.format(merc.date),
    })
    upcoming.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      upcoming: upcoming.slice(0, 7),
      planets,
      retrogrades: retrogrades.map(p => p.name),
      eclipses: eclipses.map(e => ({
        ...e,
        dateFormatted: fmt.format(e.date),
        date: e.date.toISOString(),
      })),
      calculated_at: now.toISOString(),
      timezone: tz,
    })
  } catch (err) {
    console.error('planets route error:', err)
    return NextResponse.json({ error: 'Calculation error' }, { status: 500 })
  }
}
