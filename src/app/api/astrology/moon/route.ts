import { NextRequest, NextResponse } from 'next/server'
import * as Astronomy from 'astronomy-engine'

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

const SIGN_EMOJIS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
}

const SIGN_KEYWORDS: Record<string, string> = {
  Aries: 'Initiation, boldness, energy',
  Taurus: 'Grounding, pleasure, stability',
  Gemini: 'Communication, curiosity, movement',
  Cancer: 'Emotion, nurturing, home, memory',
  Leo: 'Creativity, confidence, visibility',
  Virgo: 'Clarity, service, refinement, detail',
  Libra: 'Balance, beauty, relationships, peace',
  Scorpio: 'Depth, transformation, truth, power',
  Sagittarius: 'Expansion, truth, freedom, vision',
  Capricorn: 'Ambition, structure, mastery, time',
  Aquarius: 'Innovation, community, liberation',
  Pisces: 'Intuition, compassion, dissolution, dreams'
}

// ─── Phase boundaries use 22.5° mid-points (not 45°) ─────────
// This ensures e.g. 88° = First Quarter, not Waxing Crescent
function getPhaseInfo(angle: number): { name: string; emoji: string } {
  const a = ((angle % 360) + 360) % 360
  if (a < 22.5 || a >= 337.5)  return { name: 'New Moon',         emoji: '🌑' }
  if (a < 67.5)                 return { name: 'Waxing Crescent',  emoji: '🌒' }
  if (a < 112.5)                return { name: 'First Quarter',    emoji: '🌓' }
  if (a < 157.5)                return { name: 'Waxing Gibbous',   emoji: '🌔' }
  if (a < 202.5)                return { name: 'Full Moon',        emoji: '🌕' }
  if (a < 247.5)                return { name: 'Waning Gibbous',   emoji: '🌖' }
  if (a < 292.5)                return { name: 'Last Quarter',     emoji: '🌗' }
  return                               { name: 'Waning Crescent',  emoji: '🌘' }
}

const PHASE_DESCRIPTIONS: Record<string, string> = {
  'New Moon':        'New beginnings. Plant the seed. Set intentions.',
  'Waxing Crescent': 'Take the first steps. Trust the spark.',
  'First Quarter':   'Push through resistance. Decide and act.',
  'Waxing Gibbous':  'Refine your work. Almost there. Trust the process.',
  'Full Moon':       'Release, celebrate, and see clearly. Emotions are louder.',
  'Waning Gibbous':  'Share your gifts. Gratitude season.',
  'Last Quarter':    'Let go of what is not working. Clear your space.',
  'Waning Crescent': 'Rest, reflect, and restore. The cycle ends here.',
}

function getMoonZodiacSign(date: Date): { sign: string; degree: number; minutes: number; nextSignDate: Date | null } {
  const ecliptic = Astronomy.EclipticGeoMoon(date)
  const longitude = ((ecliptic.lon % 360) + 360) % 360
  const signIndex = Math.floor(longitude / 30)
  const degreeInSign = longitude % 30
  const degree = Math.floor(degreeInSign)
  const minutes = Math.floor((degreeInSign - degree) * 60)

  // Moon moves ~0.5498°/hour on average
  const degreesToNextSign = 30 - degreeInSign
  const hoursToNextSign = degreesToNextSign / 0.5498
  const nextSignDate = new Date(date.getTime() + hoursToNextSign * 3600 * 1000)

  return {
    sign: ZODIAC_SIGNS[signIndex] ?? 'Unknown',
    degree,
    minutes,
    // Only include next ingress if within 48 hours
    nextSignDate: hoursToNextSign < 48 ? nextSignDate : null,
  }
}

// ─── Find next exact phase event (New/Quarter/Full) ──────────
function getNextExactPhase(date: Date, tz: string): { name: string; time: string } | null {
  try {
    const currentAngle = ((Astronomy.MoonPhase(date) % 360) + 360) % 360
    // Quarter angles: 0 (New), 90 (First Q), 180 (Full), 270 (Last Q)
    const quarters = [0, 90, 180, 270]
    const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter']

    let nearestAngle = 0
    let nearestName = ''
    let minDist = 360
    for (let i = 0; i < quarters.length; i++) {
      const dist = (quarters[i] - currentAngle + 360) % 360
      if (dist < minDist) { minDist = dist; nearestAngle = quarters[i]; nearestName = names[i] }
    }

    // Only report if within 48 hours (angular distance < ~26°, moon moves ~0.5°/hr)
    if (minDist > 26) return null

    // Search forward up to 3 days for the exact angle
    const found = Astronomy.SearchMoonPhase(nearestAngle, date, 3)
    if (!found) return null

    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric', minute: '2-digit', hour12: true,
      month: 'short', day: 'numeric',
    })
    return { name: nearestName, time: fmt.format(found.date) }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const tz = url.searchParams.get('tz') || 'America/New_York'

    // Always use current real time
    const now = new Date()

    // ── Moon phase (geocentric — same everywhere on Earth) ────
    const rawAngle = Astronomy.MoonPhase(now)
    const angle = ((rawAngle % 360) + 360) % 360
    const { name: phaseName, emoji: phaseEmoji } = getPhaseInfo(angle)
    // Illumination: 0% at New Moon, 50% at Quarters, 100% at Full
    const illumination = Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100)

    // ── Moon sign ─────────────────────────────────────────────
    const moonSign = getMoonZodiacSign(now)
    const sign = moonSign.sign

    // ── Next ingress (sign change) ────────────────────────────
    let nextSignIngress: string | null = null
    if (moonSign.nextSignDate) {
      const nextSignInfo = getMoonZodiacSign(moonSign.nextSignDate)
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric', minute: '2-digit', hour12: true,
        month: 'short', day: 'numeric',
      })
      nextSignIngress = `Enters ${nextSignInfo.sign} at ${fmt.format(moonSign.nextSignDate)}`
    }

    // ── Next exact phase event ────────────────────────────────
    const nextExactPhase = getNextExactPhase(now, tz)

    return NextResponse.json({
      // Lunar phase — how lit the moon is (same worldwide)
      phase: {
        name: phaseName,
        emoji: phaseEmoji,
        illumination,
        angle: Math.round(angle),
        description: PHASE_DESCRIPTIONS[phaseName] ?? '',
        // When the next exact phase moment hits (e.g. "First Quarter at 5:55 PM, Jun 21")
        next_exact: nextExactPhase,
      },
      // Moon zodiac sign — which sign the moon is in right now
      sign: {
        name: sign,
        emoji: SIGN_EMOJIS[sign] ?? '🌙',
        degree: moonSign.degree,
        minutes: moonSign.minutes,
        formatted: `${moonSign.degree}°${String(moonSign.minutes).padStart(2, '0')}' ${sign}`,
        keywords: SIGN_KEYWORDS[sign] ?? '',
      },
      // If sign change is within 48h, show when
      next_ingress: nextSignIngress,
      source: 'astronomy-engine (Swiss Ephemeris compatible)',
      timezone: tz,
      calculated_at: now.toISOString(),
    })

  } catch (err) {
    console.error('Moon calculation error:', err)
    return NextResponse.json({ error: 'Calculation error' }, { status: 500 })
  }
}
