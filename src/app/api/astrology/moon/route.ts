import { NextRequest, NextResponse } from 'next/server'
import { getMoonPhase, getMoonSign, getNextExactMoonPhase, SIGN_EMOJIS, SIGN_KEYWORDS } from '@/lib/astrology'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const tz = url.searchParams.get('tz') || 'America/New_York'
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })

    // Always use current real time
    const now = new Date()

    const phase = getMoonPhase(now)
    const moonSign = getMoonSign(now)
    const nextExact = getNextExactMoonPhase(now)

    let nextSignIngress: string | null = null
    if (moonSign.nextSignDate) {
      const nextSignInfo = getMoonSign(moonSign.nextSignDate)
      nextSignIngress = `Enters ${nextSignInfo.sign} at ${fmt.format(moonSign.nextSignDate)}`
    }

    return NextResponse.json({
      // Lunar phase — how lit the moon is (same worldwide)
      phase: {
        name: phase.name,
        emoji: phase.emoji,
        illumination: phase.illumination,
        angle: phase.angle,
        description: phase.description,
        // When the next exact phase moment hits (e.g. "First Quarter at 5:55 PM, Jun 21")
        next_exact: nextExact ? { name: nextExact.name, time: fmt.format(nextExact.date) } : null,
      },
      // Moon zodiac sign — which sign the moon is in right now
      sign: {
        name: moonSign.sign,
        emoji: SIGN_EMOJIS[moonSign.sign] ?? '🌙',
        degree: moonSign.degree,
        minutes: moonSign.minutes,
        formatted: moonSign.formatted,
        keywords: SIGN_KEYWORDS[moonSign.sign] ?? '',
      },
      // If sign change is within 48h, show when
      next_ingress: nextSignIngress,
      source: 'astronomy-engine (Swiss Ephemeris compatible)',
      timezone: tz,
      calculated_at: now.toISOString(),
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })

  } catch (err) {
    console.error('Moon calculation error:', err)
    return NextResponse.json({ error: 'Calculation error' }, { status: 500 })
  }
}
