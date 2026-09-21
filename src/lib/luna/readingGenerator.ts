// Core per-day reading generator — the single place that knows how to build
// one day's structured astrology/numerology/Chinese-day-energy reading.
// Reused by the interactive daily-readings route (today, on-demand) and the
// generate-readings cron (backfilling the 6-day window).
import { callAI } from '@/lib/ai'
import {
  getCurrentPlanets,
  getTransitsToNatal,
  getMoonPhase,
  getMoonSign,
  SIGN_ENERGY_DESCRIPTIONS,
  type TransitAspect,
} from '@/lib/astrology'
import { calculatePersonalDay, getPersonalDayMeaning } from '@/lib/numerology'
import { getChineseDayEnergy, ELEMENT_GUIDANCE } from '@/lib/chineseAstrology'
import { localDateKey, localDayBoundsUTC } from './dailyCache'
import { LIFE_LANGUAGE_RULES } from './voiceRules'

// Mirrors the ZOE_USER_ID hardcoding pattern used by every route in this
// app — matches the birth date already seeded in astrology_profiles.
const ZOE_BIRTH_DATE = new Date(2000, 10, 14) // Nov 14 2000

export interface ReadingJSON {
  title: string
  date: string
  main_theme: string
  cosmic_weather: {
    sun_sign: string
    moon_sign: string
    moon_phase: string
    major_aspects: string[]
    retrogrades: string[]
  }
  personal_alignment: {
    natal_focus: string
    emotional_theme: string
    relationship_theme: string
    career_theme: string
    energy_theme: string
  }
  numerology: { personal_day: string; meaning: string }
  chinese_astrology: { day_energy: string; element_focus: string; guidance: string }
  guidance: { do_this: string; avoid_this: string; journal_prompt: string; affirmation: string }
  clarity_note: string
  luna_message: string
}

export interface GeneratedReading {
  payload: ReadingJSON
  source: 'ai' | 'fallback'
  facts: {
    sunSign: string
    moonSign: string
    moonPhase: string
    personalDay: number
    chineseDayEnergy: string
    majorTransits: TransitAspect[]
    natalTransits: TransitAspect[]
  }
}

function getMoonPhaseName(date: Date): string {
  return getMoonPhase(date).name
}

const REQUIRED_TOP_LEVEL: (keyof ReadingJSON)[] = [
  'title', 'date', 'main_theme', 'cosmic_weather', 'personal_alignment',
  'numerology', 'chinese_astrology', 'guidance', 'clarity_note', 'luna_message',
]

function buildReadingFallback(
  dateStr: string,
  sunSign: string,
  moonSign: string,
  moonPhase: string,
  majorTransits: TransitAspect[],
  personalDay: number,
  chineseLabel: string,
  chineseElement: keyof typeof ELEMENT_GUIDANCE,
): ReadingJSON {
  const top = majorTransits[0]
  const moonFeel = SIGN_ENERGY_DESCRIPTIONS[moonSign as keyof typeof SIGN_ENERGY_DESCRIPTIONS] ?? 'a shifting emotional quality'
  const dayMeaning = getPersonalDayMeaning(personalDay)
  const elementGuidance = ELEMENT_GUIDANCE[chineseElement]

  return {
    title: `${dateStr} — ${moonPhase} in ${moonSign}`,
    date: dateStr,
    main_theme: `The Moon in ${moonSign} may color today with ${moonFeel}. ${top ? `${top.transiting} ${top.type} your natal ${top.natal} may also be part of what's active today.` : 'The sky is relatively quiet today.'}`,
    cosmic_weather: {
      sun_sign: sunSign,
      moon_sign: moonSign,
      moon_phase: moonPhase,
      major_aspects: majorTransits.slice(0, 3).map(t => `${t.transiting} ${t.type} natal ${t.natal}`),
      retrogrades: [],
    },
    personal_alignment: {
      natal_focus: top ? `This may highlight your natal ${top.natal} — ${top.interpretation}` : 'No major transit is especially active today — a good day to notice the quieter signals.',
      emotional_theme: `The Moon in ${moonSign} may bring ${moonFeel} to the surface. This is information, not a verdict.`,
      relationship_theme: 'Connection today may go better through honesty than performance — say the true thing, gently.',
      career_theme: 'Focused, steady effort on one thing may serve you better today than spreading across many.',
      energy_theme: `${moonPhase} energy may support ${moonPhase.includes('Wax') || moonPhase === 'New Moon' ? 'starting or building' : moonPhase.includes('Wan') || moonPhase === 'Full Moon' ? 'releasing or completing' : 'steady maintenance'}.`,
    },
    numerology: { personal_day: String(personalDay), meaning: dayMeaning },
    chinese_astrology: { day_energy: chineseLabel, element_focus: chineseElement, guidance: elementGuidance },
    guidance: {
      do_this: 'Choose one clear priority and give it real attention rather than splitting focus across everything.',
      avoid_this: 'Avoid making an irreversible decision purely off today\'s mood — let a feeling pass through before you act on it.',
      journal_prompt: 'What is one thing I know to be true today, even if I can\'t fully explain why?',
      affirmation: 'I move at the pace that is actually mine.',
    },
    clarity_note: `The Moon sign, phase, and transits above are real, calculated positions for ${dateStr}. Everything else on this page is symbolic interpretation — offered for reflection, not as a prediction.`,
    luna_message: 'Take what resonates here and leave the rest. You know your own life better than any chart does.',
  }
}

const SCIENCE_AWARE_RULES = `
SCIENCE-AWARE VOICE RULES (mandatory, non-negotiable):
- Never state or imply that astrology, numerology, or Chinese day-energy is scientifically proven or a form of prediction. The planetary positions are real astronomical calculations; what they MEAN is traditional symbolic interpretation, not a scientific finding — never blur that line.
- Use hedged, non-deterministic language throughout: "may", "could", "the chart points toward", "this energy supports" — NEVER "will", "will definitely", "is going to happen".
- NEVER make any deterministic claim about health, death, pregnancy, legal outcomes, cheating/infidelity, or someone dying. If a transit is traditionally linked to one of these themes, redirect to reflection/self-awareness language instead.
- Prefer offering a reflection question, journaling prompt, or grounding suggestion over any deterministic instruction.
- "clarity_note" must explicitly and plainly separate what is calculated fact (today's real Moon sign, real transiting planet positions — computed via ephemeris math) from what is symbolic interpretation, in Luna's own voice, 1-2 sentences.`

// Bump when the way readings are calculated changes so already-stored readings
// are regenerated once automatically. v2: built for local noon of the reading's
// date (v1 used 8 PM ET the night before and carried the previous day's date).
export const READING_VERSION = 2

export async function generateDailyReading(date: Date, timezone: string): Promise<GeneratedReading> {
  const planets = getCurrentPlanets(date)
  const transits = getTransitsToNatal(date).slice(0, 5)
  const retrogrades = planets.filter(p => p.retrograde)

  const sun = planets.find(p => p.name === 'Sun')
  const moon = planets.find(p => p.name === 'Moon')
  const sunSign = sun?.sign ?? 'Scorpio'
  const moonSign = moon?.sign ?? 'Cancer'
  const moonPhase = getMoonPhaseName(date)

  const personalDay = calculatePersonalDay(ZOE_BIRTH_DATE, date)
  const [year, month, day] = localDateKey(date, timezone).split('-').map(Number)
  const chineseDay = getChineseDayEnergy(year, month, day)

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(date)

  // If the Moon changes sign during this local day, the reading must say so —
  // one sign for the whole day would be wrong for part of it.
  const { start: dayStart, end: dayEnd } = localDayBoundsUTC(localDateKey(date, timezone), timezone)
  const startMoon = getMoonSign(dayStart)
  let moonChangeLine = ''
  if (startMoon.nextSignDate && startMoon.nextSignDate < dayEnd) {
    const newSign = getMoonSign(new Date(startMoon.nextSignDate.getTime() + 60_000)).sign
    const at = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(startMoon.nextSignDate)
    moonChangeLine = `\nMoon sign change today: ${startMoon.sign} until ${at}, then ${newSign}. State both signs and the time in the reading.`
  }

  const facts = {
    sunSign, moonSign, moonPhase, personalDay,
    chineseDayEnergy: chineseDay.label,
    majorTransits: transits, natalTransits: transits,
  }

  try {
    const transitLines = transits.map(t =>
      `${t.transiting} ${t.type} natal ${t.natal} (${t.natalSign} ${t.natalDegree}°) — ${t.interpretation}`
    ).join('\n')
    const retroLines = retrogrades.map(p => `${p.name} retrograde in ${p.sign}`).join(', ') || 'None active'

    const userPrompt = `Today is ${dateStr}.

=== CALCULATED SKY (real ephemeris data) ===
Sun: ${sunSign} | Moon: ${moonSign} | Moon phase: ${moonPhase}${moonChangeLine}
Retrogrades: ${retroLines}
Top transits to Zoe's natal chart:
${transitLines || 'No major transits active today.'}

=== CALCULATED NUMEROLOGY ===
Personal Day Number: ${personalDay} — ${getPersonalDayMeaning(personalDay)}

=== CALCULATED CHINESE DAY ENERGY ===
${chineseDay.label} (${chineseDay.element} element)

=== ZOE'S NATAL CHART & PERSONALITY ===
Scorpio Sun, Cancer Moon, Gemini Rising. Self-Projected Projector, 4/6 Human Design profile — gains clarity through speaking, needs invitation over initiation. Runs Ad-Vantage Media Agency and DRYP Digital.

Generate today's complete Luna reading. Return ONLY valid JSON — no markdown, no prose outside the JSON. Match this exact schema:

{
  "title": "short title for today's energy",
  "date": "${dateStr}",
  "main_theme": "3-4 sentences: the central theme of today, grounded in the real Moon sign/phase/transits above, but written as what today will actually feel or look like in her life — not a list of placements. See the PLAIN-ENGLISH LIFE RULE below.",
  "cosmic_weather": {
    "sun_sign": "${sunSign}", "moon_sign": "${moonSign}", "moon_phase": "${moonPhase}",
    "major_aspects": ["each top transit above, named, then immediately translated into what it actually looks like today — never the placement alone"],
    "retrogrades": ["each active retrograde, named, then what it actually means for her day-to-day right now"]
  },
  "personal_alignment": {
    "natal_focus": "2-3 sentences on what today's transits highlight in Zoe's chart — name the placement, then spell out concretely what to pay attention to today: a specific kind of moment, feeling, or situation, not just 'the area where X lives'",
    "emotional_theme": "1-2 sentences, grounded in the Moon sign/phase, described as an actual mood or feeling she might notice",
    "relationship_theme": "1-2 sentences on love/connection energy today — a real, concrete relational scenario, not just a placement",
    "career_theme": "1-2 sentences on work/business energy today — she runs Ad-Vantage and DRYP Digital — concrete, not abstract",
    "energy_theme": "1-2 sentences on body/energy today, described physically/emotionally, not just named"
  },
  "numerology": { "personal_day": "${personalDay}", "meaning": "1 sentence expanding on the Personal Day meaning above, in Luna's voice" },
  "chinese_astrology": { "day_energy": "${chineseDay.label}", "element_focus": "${chineseDay.element}", "guidance": "1 sentence of hedged, symbolic guidance for this element" },
  "guidance": {
    "do_this": "1 specific, grounded suggestion for today",
    "avoid_this": "1 honest, specific caution for today — never deterministic or fear-based",
    "journal_prompt": "1 reflective journal question tied to today's energy",
    "affirmation": "1 first-person affirmation, specific to today"
  },
  "clarity_note": "1-2 sentences explicitly separating today's calculated facts (Moon sign/phase/transits) from the symbolic interpretation above",
  "luna_message": "1-2 sentences, warm and direct, Luna speaking to Zoe about today"
}${LIFE_LANGUAGE_RULES}${SCIENCE_AWARE_RULES}`

    const SYSTEM = 'You are LUNA, Zoe\'s personal astrology guide. Write in a warm, direct, honest voice — as if you deeply know this woman. Never leave a planet, sign, house, or aspect standing alone as just a label — always translate it into what it actually looks or feels like in her real day (a conversation, a mood, a decision, a tension, a physical feeling). Speak in reflective, hedged language, never deterministic predictions.'

    const rawText = await callAI(SYSTEM, userPrompt, 2000)
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const parsed = JSON.parse(jsonText) as ReadingJSON

    for (const field of REQUIRED_TOP_LEVEL) {
      if (parsed[field] === undefined) throw new Error(`Missing field in AI response: ${field}`)
    }

    return { payload: parsed, source: 'ai', facts }
  } catch {
    const fallback = buildReadingFallback(
      dateStr, sunSign, moonSign, moonPhase, transits, personalDay, chineseDay.label, chineseDay.element,
    )
    return { payload: fallback, source: 'fallback', facts }
  }
}
