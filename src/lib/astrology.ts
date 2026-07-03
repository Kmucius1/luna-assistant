/**
 * LUNA Astrology Engine
 * Real-time calculations via astronomy-engine (Swiss Ephemeris compatible).
 * Natal positions from Zoe's confirmed birth chart (Nov 14 2000, 7:04 PM, Sellersville PA).
 */
import * as Astronomy from 'astronomy-engine'
import signsData from '@/data/astrology/signs.json'
import planetsData from '@/data/astrology/planets.json'
import natalZoeData from '@/data/astrology/natal-zoe.json'
import moonRitualsData from '@/data/astrology/moon-rituals.json'
import crystalsData from '@/data/crystals/crystals.json'

// ─── Types ───────────────────────────────────────────────────
export const ZODIAC_SIGNS = signsData.ZODIAC_SIGNS as unknown as readonly [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]
export type ZodiacSign = typeof ZODIAC_SIGNS[number]

export type PlanetPosition = {
  name:       string
  lon:        number
  sign:       ZodiacSign
  degree:     number
  minutes:    number
  formatted:  string   // e.g. "22°55' Scorpio"
  retrograde: boolean
  emoji:      string
}

export type Aspect = {
  transiting: string
  natal:      string
  type:       string   // 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
  angle:      number   // actual angle between them
  orb:        number   // degrees off exact
  applying:   boolean
  energy:     string   // keyword
  emoji:      string
}

// ─── Constants ───────────────────────────────────────────────
export const SIGN_EMOJIS = signsData.SIGN_EMOJIS as Record<ZodiacSign, string>
export const SIGN_KEYWORDS = signsData.SIGN_KEYWORDS as Record<ZodiacSign, string>
export const PLANET_EMOJIS = planetsData.PLANET_EMOJIS as Record<string, string>
export const PLANET_KEYWORDS = planetsData.PLANET_KEYWORDS as Record<string, string>

const ASPECT_CONFIG = [
  { name: 'conjunction', angle: 0,   orb: 8,  emoji: '☌', energy: 'intense fusion — both energies merge completely' },
  { name: 'sextile',     angle: 60,  orb: 4,  emoji: '⚹', energy: 'flowing opportunity — easy support and cooperation' },
  { name: 'square',      angle: 90,  orb: 8,  emoji: '□', energy: 'friction and growth — challenge creating action' },
  { name: 'trine',       angle: 120, orb: 8,  emoji: '△', energy: 'natural gift — effortless flow and harmony' },
  { name: 'opposition',  angle: 180, orb: 8,  emoji: '☍', energy: 'tension and awareness — polarities seeking balance' },
]

// ─── Core calculation utilities ───────────────────────────────

export function longitudeToSign(lon: number): { sign: ZodiacSign; degree: number; minutes: number; formatted: string } {
  const normalized = ((lon % 360) + 360) % 360
  const idx = Math.floor(normalized / 30)
  const degInSign = normalized - idx * 30
  const degree = Math.floor(degInSign)
  const minutes = Math.floor((degInSign - degree) * 60)
  const sign = ZODIAC_SIGNS[idx] ?? 'Aries'
  return { sign, degree, minutes, formatted: `${degree}°${String(minutes).padStart(2,'0')}' ${sign}` }
}

export function getPlanetLongitude(name: string, date: Date): number {
  if (name === 'Sun') {
    return ((Astronomy.SunPosition(date).elon % 360) + 360) % 360
  }
  if (name === 'Moon') {
    return ((Astronomy.EclipticGeoMoon(date).lon % 360) + 360) % 360
  }
  const body = name as Astronomy.Body
  const vec = Astronomy.GeoVector(body, date, true)
  return ((Astronomy.Ecliptic(vec).elon % 360) + 360) % 360
}

export function isRetrograde(name: string, date: Date): boolean {
  if (name === 'Sun' || name === 'Moon') return false
  const d1 = new Date(date.getTime() - 12 * 3600_000)
  const d2 = new Date(date.getTime() + 12 * 3600_000)
  let diff = getPlanetLongitude(name, d2) - getPlanetLongitude(name, d1)
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff < 0
}

function angleBetween(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360
  if (diff > 180) diff = 360 - diff
  return diff
}

export function getAspect(a: number, b: number): typeof ASPECT_CONFIG[number] | null {
  const angle = angleBetween(a, b)
  for (const cfg of ASPECT_CONFIG) {
    if (Math.abs(angle - cfg.angle) <= cfg.orb) return cfg
  }
  return null
}

// ─── Current sky ─────────────────────────────────────────────

const PLANET_NAMES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']

export function getCurrentPlanets(date: Date): PlanetPosition[] {
  return PLANET_NAMES.map(name => {
    const lon = getPlanetLongitude(name, date)
    const { sign, degree, minutes, formatted } = longitudeToSign(lon)
    const retrograde = isRetrograde(name, date)
    return { name, lon, sign, degree, minutes, formatted, retrograde, emoji: PLANET_EMOJIS[name] ?? '●' }
  })
}

export function getRetrogradePlanets(date: Date): PlanetPosition[] {
  return getCurrentPlanets(date).filter(p => p.retrograde)
}

// ─── Zoe's natal chart ───────────────────────────────────────
// Born: November 14 2000, 7:04 PM EST (= UTC+0 00:04 Nov 15)
// Place: Sellersville PA (40.3382°N, 75.3077°W)
// Signs confirmed by Zoe. Computed degrees via astronomy-engine.
// Note: Venus computed at 272° (0°Capricorn cusp) — Zoe's chart confirms Sagittarius.
// This is a known cusp position; natal placements here use Zoe's stated signs.

export const ZOE_NATAL = natalZoeData as unknown as Record<string, { sign: ZodiacSign; degree: number; minutes: number; lon: number; notes?: string }>

// ─── Transit-to-Natal aspects ────────────────────────────────

export type TransitAspect = Aspect & {
  natalSign:      ZodiacSign
  natalDegree:    number
  transitSign:    ZodiacSign
  transitDegree:  number
  interpretation: string
}

const TRANSIT_MEANINGS: Record<string, Record<string, string>> = {
  conjunction: {
    'Moon-Sun':      'Emotional needs and core identity aligned. Powerful self-expression day.',
    'Moon-Moon':     'Emotional clarity moment. Your feelings make total sense right now.',
    'Moon-Mercury':  'Thoughts and feelings in sync. Trust what you say in this window.',
    'Moon-Venus':    'Beauty, love, and pleasure are heightened. Creative or relational energy.',
    'Moon-Mars':     'Emotional drive is strong. Move the body. Act on what you feel.',
    'Moon-Saturn':   'Emotional seriousness. A boundary wants to be set or honored.',
    'Moon-NNode':    'A moment that feels fated. Emotional alignment with your soul path.',
    'Sun-Sun':       'Solar return window. The year turns. Set one big intention.',
    'Mars-Mercury':  'Direct communication energy. Say what you mean — clearly.',
    'Saturn-Sun':    'Discipline meets identity. A major lesson or responsibility arrives.',
  },
  square: {
    'Moon-Sun':      'Inner tension between what you feel and what you want. Pause before acting.',
    'Moon-Mercury':  'Mind and heart out of sync. Dictate before deciding.',
    'Moon-Saturn':   'Emotional heaviness or restriction. Your Cancer Moon needs safety first.',
    'Mars-Venus':    'Tension between what you want and what you love. Check impulse reactions.',
    'Saturn-Moon':   'Feeling burdened or emotionally flat. Rest is not failure — it is wisdom.',
  },
  trine: {
    'Moon-Venus':    'Soft and beautiful energy. Creative work, style, or pleasure flows naturally.',
    'Moon-Moon':     'Emotional ease and clarity. You know exactly what you feel.',
    'Sun-Jupiter':   'Expansion and confidence. A great day for visibility or outreach.',
    'Jupiter-NNode': 'Soul growth accelerated. Say yes to what genuinely excites you.',
    'Venus-Venus':   'Grace, attraction, and self-love. Something beautiful is available today.',
  },
  sextile: {
    'Moon-Mercury':  'Intuition and communication flowing together. Voice something important.',
    'Mercury-Venus': 'Beautiful words and ideas. Write, speak, create, connect.',
    'Sun-Moon':      'Inner and outer self in easy cooperation. A grounded, centered day.',
  },
  opposition: {
    'Moon-Saturn':   'You vs. structure or expectation. Something wants resolution.',
    'Sun-Moon':      'Full moon energy — what began six months ago reaches a turning point.',
    'Mars-Mars':     'Energy conflict. Do not force anything today — let the tension pass.',
  },
}

function getTransitInterpretation(aspect: string, transiting: string, natal: string): string {
  const key1 = `${transiting}-${natal}`
  const key2 = `${natal}-${transiting}`
  return TRANSIT_MEANINGS[aspect]?.[key1]
      || TRANSIT_MEANINGS[aspect]?.[key2]
      || `${transiting} is making a ${aspect} to the place in your chart where ${natal} lives. Pay attention to what comes up today around ${PLANET_KEYWORDS[natal] ?? natal.toLowerCase()}.`
}

export function getTransitsToNatal(date: Date): TransitAspect[] {
  const currentPlanets = getCurrentPlanets(date)
  const aspects: TransitAspect[] = []

  // Only transit fast + personal planets against major natal points
  const transitingPlanets = ['Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn']
  const natalPoints = ['Sun','Moon','Mercury','Venus','Mars','Saturn','NNode','Midheaven','Rising']

  for (const tp of currentPlanets.filter(p => transitingPlanets.includes(p.name))) {
    for (const np of natalPoints) {
      const natal = ZOE_NATAL[np]
      if (!natal) continue
      const aspCfg = getAspect(tp.lon, natal.lon)
      if (!aspCfg) continue

      const orb = Math.abs(angleBetween(tp.lon, natal.lon) - aspCfg.angle)
      // Applying = transit moving toward exact
      const futLon = getPlanetLongitude(tp.name, new Date(date.getTime() + 3600_000))
      const futOrb = Math.abs(angleBetween(futLon, natal.lon) - aspCfg.angle)
      const applying = futOrb < orb

      aspects.push({
        transiting:      tp.name,
        natal:           np,
        type:            aspCfg.name,
        angle:           aspCfg.angle,
        orb:             Math.round(orb * 10) / 10,
        applying,
        energy:          aspCfg.energy,
        emoji:           aspCfg.emoji,
        natalSign:       natal.sign,
        natalDegree:     natal.degree,
        transitSign:     tp.sign,
        transitDegree:   tp.degree,
        interpretation:  getTransitInterpretation(aspCfg.name, tp.name, np),
      })
    }
  }

  // Sort by orb (tightest first)
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 12)
}

// ─── Upcoming eclipses ────────────────────────────────────────
export function getUpcomingEclipses(date: Date): Array<{ type: string; date: Date; description: string }> {
  const eclipses: Array<{ type: string; date: Date; description: string }> = []
  try {
    const lunar = Astronomy.SearchLunarEclipse(date)
    eclipses.push({
      type: `Lunar Eclipse (${lunar.kind})`,
      date: lunar.peak.date,
      description: 'Eclipses accelerate what needs to change. Release, closure, and sudden clarity.',
    })
    const solar = Astronomy.SearchGlobalSolarEclipse(date)
    eclipses.push({
      type: `Solar Eclipse`,
      date: solar.peak.date,
      description: 'New chapter begins. What seeds are you planting in the dark?',
    })
  } catch {
    // Eclipse search can fail near certain dates — return empty gracefully
  }
  return eclipses.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// ─── Moon rituals data ────────────────────────────────────────
export function getMoonRitualContext(phase: string, sign: ZodiacSign): {
  intention: string; ritual: string[]; release: string[]; avoid: string
} {
  const isNew = phase.includes('New')
  const intentions = moonRitualsData.intentions as Record<ZodiacSign, string>
  const rituals = moonRitualsData.rituals as Record<ZodiacSign, string[]>
  const releases = moonRitualsData.releases as Record<ZodiacSign, string[]>

  return {
    intention: intentions[sign] ?? 'clarity, growth, and alignment',
    ritual: rituals[sign] ?? [],
    release: isNew ? [] : (releases[sign] ?? []),
    avoid: isNew ? 'starting new things that are emotionally draining' : 'forcing things that naturally want to end',
  }
}

// ─── Crystal recommendations ─────────────────────────────────
// Full merged crystal library (src/data/crystals/crystals.json) — richer shape
// than this function needs, but same signs/phases/moods filter fields.
const CRYSTAL_DB = crystalsData as Array<{
  name: string; signs: string[]; phases: string[]; moods: string[]; properties: string; color: string
}>

export function getCrystalRecommendations(moonSign: ZodiacSign, phase: string, mood: string = 'unclear'): typeof CRYSTAL_DB {
  return CRYSTAL_DB.filter(c =>
    (c.signs.includes(moonSign) || c.signs.includes('all')) ||
    (c.phases.some(p => phase.includes(p)) || c.phases.includes('all')) ||
    c.moods.includes(mood) || c.moods.includes('all')
  ).slice(0, 4)
}
