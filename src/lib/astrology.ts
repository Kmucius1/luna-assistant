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

// Human-readable labels for points that aren't plain planet names — used so
// generic transit sentences never print an internal code like "NNode" as if
// it were a planet.
const POINT_LABELS: Record<string, string> = {
  NNode: 'the part of your chart about where your growth is headed',
  Midheaven: 'the part of your chart about your career and reputation',
  Rising: 'your Rising sign',
  Chiron: 'your Chiron',
  Lilith: 'your Lilith',
}
function pointLabel(name: string): string {
  return POINT_LABELS[name] ?? name
}

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
    'Mercury-NNode': "A conversation, message, or idea today points you toward where you're headed. Pay attention to what you talk about or hear — it may carry more direction than it seems to on the surface.",
    'Sun-NNode':     'Your sense of self lines up with the direction you\'re growing toward. A good day to act like the person you\'re becoming.',
    'Venus-NNode':   'Someone or something you\'re drawn to today connects to your bigger path forward, not just a passing preference.',
    'Mars-NNode':    'The thing you feel driven to do today is worth following — it\'s pointed the right way, even if it feels new.',
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
    'Mercury-NNode': 'A conversation or decision today feels harder than expected because it\'s pulling you between an old habit and where you\'re actually headed. Notice the friction — it\'s showing you which one to choose.',
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

// Plain, non-jargon phrase for how two placements relate — used by every
// fallback (no-AI) template so a Groq rate-limit or outage never falls back
// to raw astrology-class words like "square" or "natal" in Zoe's face.
const PLAIN_ASPECT_PHRASE: Record<string, string> = {
  conjunction: 'lined up with',
  sextile: 'in an easy match with',
  square: 'in a tense match with',
  trine: 'in a supportive match with',
  opposition: 'pulling against',
}

export function plainAspectPhrase(type: string): string {
  return PLAIN_ASPECT_PHRASE[type] ?? 'connecting with'
}

function getTransitInterpretation(aspect: string, transiting: string, natal: string): string {
  const key1 = `${transiting}-${natal}`
  const key2 = `${natal}-${transiting}`
  return TRANSIT_MEANINGS[aspect]?.[key1]
      || TRANSIT_MEANINGS[aspect]?.[key2]
      || `${transiting} is lighting up ${pointLabel(natal)} today, through ${PLANET_KEYWORDS[natal] ?? natal.toLowerCase()}. Notice what comes up around that today — it's worth paying attention to.`
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
  // Exact sign-change moment from the ephemeris (not a constant-speed estimate —
  // the Moon's speed varies ~20%, which made this off by minutes to hours).
  // Only reported when it's within 48 hours, as before.
  const target = ((Math.floor(lon / 30) + 1) * 30) % 360
  const angleTo = (t: Astronomy.AstroTime) => ((getPlanetLongitude('Moon', t.date) - target + 540) % 360) - 180
  const found = Astronomy.Search(angleTo, Astronomy.MakeTime(date), Astronomy.MakeTime(new Date(date.getTime() + 3 * 86_400_000)), { dt_tolerance_seconds: 5 })
  const nextSignDate = found && found.date.getTime() - date.getTime() < 48 * 3600_000 ? found.date : null
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

// ─── Upcoming exact Moon phases ───────────────────────────────
// The next `count` New / First Quarter / Full / Last Quarter moments, exact to
// the minute. (getNextExactMoonPhase only reports one within ~48 hours.)
export function getUpcomingMoonPhases(date: Date, count = 4): Array<{ name: string; date: Date }> {
  const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter']
  const out: Array<{ name: string; date: Date }> = []
  try {
    let q = Astronomy.SearchMoonQuarter(date)
    for (let i = 0; i < count; i++) {
      out.push({ name: names[q.quarter], date: q.time.date })
      q = Astronomy.NextMoonQuarter(q)
    }
  } catch { /* return what we have */ }
  return out
}

// ─── Next retrograde / direct station ─────────────────────────
// Exact moment the planet next turns retrograde or direct. Scans in 6-hour
// steps, then bisects to the minute using the same isRetrograde() the rest of
// the app uses — so dates here can never disagree with the retrograde status.
export function getNextStation(
  name: string, date: Date, maxDays = 500,
): { type: 'retrograde' | 'direct'; date: Date; placement: string } | null {
  const STEP = 6 * 3600_000
  const start = date.getTime()
  const startState = isRetrograde(name, date)
  for (let ms = STEP; ms <= maxDays * 86_400_000; ms += STEP) {
    if (isRetrograde(name, new Date(start + ms)) === startState) continue
    let lo = start + ms - STEP, hi = start + ms
    while (hi - lo > 60_000) {
      const mid = Math.floor((lo + hi) / 2)
      if (isRetrograde(name, new Date(mid)) === startState) lo = mid; else hi = mid
    }
    const at = new Date(hi)
    return { type: startState ? 'direct' : 'retrograde', date: at, placement: longitudeToSign(getPlanetLongitude(name, at)).formatted }
  }
  return null
}

// ─── Upcoming eclipses ────────────────────────────────────────
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function getUpcomingEclipses(date: Date): Array<{ type: string; date: Date; description: string; placement: string }> {
  const eclipses: Array<{ type: string; date: Date; description: string; placement: string }> = []
  try {
    const lunar = Astronomy.SearchLunarEclipse(date)
    eclipses.push({
      type: `Lunar Eclipse (${cap(lunar.kind)})`,
      date: lunar.peak.date,
      // Where the eclipse falls in the zodiac at its peak — the Moon's position.
      placement: longitudeToSign(getPlanetLongitude('Moon', lunar.peak.date)).formatted,
      description: 'Eclipses accelerate what needs to change. Release, closure, and sudden clarity.',
    })
    const solar = Astronomy.SearchGlobalSolarEclipse(date)
    eclipses.push({
      type: `Solar Eclipse (${cap(solar.kind)})`,
      date: solar.peak.date,
      placement: longitudeToSign(getPlanetLongitude('Sun', solar.peak.date)).formatted,
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

// ─── Synastry (chart-to-chart) aspect meanings ────────────────
// Works for any two people, not just Zoe's fixed chart — so this is a topic +
// energy template rather than a specific lookup like the natal aspects above.
const SYNASTRY_PAIR_TOPICS: Record<string, string> = {
  'Sun-Sun': "whether your core personalities naturally get each other",
  'Moon-Sun': "the meeting point between one person's core identity and the other's emotional world",
  'Mercury-Sun': "the meeting point between one person's identity and the other's way of thinking and communicating",
  'Sun-Venus': "the meeting point between one person's identity and the other's love and values",
  'Mars-Sun': "the meeting point between one person's identity and the other's drive and desire",
  'Saturn-Sun': "the meeting point between one person's identity and the other's need for structure and responsibility",
  'Moon-Moon': "how naturally your emotional worlds understand each other",
  'Mercury-Moon': "the meeting point between one person's feelings and the other's way of thinking and talking things through",
  'Moon-Venus': "the meeting point between one person's emotional needs and the other's love and values",
  'Mars-Moon': "the meeting point between one person's emotional needs and the other's drive and how they assert themselves",
  'Moon-Saturn': "the meeting point between one person's emotional needs and the other's sense of responsibility and boundaries",
  'Mercury-Mercury': "how easily your minds understand and talk to each other",
  'Mercury-Venus': "the meeting point between one person's way of thinking and the other's values and sense of love",
  'Mars-Mercury': "the meeting point between one person's communication style and the other's drive and directness",
  'Mercury-Saturn': "the meeting point between one person's way of thinking and the other's need for structure and seriousness",
  'Venus-Venus': "how naturally your tastes, values, and way of loving line up",
  'Mars-Venus': "the chemistry and attraction between one person's love nature and the other's drive and desire",
  'Saturn-Venus': "the meeting point between one person's way of loving and the other's need for commitment and structure",
  'Mars-Mars': "how your drive, desire, and energy match up",
  'Mars-Saturn': "the meeting point between one person's drive and the other's need for structure and patience",
  'Saturn-Saturn': "how your sense of responsibility, commitment, and long-term thinking line up",
}

const SYNASTRY_ASPECT_ENERGY: Record<string, string> = {
  conjunction: 'intense and merged — you two amplify each other here, for better or worse',
  sextile: 'easy and cooperative — a natural, gentle opportunity between you',
  square: 'a little tense — real friction that can push you both to grow if you work with it instead of against it',
  trine: 'easy and supportive — this flows naturally between you with little effort',
  opposition: 'a pull in two directions — you balance each other here, which can feel like magnetism or like tug-of-war depending on the day',
}

export function getSynastryAspectMeaning(theirPoint: string, herPoint: string, type: string): string {
  const key = [theirPoint, herPoint].sort().join('-')
  const topic = SYNASTRY_PAIR_TOPICS[key] ?? `how ${theirPoint} and ${herPoint} interact between you two`
  const energy = SYNASTRY_ASPECT_ENERGY[type] ?? 'worth paying attention to'
  return `Their ${theirPoint} and your ${herPoint} touch on ${topic}. This connection feels ${energy}.`
}

// ─── Natal-to-natal aspects (for the chart wheel's aspect lines) ─────
export type NatalAspect = { a: string; b: string; type: string; orb: number; emoji: string; interpretation: string }

const NATAL_ASPECT_POINTS = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','Chiron','NNode']

// Specific, written interpretation for each of Zoe's actual natal aspects — her
// chart is fixed, so this is a bounded, real set (not a generic combinatorial
// table). Keyed 'A-B-type' in the order produced by getNatalAspects() below;
// getNatalAspectInterpretation() also tries the reverse point order.
const NATAL_ASPECT_MEANINGS: Record<string, string> = {
  'Mercury-Neptune-square': "Your sharp, investigative mind sometimes clashes with a pull toward dreamy or idealized thinking — you can talk yourself into believing what you want to be true, especially about people. The fix isn't losing your imagination, it's fact-checking it before you act on it.",
  'Moon-Mercury-trine': "Your feelings and your thinking are naturally in sync. When something feels off, you can usually find the words for it right away, and talking something through out loud actually settles your emotions instead of stirring them up more.",
  'Mars-Jupiter-trine': "Taking action and growing opportunity come easily together for you. When you commit to something, doors tend to open, and your instinct to act on a good idea rarely backfires.",
  'Moon-Mars-square': "There's a real tug-of-war between wanting harmony and needing to protect your feelings — you may swallow irritation to keep the peace until it builds up and comes out sideways. Naming what's bothering you early, calmly, saves you from that later blowup.",
  'Uranus-Chiron-sextile': "An old wound around freedom or belonging has an easy path to healing through doing things your own way. The more you let yourself be different instead of trying to fit in, the more that old hurt loses its grip.",
  'Mars-Neptune-trine': "Your drive and your imagination work well together. You're able to chase a vision, a creative idea, or a cause you believe in without losing steam, and your actions often carry a bigger, more inspired purpose than just getting something done.",
  'Pluto-Chiron-conjunction': "A generational wound around belief and freedom sits right on top of the planet of deep transformation in your chart. Personally, this shows up as a lifelong pull to rebuild your own worldview from the ground up rather than inherit someone else's — real healing comes through that rebuilding, not around it.",
  'Mercury-Venus-sextile': "Your sharp mind and your big-hearted values get along easily. You're good at finding the right words for how you feel about someone or something you love, and conversations about what you want in relationships tend to go smoothly rather than getting tangled.",
  'Jupiter-Neptune-trine': "Your natural curiosity and your capacity to dream big reinforce each other. When you follow an idea that excites you, it tends to actually expand into something real rather than staying just a nice thought.",
  'Jupiter-Pluto-opposition': "There's a pull between wanting to expand freely and a deeper need to control outcomes — you may over-plan or grip too tightly right when you're on the edge of a big opportunity. Loosening your grip at exactly that moment is usually what lets the growth actually happen.",
  'Moon-Venus-opposition': "Part of you needs deep emotional safety and closeness, and another part needs freedom and space in love — it can feel like wanting two different things from the same relationship. The people who are actually right for you can hold both without you having to choose.",
  'Sun-Saturn-opposition': "You can feel like your sense of who you are is constantly being tested against real-world limits, deadlines, or self-doubt — but this is also exactly what builds the kind of quiet, earned confidence that doesn't need anyone's permission. The heaviness you sometimes feel about proving yourself is usually a sign you're doing the real work, not a sign you're behind.",
  'Sun-Uranus-square': "Part of you wants deep stability and control, and another part is restless for change and independence. Expect to occasionally blow up a plan or a routine just because it started to feel like a cage, even if it was working — that's not self-sabotage, it's your need for freedom asking to be included.",
  'Sun-NNode-trine': "Who you are at your core is already pointed in the direction you're meant to grow. Following your gut instead of forcing yourself onto someone else's path tends to work out for you, because your identity and your life direction aren't fighting each other.",
  'Saturn-Neptune-trine': "Your ability to build something real, patiently, over time works well with your ability to dream big. You're someone who can actually turn a vision into something concrete instead of it staying just an idea, as long as you give it the time it needs.",
  'Venus-Mars-square': "What you want in love and how you go after what you want don't always agree — you might hold back from pursuing someone or something because you don't want to seem too eager, then feel frustrated when nothing moves. It's okay to want something and go get it without waiting for permission.",
  'Jupiter-Chiron-opposition': "Your urge to learn and expand can bump up against an old wound about not feeling truly understood or believed — sometimes chasing more information is really a way of avoiding a feeling. Growth here comes from letting people actually see you, not just what you know.",
}

export function getNatalAspectInterpretation(a: string, b: string, type: string): string {
  return NATAL_ASPECT_MEANINGS[`${a}-${b}-${type}`]
      ?? NATAL_ASPECT_MEANINGS[`${b}-${a}-${type}`]
      ?? `${a} and ${b} are ${plainAspectPhrase(type)} each other in your chart — these two areas of your life are linked, working together or in tension depending on the moment.`
}

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
      const pointA = NATAL_ASPECT_POINTS[i], pointB = NATAL_ASPECT_POINTS[j]
      aspects.push({
        a: pointA, b: pointB, type: cfg.name, orb: Math.round(orb * 10) / 10, emoji: cfg.emoji,
        interpretation: getNatalAspectInterpretation(pointA, pointB, cfg.name),
      })
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
