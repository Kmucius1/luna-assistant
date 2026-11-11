// The week, calculated. Everything here comes from real planet positions: which
// weekday and date each day is, where the Moon is, and which transits are active
// against Zoe's chart. The weekly forecast and its day tabs are built from this,
// so the days and the sky can never disagree with the written readings.

import {
  getCurrentPlanets, getMoonPhase, getTransitsToNatal, isRetrograde, plainAspectPhrase,
  SIGN_ENERGY_DESCRIPTIONS, type ZodiacSign,
} from '@/lib/astrology'

export interface SkyTransit {
  text: string            // "Mars is in a tense match with your Moon"
  meaning: string         // the plain-words interpretation
  kind: 'supportive' | 'tense' | 'neutral'
  strength: 'very strong' | 'strong' | 'subtle'
  transiting: string
  natal: string
}

export interface SkyDay {
  iso: string
  weekday: string          // "Friday"
  dateLabel: string        // "October 16"
  isToday: boolean
  moon: { sign: string; degree: number; phase: string; illumination: number; feel: string; changesSign: boolean }
  venus: { sign: string; retrograde: boolean }
  mars: { sign: string; retrograde: boolean }
  mercuryRetrograde: boolean
  intensity: number        // 1-10, how loaded the day is
  transits: SkyTransit[]
}

const TZ = 'America/New_York'
const SOFT = ['trine', 'sextile']
const HARD = ['square', 'opposition']

export function isoToday(tz: string = TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10)
}

export function buildWeekSky(startIso: string = isoToday(), count = 7): SkyDay[] {
  const today = isoToday()
  const days: SkyDay[] = []
  let prevMoonSign = ''
  for (let i = -1; i < count; i++) {
    const iso = addDays(startIso, i)
    const at = new Date(`${iso}T16:00:00Z`) // midday Eastern
    const planets = getCurrentPlanets(at)
    const moon = planets.find(p => p.name === 'Moon')!
    if (i === -1) { prevMoonSign = moon.sign; continue }

    const phase = getMoonPhase(at)
    const transits = getTransitsToNatal(at).slice(0, 4).map<SkyTransit>(t => ({
      text: `${t.transiting} is ${plainAspectPhrase(t.type)} your ${t.natal === 'NNode' ? 'North Node' : t.natal}`,
      meaning: t.interpretation,
      kind: SOFT.includes(t.type) ? 'supportive' : HARD.includes(t.type) ? 'tense' : 'neutral',
      strength: t.orb < 1.5 ? 'very strong' : t.orb < 3.5 ? 'strong' : 'subtle',
      transiting: t.transiting,
      natal: t.natal,
    }))

    const retro = isRetrograde('Mercury', at)
    let intensity = 0
    for (const t of transits) {
      const w = t.strength === 'very strong' ? 1.4 : t.strength === 'strong' ? 1 : 0.5
      if (t.kind === 'tense') intensity += 2 * w
      else if (t.kind === 'neutral') intensity += 1 * w
      else intensity += 0.4 * w
    }
    if (retro) intensity += 1
    if (moon.sign !== prevMoonSign) intensity += 0.5

    const venus = planets.find(p => p.name === 'Venus')!
    const mars = planets.find(p => p.name === 'Mars')!
    const dt = new Date(`${iso}T12:00:00Z`)
    days.push({
      iso,
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(dt),
      dateLabel: new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(dt),
      isToday: iso === today,
      moon: {
        sign: moon.sign, degree: moon.degree, phase: phase.name, illumination: phase.illumination,
        feel: SIGN_ENERGY_DESCRIPTIONS[moon.sign as ZodiacSign] ?? '',
        changesSign: moon.sign !== prevMoonSign,
      },
      venus: { sign: venus.sign, retrograde: venus.retrograde },
      mars: { sign: mars.sign, retrograde: mars.retrograde },
      mercuryRetrograde: retro,
      intensity,   // raw; scaled across the week below
      transits,
    })
    prevMoonSign = moon.sign
  }

  // Show intensity relative to the rest of the week, so heavier days read as heavier.
  const raw = days.map(d => d.intensity)
  const lo = Math.min(...raw), hi = Math.max(...raw)
  for (const d of days) d.intensity = hi - lo < 0.01 ? 5 : Math.round(3 + (6 * (d.intensity - lo)) / (hi - lo))
  return days
}


// Best/rest/love/power days, computed from the real transits (never from the AI), and
// only among days that are today or later: a day that has already passed is never "best".
export function pickWeekWindows(sky: SkyDay[]): { best_day: string; rest_day: string; love_window: string; power_window: string } {
  const up = sky.filter(d => d.isToday || d.iso > (sky.find(x => x.isToday)?.iso ?? ''))
  const days = up.length ? up : sky
  const w = (t: SkyTransit) => (t.strength === 'very strong' ? 1.4 : t.strength === 'strong' ? 1 : 0.5)
  const val = (t: SkyTransit) => (t.kind === 'supportive' ? 1 : t.kind === 'tense' ? -1.5 : 0) * w(t)
  const score = (d: SkyDay, natal?: string[]) => d.transits.filter(t => !natal || natal.includes(t.natal)).reduce((n, t) => n + val(t), 0)
  const top = (fn: (d: SkyDay) => number, dir: 1 | -1 = 1) =>
    days.reduce((a, b) => (dir * fn(b) > dir * fn(a) ? b : a)).weekday
  return {
    best_day: top(d => score(d) - d.intensity * 0.15),
    rest_day: top(d => d.intensity, 1),
    love_window: top(d => score(d, ['Venus', 'Moon', 'Mars', 'Sun', 'NNode'])),
    power_window: top(d => score(d, ['Sun', 'Saturn', 'Midheaven', 'Jupiter', 'Mars'])),
  }
}
