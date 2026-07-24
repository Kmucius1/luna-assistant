/**
 * LUNA Astrology Engine
 * Real-time planetary calculations via astronomy-engine, which uses the
 * same VSOP87/ELP2000 ephemeris algorithm family Swiss Ephemeris is built
 * on — the astronomical facts here are scientifically grounded. What Luna
 * does with those facts (sign/aspect meanings, guidance) is traditional
 * symbolic interpretation, not a scientific claim.
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

// Short body-feel phrases per sign, used by fallback-text generators (works
// with zero AI credits). Shared by daily-guidance's buildFallback() and the
// new readingGenerator's buildReadingFallback() — one dictionary, not two.
export const SIGN_ENERGY_DESCRIPTIONS: Record<ZodiacSign, string> = {
  Aries: 'bold forward-moving initiation energy',
  Taurus: 'slow, grounded, sensual steadiness',
  Gemini: 'quick mental and social energy',
  Cancer: 'emotional depth and tender inward feeling',
  Leo: 'radiant creative expression',
  Virgo: 'discerning helpful refinement',
  Libra: 'relational harmonizing beauty',
  Scorpio: 'intense transformative depth',
  Sagittarius: 'expansive adventurous fire',
  Capricorn: 'disciplined ambitious grounding',
  Aquarius: 'innovative detached electric awareness',
  Pisces: 'dreamy empathic intuition',
}

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

export function angleBetween(a: number, b: number): number {
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

// ─── Moon phase ───────────────────────────────────────────────
// Single source of truth for phase-boundary math — this exact logic used to
// be duplicated independently in api/astrology/moon/route.ts and
// readingGenerator.ts, which risked the two drifting apart on any future
// tweak. Both now import from here.

export type MoonPhaseInfo = { name: string; emoji: string; illumination: number; angle: number; description: string }

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

// Phase boundaries use 22.5° mid-points (not 45°) so e.g. 88° reads as First
// Quarter, not Waxing Crescent.
function getPhaseNameAndEmoji(angle: number): { name: string; emoji: string } {
  const a = ((angle % 360) + 360) % 360
  if (a < 22.5 || a >= 337.5) return { name: 'New Moon',        emoji: '🌑' }
  if (a < 67.5)                return { name: 'Waxing Crescent', emoji: '🌒' }
  if (a < 112.5)               return { name: 'First Quarter',   emoji: '🌓' }
  if (a < 157.5)               return { name: 'Waxing Gibbous',  emoji: '🌔' }
  if (a < 202.5)               return { name: 'Full Moon',       emoji: '🌕' }
  if (a < 247.5)               return { name: 'Waning Gibbous',  emoji: '🌖' }
  if (a < 292.5)               return { name: 'Last Quarter',    emoji: '🌗' }
  return                              { name: 'Waning Crescent', emoji: '🌘' }
}

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const rawAngle = Astronomy.MoonPhase(date)
  const angle = ((rawAngle % 360) + 360) % 360
  const { name, emoji } = getPhaseNameAndEmoji(angle)
  // Illumination: 0% at New Moon, 50% at Quarters, 100% at Full
  const illumination = Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100)
  return { name, emoji, illumination, angle: Math.round(angle), description: PHASE_DESCRIPTIONS[name] ?? '' }
}

export function getMoonSign(date: Date): { sign: ZodiacSign; degree: number; minutes: number; formatted: string; nextSignDate: Date | null } {
  const lon = getPlanetLongitude('Moon', date)
  const { sign, degree, minutes, formatted } = longitudeToSign(lon)
  const degInSign = lon % 30
  // Moon moves ~0.5498°/hour on average
  const hoursToNextSign = (30 - degInSign) / 0.5498
  const nextSignDate = hoursToNextSign < 48 ? new Date(date.getTime() + hoursToNextSign * 3600_000) : null
  return { sign, degree, minutes, formatted, nextSignDate }
}

// Finds the next exact New/First Quarter/Full/Last Quarter moment, only if
// within ~48 hours (an angular distance of ~26°, since the Moon moves ~0.5°/hr).
export function getNextExactMoonPhase(date: Date): { name: string; date: Date } | null {
  try {
    const currentAngle = ((Astronomy.MoonPhase(date) % 360) + 360) % 360
    const quarters = [0, 90, 180, 270]
    const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter']

    let nearestAngle = 0, nearestName = '', minDist = 360
    for (let i = 0; i < quarters.length; i++) {
      const dist = (quarters[i] - currentAngle + 360) % 360
      if (dist < minDist) { minDist = dist; nearestAngle = quarters[i]; nearestName = names[i] }
    }
    if (minDist > 26) return null

    const found = Astronomy.SearchMoonPhase(nearestAngle, date, 3)
    if (!found) return null
    return { name: nearestName, date: found.date }
  } catch {
    return null
  }
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

// ─── Houses (whole-sign system) ──────────────────────────────
// House 1 = the Rising sign; each subsequent sign in zodiacal order is the
// next house. Whole-sign is a real, legitimate, widely-used house system
// (predates Placidus by centuries) and is the honest choice here: computing
// quadrant systems (Placidus, Koch, etc.) correctly requires oblique-
// ascension/spherical-trig math that isn't implemented anywhere in this
// codebase — presenting invented Placidus cusps would risk showing wrong
// house placements, which the user has explicitly said never to do.
export function getWholeSignHouse(planetLon: number, risingLon: number): number {
  const planetSignIdx = Math.floor((((planetLon % 360) + 360) % 360) / 30)
  const risingSignIdx = Math.floor((((risingLon % 360) + 360) % 360) / 30)
  return ((planetSignIdx - risingSignIdx + 12) % 12) + 1
}

const HOUSE_THEMES: Record<number, string> = {
  1: 'Identity & first impressions',
  2: 'Money, values & self-worth',
  3: 'Communication & everyday mind',
  4: 'Home, roots & emotional foundation',
  5: 'Creativity, romance & self-expression',
  6: 'Work, health & daily routine',
  7: 'Partnership & one-to-one relationships',
  8: 'Intimacy, shared resources & transformation',
  9: 'Belief, travel & big-picture meaning',
  10: 'Career, legacy & public life',
  11: 'Community, friendship & future vision',
  12: 'Rest, release & the inner world',
}
export function houseTheme(house: number): string { return HOUSE_THEMES[house] ?? '' }

// Same birth instant used throughout lib/astrology.ts's natal comments —
// Nov 14 2000, 7:04 PM EST = Nov 15 2000 00:04 UTC.
export const ZOE_BIRTH_DATE = new Date('2000-11-15T00:04:00Z')

const RETROGRADE_CAPABLE = ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']

// ─── Full natal chart (real data + derived houses) ───────────
export type NatalPlacement = {
  point: string; sign: ZodiacSign; degree: number; minutes: number; lon: number
  house: number; houseTheme: string; notes?: string; retrograde: boolean
}

export function getFullNatalChart(): NatalPlacement[] {
  const risingLon = ZOE_NATAL.Rising?.lon ?? 0
  return Object.entries(ZOE_NATAL).map(([point, data]) => {
    const house = getWholeSignHouse(data.lon, risingLon)
    const retrograde = RETROGRADE_CAPABLE.includes(point) ? isRetrograde(point, ZOE_BIRTH_DATE) : false
    return { point, sign: data.sign, degree: data.degree, minutes: data.minutes, lon: data.lon, house, houseTheme: houseTheme(house), notes: data.notes, retrograde }
  })
}

// ─── Natal-to-natal aspects (for the chart wheel's aspect lines) ─────
export type NatalAspect = { a: string; b: string; type: string; orb: number; emoji: string }

const NATAL_ASPECT_POINTS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','NNode']

export function getNatalAspects(): NatalAspect[] {
  const aspects: NatalAspect[] = []
  for (let i = 0; i < NATAL_ASPECT_POINTS.length; i++) {
    for (let j = i + 1; j < NATAL_ASPECT_POINTS.length; j++) {
      const a = ZOE_NATAL[NATAL_ASPECT_POINTS[i]]
      const b = ZOE_NATAL[NATAL_ASPECT_POINTS[j]]
      if (!a || !b) continue
      const cfg = getAspect(a.lon, b.lon)
      if (!cfg) continue
      const orb = Math.abs(angleBetween(a.lon, b.lon) - cfg.angle)
      aspects.push({ a: NATAL_ASPECT_POINTS[i], b: NATAL_ASPECT_POINTS[j], type: cfg.name, orb: Math.round(orb * 10) / 10, emoji: cfg.emoji })
    }
  }
  return aspects.sort((x, y) => x.orb - y.orb)
}

// ─── Astrocartography (real line-of-position math) ──────────
// For each planet at the birth moment: the MC/IC lines are the meridians
// (constant longitude) where the planet was culminating/anti-culminating;
// the AC/DC lines are curves across latitude where the planet was rising/
// setting, from the real horizon-crossing formula
// cos(H) = -tan(dec)·tan(lat). This is genuine astronomical math, not a
// decorative overlay — same instrument (astronomy-engine) already used for
// the natal chart and transits, just applied to a different question
// (where on Earth, not when).

export type AstroLineType = 'MC' | 'IC' | 'AC' | 'DC'
export type AstroLine = { body: string; type: AstroLineType; points: Array<{ lat: number; lon: number }> }

function normalizeLon(lon: number): number {
  let l = lon % 360
  if (l > 180) l -= 360
  if (l < -180) l += 360
  return l
}

function getEquatorial(body: string, date: Date): { ra: number; dec: number } {
  const vec = Astronomy.GeoVector(body as Astronomy.Body, date, true)
  const equ = Astronomy.EquatorFromVector(vec)
  return { ra: equ.ra, dec: equ.dec }
}

const ASTROCARTOGRAPHY_BODIES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']

export function getAstrocartographyLines(birthDate: Date): AstroLine[] {
  const gstDeg = Astronomy.SiderealTime(birthDate) * 15
  const lines: AstroLine[] = []

  for (const body of ASTROCARTOGRAPHY_BODIES) {
    const { ra, dec } = getEquatorial(body, birthDate)
    const raDeg = ra * 15

    // MC/IC: vertical lines (every latitude, same longitude)
    const mcLon = normalizeLon(raDeg - gstDeg)
    const icLon = normalizeLon(mcLon + 180)
    lines.push({ body, type: 'MC', points: [{ lat: -60, lon: mcLon }, { lat: 60, lon: mcLon }] })
    lines.push({ body, type: 'IC', points: [{ lat: -60, lon: icLon }, { lat: 60, lon: icLon }] })

    // AC/DC: curves — sampled every 2° of latitude, skipping latitudes
    // where the planet never rises/sets (circumpolar for that declination).
    const acPoints: Array<{ lat: number; lon: number }> = []
    const dcPoints: Array<{ lat: number; lon: number }> = []
    for (let lat = -66; lat <= 66; lat += 2) {
      const x = -Math.tan((dec * Math.PI) / 180) * Math.tan((lat * Math.PI) / 180)
      if (Math.abs(x) > 1) continue
      const h0 = (Math.acos(x) * 180) / Math.PI
      acPoints.push({ lat, lon: normalizeLon(raDeg - h0 - gstDeg) })
      dcPoints.push({ lat, lon: normalizeLon(raDeg + h0 - gstDeg) })
    }
    if (acPoints.length) lines.push({ body, type: 'AC', points: acPoints })
    if (dcPoints.length) lines.push({ body, type: 'DC', points: dcPoints })
  }
  return lines
}

const LINE_THEMES: Record<string, Record<AstroLineType, string>> = {
  Sun:     { MC: 'visibility, recognition, and stepping into confidence', IC: 'a quieter sense of identity and inner grounding', AC: 'confidence and being seen clearly', DC: 'partnerships that reflect your identity back to you' },
  Moon:    { MC: 'public emotional life, caretaking, or a sense of home in your work', IC: 'emotional depth, home, and rest', AC: 'heightened emotional sensitivity and intuition', DC: 'emotionally significant relationships and connection' },
  Mercury: { MC: 'communication, writing, teaching, or business focus', IC: 'thinking, learning, and mental processing', AC: 'quick thinking, curiosity, and being talkative', DC: 'stimulating conversations and intellectual partnerships' },
  Venus:   { MC: 'creativity, beauty, and public appreciation of your aesthetic', IC: 'domestic harmony, comfort, and ease', AC: 'romance, charm, and aesthetic pleasure', DC: 'romantic partnership and attraction' },
  Mars:    { MC: 'ambition, drive, and career assertiveness', IC: 'restlessness or a need to stay physically active at home', AC: 'physical energy, assertiveness, and drive', DC: 'passionate or sometimes friction-prone partnerships' },
  Jupiter: { MC: 'expansion, opportunity, and public growth', IC: 'a sense of abundance and philosophical ease at home', AC: 'optimism, growth, and good fortune', DC: 'expansive, generous partnerships and lucky connections' },
  Saturn:  { MC: 'discipline, structure, and long-term achievement (often earned slowly)', IC: 'a need for structure and responsibility at home', AC: 'seriousness, discipline, and feeling more reserved', DC: 'committed, structured, or sometimes weighty partnerships' },
  Uranus:  { MC: 'unconventional career paths and sudden change', IC: 'disruption to home life or a need for independence', AC: 'feeling different, independent, or unpredictable', DC: 'unconventional or unexpected relationships' },
  Neptune: { MC: 'creative, spiritual, or idealistic public life (can also blur direction)', IC: 'spiritual sensitivity or emotional fog at home', AC: 'heightened intuition, imagination, or dreaminess', DC: 'idealized or sometimes unclear partnerships' },
  Pluto:   { MC: 'intensity, transformation, and power dynamics in career', IC: 'deep emotional transformation tied to home/roots', AC: 'intensity and a magnetic, transformative presence', DC: 'deep, transformative, sometimes intense partnerships' },
}

export function describeAstroLine(body: string, type: AstroLineType): string {
  const theme = LINE_THEMES[body]?.[type] ?? 'a noticeable shift in energy'
  return `This location may emphasize ${theme}.`
}

// Finds which lines pass within `orbDeg` of a given point — MC/IC use pure
// longitude distance; AC/DC interpolate the line's longitude at that
// latitude from the sampled points.
export function findNearbyAstroLines(lines: AstroLine[], lat: number, lon: number, orbDeg = 3): Array<{ body: string; type: AstroLineType; distanceDeg: number }> {
  const results: Array<{ body: string; type: AstroLineType; distanceDeg: number }> = []
  for (const line of lines) {
    if (line.type === 'MC' || line.type === 'IC') {
      const dist = Math.abs(normalizeLon(lon - line.points[0].lon))
      if (dist <= orbDeg) results.push({ body: line.body, type: line.type, distanceDeg: Math.round(dist * 10) / 10 })
    } else {
      let closest = line.points[0]
      let minLatDiff = Math.abs(lat - closest.lat)
      for (const p of line.points) {
        const d = Math.abs(lat - p.lat)
        if (d < minLatDiff) { minLatDiff = d; closest = p }
      }
      if (minLatDiff <= 2) {
        const dist = Math.abs(normalizeLon(lon - closest.lon))
        if (dist <= orbDeg) results.push({ body: line.body, type: line.type, distanceDeg: Math.round(dist * 10) / 10 })
      }
    }
  }
  return results.sort((a, b) => a.distanceDeg - b.distanceDeg)
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
