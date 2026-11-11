import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { natalChartPromptBlock, getCurrentPlanets, getTransitsToNatal, plainAspectPhrase } from '@/lib/astrology'
import { LIFE_LANGUAGE_RULES, ROMANTIC_ACCURACY_RULES, DECISIVE_GUIDANCE_RULES } from '@/lib/luna/voiceRules'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { todayKey, mondayKeyOf } from '@/lib/luna/today'
import { buildWeekSky, pickWeekWindows } from '@/lib/luna/weekSky'

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
  love_action?: string // what to do in love and romance this specific day
  best_window?: string // best part of the day and why
}

export interface WeeklyForecast {
  week_theme:   string
  days?:        DayForecast[]
  day_headlines?: { weekday: string; headline: string }[]
  best_day:     string
  rest_day:     string
  love_window:  string
  power_window: string
  week_priorities?: { task: string; day: string; why: string }[]
  love_week?: { arc: string; kaleb: string; do: string[]; watch: string }
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

function buildFallbackWeekly(startDate: Date, tz: string, todayIso: string): WeeklyForecast {
  const days: DayForecast[] = []
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz })
  const shortDay  = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz })

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate.getTime() + i * 86400000)
    const planets  = getCurrentPlanets(d)
    const transits = getTransitsToNatal(d).slice(0, 4)
    const moon     = planets.find(p => p.name === 'Moon')
    const moonData = moon ? SIGN_ENERGY[moon.sign] : null
    const topT     = transits[0]
    const dayStr   = formatter.format(d)
    const isoD     = todayKey(d, tz)
    const label    = isoD === todayIso ? 'Today' : shortDay.format(d)
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
  // (best_day / rest_day / love_window / power_window are replaced by the calculated picks in sanitizeForecast)

  return {
    week_theme:   'You are in a season of momentum — follow what energizes you without forcing what does not.',
    days,
    best_day:     best.dayLabel,
    rest_day:     rest.dayLabel,
    love_window:  days.find(d => d.love.includes('Venus') || d.love.includes('magnetic'))?.dayLabel ?? days[2].dayLabel,
    power_window: best.dayLabel,
  }
}

// The AI interprets the week; it does not get to contradict the calculated one. Any day it
// names must be a real weekday of this week that is today or later, otherwise the
// calculated pick from the real transits is used instead.
function sanitizeForecast(f: WeeklyForecast, sky: ReturnType<typeof buildWeekSky>): WeeklyForecast {
  const todayIdx = sky.findIndex(d => d.isToday)
  const upcoming = new Set(sky.filter((_, i) => todayIdx < 0 || i >= todayIdx).map(d => d.weekday))
  const calc = pickWeekWindows(sky)
  const ok = (v: unknown): v is string => typeof v === 'string' && upcoming.has(v.trim())
  const out: WeeklyForecast = { ...f }
  out.best_day = ok(f.best_day) ? f.best_day.trim() : calc.best_day
  out.rest_day = ok(f.rest_day) ? f.rest_day.trim() : calc.rest_day
  out.love_window = ok(f.love_window) ? f.love_window.trim() : calc.love_window
  out.power_window = ok(f.power_window) ? f.power_window.trim() : calc.power_window
  if (Array.isArray(f.week_priorities)) {
    out.week_priorities = f.week_priorities.map(p => ({ ...p, day: ok(p?.day) ? p.day.trim() : calc.power_window }))
  }
  if (Array.isArray(f.day_headlines)) {
    const names = new Set(sky.map(d => d.weekday))
    out.day_headlines = f.day_headlines.filter(h => names.has(h?.weekday))
  }
  return out
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const refresh  = searchParams.get('refresh') === '1'
    const clientTz = searchParams.get('tz')   || 'America/New_York'
    const localDate = searchParams.get('date') || ''

    const now = new Date()
    const dateKey = `weekly_${localDate.replace(/[^a-zA-Z0-9]/g, '_') || todayKey(now, clientTz)}`

    // The week, calculated: real weekdays/dates, Moon, Venus/Mars, Mercury status and
    // the transits active against her chart on each day. The AI only interprets this.
    // A real calendar week (Monday to Sunday), not a rolling 7 days from today.
    const todayIso = todayKey(now, clientTz)
    const weekStart = mondayKeyOf(now, clientTz)
    const weekStartDate = new Date(`${weekStart}T16:00:00Z`)
    const sky = buildWeekSky(weekStart, 7)
    const dayLines = sky.map(d => {
      const t = d.transits.map(x => `  - ${x.text} (${x.strength}, ${x.kind}): ${x.meaning}`).join('\n') || '  - No strong personal transits'
      return `${d.weekday}, ${d.dateLabel}${d.isToday ? ' (TODAY)' : d.iso < todayIso ? ' (ALREADY PASSED)' : ''}:
  Moon in ${d.moon.sign} ${d.moon.degree}°${d.moon.changesSign ? ' (just moved into this sign)' : ''}, ${d.moon.phase} (${d.moon.illumination}% lit)
  Venus in ${d.venus.sign}${d.venus.retrograde ? ' (moving backward)' : ''} | Mars in ${d.mars.sign}${d.mars.retrograde ? ' (moving backward)' : ''}${d.mercuryRetrograde ? ' | Mercury moving backward' : ''}
  Calculated intensity: ${d.intensity}/10
  Active against her chart:
${t}`
    }).join('\n\n')
    const weekdays = sky.map(d => d.weekday)

    const { payload: forecast } = await getOrCreateDailyContent<WeeklyForecast>({
      userId: ZOE_USER_ID,
      generationType: 'weekly_forecast_v11',
      timezone: clientTz,
      dateKey,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const prompt = `Write the week-level guidance for Zoe's calendar week (Monday through Sunday; days before today are already past, so frame those as context and focus advice on today onward), using ONLY the calculated sky below. Each day also has its own full written reading elsewhere, so here you give the big picture, the best days for things, and a short headline per day.

ZOE'S NATAL CHART:
${natalChartPromptBlock()}

HUMAN DESIGN: Self-Projected Projector · 4/6 Profile

THE CALCULATED WEEK (real weekdays and dates; do not contradict):
${dayLines}

Return ONLY valid JSON matching this exact schema. Every field is REQUIRED:

{
  "week_theme": "3-4 plain sentences: the shape of the whole week for Zoe, which days are strongest, which are heavy, and why, using the calculated facts above.",
  "best_day": "weekday name from: ${weekdays.join(', ')}",
  "rest_day": "weekday name, her best day to rest or go inward",
  "love_window": "weekday name most open for love and connection",
  "power_window": "weekday name best for decisions, visibility or career moves",
  "day_headlines": [ { "weekday": "one of the weekday names above, in order", "headline": "1-2 sentences: what this day is about and the single best use of it, from the calculated sky for that day." } ],
  "love_week": {
    "arc": "4-5 plain sentences: the shape of the week for love and romance. Which days open, which are quiet or tense, and why (real planets only).",
    "kaleb": "3-4 sentences on how the week may feel in the Kaleb situation (a real romantic connection that is not committed): when closeness is favored, when to give space, and when a clear honest conversation fits. Never predict commitment.",
    "do": ["4 specific things to do for her heart this week, each naming the best weekday for it"],
    "watch": "2-3 sentences: what to watch for this week in love, in him and in herself."
  },
  "week_priorities": [ { "task": "A specific kind of thing she should get done this week", "day": "the weekday that is best for it", "why": "one sentence why that day, from the sky" } ]
}

Rules: exactly one headline per day, in order (${weekdays.length} items). Exactly 4 week_priorities. TIME RULES: never write "tomorrow" or "yesterday"; name days by weekday only. NEVER refer to the past ("last weekend", "last week", "earlier this week"); this is the Monday-to-Sunday calendar week; for days before today, describe the sky but give no forward advice. Never invent events, meetings, deadlines, numbers or names; use "if" for things that might happen. Use only weekdays listed above. Never recommend, schedule or name a best day for anything on a day marked ALREADY PASSED; only TODAY or later days can be recommended.${LIFE_LANGUAGE_RULES}${ROMANTIC_ACCURACY_RULES}${DECISIVE_GUIDANCE_RULES}`

          const SYSTEM = "You are LUNA, Zoe's personal astrology guide. Generate detailed, specific, personalized daily readings — not generic horoscope content. Reference her actual chart placements and today's real transits. Be honest, warm, and deeply personal. Return ONLY valid JSON — no markdown fences."
          const rawText = await callAI(SYSTEM, prompt, 8000)
          const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
          const parsed = JSON.parse(jsonText) as WeeklyForecast
          return { payload: parsed, source: 'ai' as const }
        } catch {
          // Fallback: transit-based generation (always accurate)
          return { payload: buildFallbackWeekly(weekStartDate, clientTz, todayIso), source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(sanitizeForecast(forecast, sky))
  } catch (err) {
    console.error('[weekly-forecast] error:', err)
    return NextResponse.json({ error: 'Failed to generate weekly forecast.' }, { status: 500 })
  }
}
