import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { getCurrentPlanets, getTransitsToNatal, plainAspectPhrase } from '@/lib/astrology'
import { LIFE_LANGUAGE_RULES, ROMANTIC_ACCURACY_RULES, DECISIVE_GUIDANCE_RULES } from '@/lib/luna/voiceRules'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { todayKey } from '@/lib/luna/today'

const ZOE_USER_ID = OWNER_USER_ID

export interface DayForecast {
  date:       string   // "Monday, June 23"
  dayLabel:   string   // "Today" | "Tomorrow" | "Monday" etc.
  theme:      string   // 1 sentence
  energy:     string   // 2 sentences — what the day feels like
  love:       string   // 1 sentence
  career:     string   // 1 sentence
  guidance:   string[] // 3 specific things to do/know
  watch_for:  string   // 1 warning
  affirmation: string  // 1 first-person declaration
  intensity:  number   // 1-10 how energetically loaded this day is
  best_move?: string   // the one best thing to do this day
  best_window?: string // best part of the day and why
}

export interface WeeklyForecast {
  week_theme:   string
  days:         DayForecast[]
  best_day:     string
  rest_day:     string
  love_window:  string
  power_window: string
  week_priorities?: { task: string; day: string; why: string }[]
}

// ─── Fallback generator ───────────────────────────────────────────────────────
const SIGN_ENERGY: Record<string, { keyword: string; feel: string; do: string }> = {
  Aries:       { keyword: 'Initiation',    feel: 'bold and forward-moving',   do: 'Start something new, take initiative, move your body' },
  Taurus:      { keyword: 'Grounding',     feel: 'slow, sensual, steady',      do: 'Work with your hands, rest, enjoy physical pleasure' },
  Gemini:      { keyword: 'Connection',    feel: 'quick, curious, social',     do: 'Have conversations, write, learn something new' },
  Cancer:      { keyword: 'Nurturance',    feel: 'emotional, tender, inward',  do: 'Spend time home, call someone you love, check in with yourself' },
  Leo:         { keyword: 'Expression',    feel: 'vibrant, creative, visible', do: 'Create, be seen, show up boldly, celebrate someone' },
  Virgo:       { keyword: 'Refinement',    feel: 'detail-oriented, helpful',   do: 'Organize, edit, serve, improve something specific' },
  Libra:       { keyword: 'Balance',       feel: 'harmonious, relational',     do: 'Connect, collaborate, seek beauty, make decisions' },
  Scorpio:     { keyword: 'Depth',         feel: 'intense, focused, magnetic', do: 'Research, go deeper, have honest conversations' },
  Sagittarius: { keyword: 'Expansion',     feel: 'free, inspired, adventurous', do: 'Learn, travel mentally or physically, share your vision' },
  Capricorn:   { keyword: 'Mastery',       feel: 'grounded, ambitious, serious', do: 'Work on long-term goals, structure, discipline' },
  Aquarius:    { keyword: 'Innovation',    feel: 'detached but electric',      do: 'Innovate, connect with community, think ahead' },
  Pisces:      { keyword: 'Intuition',     feel: 'dreamy, fluid, empathic',    do: 'Rest, create, meditate, trust your gut' },
}

function buildFallbackWeekly(startDate: Date, tz: string): WeeklyForecast {
  const days: DayForecast[] = []
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz })
  const shortDay  = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz })

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const planets  = getCurrentPlanets(d)
    const transits = getTransitsToNatal(d).slice(0, 4)
    const moon     = planets.find(p => p.name === 'Moon')
    const moonData = moon ? SIGN_ENERGY[moon.sign] : null
    const topT     = transits[0]
    const dayStr   = formatter.format(d)
    const label    = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortDay.format(d)
    const intensity = Math.min(10, Math.max(1, transits.filter(t => ['conjunction','square','opposition'].includes(t.type)).length * 3 + 4))

    days.push({
      date:       dayStr,
      dayLabel:   label,
      theme:      moonData ? `${moonData.keyword}: ${moon!.sign} Moon brings ${moonData.feel} energy.` : 'A day of movement and awareness.',
      energy:     `${moon ? `The Moon in ${moon.sign} colors everything with ${moonData?.feel ?? 'shifting'} energy.` : ''} ${topT ? `The strongest thing active today is ${topT.transiting} ${plainAspectPhrase(topT.type)} your own ${topT.natal} — ${topT.interpretation}` : 'The day has a gentle, open quality.'}`,
      love:       transits.find(t => ['Venus','Mars','Moon','NNode'].includes(t.natal))
        ? transits.find(t => ['Venus','Mars','Moon','NNode'].includes(t.natal))!.interpretation
        : `Your magnetism is ${intensity > 6 ? 'heightened' : 'steady'} today. ${moon?.sign === 'Cancer' || moon?.sign === 'Scorpio' ? 'Emotional depth is available — let it be felt.' : 'Light, playful energy works in love.'}`,
      career:     transits.find(t => ['Sun','Saturn','Midheaven','Jupiter'].includes(t.natal))
        ? transits.find(t => ['Sun','Saturn','Midheaven','Jupiter'].includes(t.natal))!.interpretation
        : `${moonData ? moonData.do.split(', ')[0] : 'Focused work'} is supported today.`,
      guidance:   [
        moonData ? moonData.do : 'Follow your energy, not your to-do list',
        topT ? `Pay attention to your ${topT.natal} — ${topT.energy} energy` : 'Trust your intuition over logic today',
        `Moon in ${moon?.sign ?? 'this placement'}: ${moonData?.do?.split(', ').pop() ?? 'honor your natural rhythm'}`,
      ],
      watch_for:  transits.find(t => ['square','opposition'].includes(t.type))?.interpretation
        ?? `Watch for: over-committing or pushing past your natural energy threshold. ${moon?.sign === 'Capricorn' || moon?.sign === 'Virgo' ? 'Rest is productive.' : 'Honor what you actually feel.'}`,
      affirmation: `I move through ${label.toLowerCase() === 'today' ? 'today' : label} with ${moonData?.keyword ?? 'awareness'} and trust. Every moment is working in my favor.`,
      intensity,
    })
  }

  const best  = days.reduce((a, b) => (a.intensity > b.intensity ? a : b))
  const rest  = days.reduce((a, b) => (a.intensity < b.intensity ? a : b))

  return {
    week_theme:   'You are in a season of momentum — follow what energizes you without forcing what does not.',
    days,
    best_day:     best.dayLabel,
    rest_day:     rest.dayLabel,
    love_window:  days.find(d => d.love.includes('Venus') || d.love.includes('magnetic'))?.dayLabel ?? days[2].dayLabel,
    power_window: best.dayLabel,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const refresh  = searchParams.get('refresh') === '1'
    const clientTz = searchParams.get('tz')   || 'America/New_York'
    const localDate = searchParams.get('date') || ''

    const now = new Date()
    const dateKey = `weekly_${localDate.replace(/[^a-zA-Z0-9]/g, '_') || todayKey(now, clientTz)}`

    // Build per-day planet data for all 7 days
    const dayData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() + i)
      const planets  = getCurrentPlanets(d)
      const transits = getTransitsToNatal(d).slice(0, 5)
      const moon     = planets.find(p => p.name === 'Moon')
      const sun      = planets.find(p => p.name === 'Sun')
      const venus    = planets.find(p => p.name === 'Venus')
      return { d, i, planets, transits, moon, sun, venus }
    })

    const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: clientTz })
    const shortFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: clientTz })

    const dayLines = dayData.map(({ d, i, moon, sun, venus, transits }) => {
      const lbl    = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : shortFmt.format(d)
      const date   = fmt.format(d)
      const tLines = transits.map(t => `  - ${t.transiting} ${t.type} natal ${t.natal} (${t.interpretation.slice(0, 80)}...)`).join('\n') || '  - No major transits active'
      return `${lbl} (${date}):
  Sun: ${sun?.sign ?? '?'} | Moon: ${moon?.sign ?? '?'} | Venus: ${venus?.sign ?? '?'}${venus?.retrograde ? ' Rx' : ''}
  Top Transits:
${tLines}`
    }).join('\n\n')

    const { payload: forecast } = await getOrCreateDailyContent<WeeklyForecast>({
      userId: ZOE_USER_ID,
      generationType: 'weekly_forecast_v6',
      timezone: clientTz,
      dateKey,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const prompt = `Generate a detailed 7-day horoscope for Zoe for the upcoming week.

ZOE'S NATAL CHART:
Sun: Scorpio 22° | Moon: Cancer 4° | Rising: Gemini 12°
Mercury: Scorpio 3° | Venus: Capricorn 2° | Mars: Libra 6°
Jupiter: Gemini 7° | Saturn: Taurus 27° | North Node: Cancer 17°
Chiron: Sagittarius 15° | Midheaven: Virgo 12°

HUMAN DESIGN: Self-Projected Projector · 4/6 Profile

PLANETARY DATA FOR EACH DAY:
${dayLines}

TIME RULES: never write "tomorrow" or "yesterday" anywhere; name days by weekday only. A day's advice must never tell her to plan or save something for that same day. Never state an invented event as fact (no "Kaleb texts you" or "a client asks"); use "if" for things that might happen, and never invent meetings, deadlines, numbers or names. Include exactly 4 items in week_priorities. Return ONLY valid JSON matching this exact schema. Every field is REQUIRED. Write as if you personally know Zoe — warm, direct, deeply specific to her chart:

{
  "week_theme": "1-2 sentences: the overarching energy and message for this week for Zoe specifically",
  "best_day": "weekday name of her most powerful or high-energy day this week",
  "rest_day": "weekday name of her best day to rest, recover, or go inward",
  "love_window": "weekday name of the day most charged for love and connection",
  "power_window": "weekday name of the day best for major decisions, visibility, or career moves",
  "week_priorities": [ { "task": "A specific kind of thing she should get done this week", "day": "the weekday that is best for it", "why": "one sentence why that day" } ],
  "days": [
    {
      "date": "weekday, Month Day (e.g. Monday, June 23)",
      "dayLabel": "Today / Tomorrow / Monday / etc",
      "theme": "1-2 sentences: the central theme or gift of this day for Zoe",
      "energy": "3-4 sentences of what this day FEELS like in her body and life, from morning to evening. Visceral and real — no generic astro talk. Reference the transits and Moon sign.",
      "love": "3 sentences about her love and connection energy this specific day — a real moment or feeling, not just a mood word",
      "career": "3 sentences about her work and business energy this specific day — she runs DRYP Digital, and outside that her own focus is modeling, tattooing, TikTok/content creation, painting, and fashion. Name a real kind of task, meeting, or decision the day favors.",
      "guidance": ["4 specific, actionable things she should do or know on this specific day — practical, personal, grounded in her transits, each a full sentence"],
      "watch_for": "1-2 sentences: an honest warning or caution specific to this day, including what it could look like if ignored",
      "best_move": "1-2 sentences: the ONE best thing for her to do this day, decisive and specific, with a one-sentence reason.",
      "best_window": "The best part of this day (morning, midday, afternoon, evening) for her most important thing, and why.",
      "affirmation": "1 powerful first-person declaration tailored to this day's energy",
      "intensity": 7
    }
  ]
}${LIFE_LANGUAGE_RULES}${ROMANTIC_ACCURACY_RULES}${DECISIVE_GUIDANCE_RULES}`

          const SYSTEM = "You are LUNA, Zoe's personal astrology guide. Generate detailed, specific, personalized daily readings — not generic horoscope content. Reference her actual chart placements and today's real transits. Be honest, warm, and deeply personal. Return ONLY valid JSON — no markdown fences."
          const rawText = await callAI(SYSTEM, prompt, 6500)
          const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
          const parsed = JSON.parse(jsonText) as WeeklyForecast
          return { payload: parsed, source: 'ai' as const }
        } catch {
          // Fallback: transit-based generation (always accurate)
          return { payload: buildFallbackWeekly(now, clientTz), source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(forecast)
  } catch (err) {
    console.error('[weekly-forecast] error:', err)
    return NextResponse.json({ error: 'Failed to generate weekly forecast.' }, { status: 500 })
  }
}
