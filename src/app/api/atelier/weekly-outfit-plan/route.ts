import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateDailyContent, localDateKey } from '@/lib/luna/dailyCache'
import { getUpcomingEvents } from '@/lib/calendar'
import { callAI, parseAIJson } from '@/lib/ai'
import { outfitImageForDate } from '@/lib/luna/outfitImages'

const ZOE_USER_ID = OWNER_USER_ID

// WMO weather codes (Open-Meteo) collapsed to a short human phrase — no
// existing lookup for this in the repo, so it's scoped locally here.
function weatherCodeToText(code: number): string {
  if (code === 0) return 'clear'
  if (code <= 3) return 'partly cloudy'
  if ([45, 48].includes(code)) return 'foggy'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code >= 61 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'rain showers'
  if (code >= 85 && code <= 86) return 'snow showers'
  if (code >= 95) return 'thunderstorms'
  return 'mixed conditions'
}

interface DayWeather { date: string; high_f: number; low_f: number; weather_code: number }

async function getWeekWeather(lat: number, lon: number): Promise<DayWeather[] | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&forecast_days=7&timezone=auto`,
      { signal: AbortSignal.timeout(6000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.daily) return null
    return data.daily.time.map((date: string, i: number) => ({
      date, high_f: data.daily.temperature_2m_max[i], low_f: data.daily.temperature_2m_min[i], weather_code: data.daily.weather_code[i],
    }))
  } catch {
    return null
  }
}

interface WardrobeItem { category?: string; color?: string; fit?: string; vibe_tags?: string[]; favorite_rating?: number }

async function getFavoriteWardrobeItems(): Promise<WardrobeItem[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('wardrobe_items')
      .select('category, color, fit, vibe_tags, favorite_rating')
      .eq('user_id', ZOE_USER_ID)
      .eq('clean_status', 'clean')
      .order('favorite_rating', { ascending: false })
      .limit(12)
    return data ?? []
  } catch {
    return []
  }
}

const WEEK_SYSTEM = `You are LUNA, Zoe's personal stylist, planning her outfits for the next 7 days.

Her confirmed real aesthetic is downtown streetwear/Y2K baddie — cropped tops or bandeaus, oversized
wide-leg denim or cargo pants, chunky sneakers or boots, layered jewelry, candid mirror-selfie or
street-style energy. NOT polished editorial, NOT "old money," NOT business-casual unless she's
explicitly going into the office that day.

You're given each of the next 7 days with its real weather (high/low, conditions) and what's actually
on her calendar that day, if anything. For EACH day, pick ONE specific outfit that:
- Genuinely fits that day's weather — layer up for cold/rain, lighten up for heat, adjust footwear for
  rain or snow.
- Fits what's actually happening — dress up a bit for a real calendar event (meeting, dinner, date),
  keep it comfortable and easy for an ordinary work-from-home or errand day.
- When a list of clothes she actually owns is given, prefer pulling specific real pieces from it over
  inventing generic ones, especially her higher-rated favorites.

HARD RULE — she has been explicit about this: NEVER repeat the same outfit twice in the same week.
Every single "outfit_caption" across all 7 days must describe a genuinely different combination —
different top, different bottom, or different silhouette/footwear, not just reworded text for the same
pieces. Even on two days with identical weather and no calendar events, choose different pieces. Before
you finalize, check your own 7 outfit_captions against each other and change any that are the same or
too similar.

Return ONLY valid JSON, with exactly one entry per date given, in the same order:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "day_name": "Monday",
      "occasion": "short label, e.g. 'Client meeting' or 'Easy Sunday'",
      "why": "1-2 sentences referencing the real weather and/or what's on the calendar that day",
      "outfit_caption": "one short line describing the outfit"
    }
  ]
}`

interface WeekDayPlan { date: string; day_name: string; occasion: string; why: string; outfit_caption: string; image_url: string; high_f: number | null; low_f: number | null; weather_text: string | null }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tz = searchParams.get('tz') || 'America/New_York'
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const force = searchParams.get('force') === 'true'
    const dateKey = localDateKey(new Date(), tz)

    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      dates.push(localDateKey(d, tz))
    }

    const [weather, events, wardrobe] = await Promise.all([
      lat && lon ? getWeekWeather(parseFloat(lat), parseFloat(lon)) : Promise.resolve(null),
      getUpcomingEvents(7).catch(() => []),
      getFavoriteWardrobeItems(),
    ])
    const weatherByDate = new Map((weather ?? []).map(w => [w.date, w]))
    const eventsByDate = new Map<string, string[]>()
    for (const ev of events) {
      const key = localDateKey(new Date(ev.start), tz)
      if (!eventsByDate.has(key)) eventsByDate.set(key, [])
      eventsByDate.get(key)!.push(ev.allDay ? ev.title : `${ev.title} (${ev.startTime})`)
    }

    const result = await getOrCreateDailyContent<{ days: WeekDayPlan[] }>({
      userId: ZOE_USER_ID,
      generationType: 'weekly_outfit_plan',
      timezone: tz,
      dateKey,
      forceRegenerate: force,
      generate: async () => {
        try {
          const dayLines = dates.map(dk => {
            const d = new Date(`${dk}T12:00:00`)
            const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(d)
            const isWeekend = ['Saturday', 'Sunday'].includes(dayName)
            const w = weatherByDate.get(dk)
            const weatherLine = w ? `${Math.round(w.low_f)}-${Math.round(w.high_f)}°F, ${weatherCodeToText(w.weather_code)}` : 'weather unknown, dress seasonally reasonable'
            const dayEvents = eventsByDate.get(dk)
            const eventsLine = dayEvents?.length ? dayEvents.join('; ') : (isWeekend ? 'nothing on the calendar — normal weekend' : 'nothing specific on the calendar — normal work day')
            return `${dk} (${dayName}): ${weatherLine}. Calendar: ${eventsLine}.`
          }).join('\n')

          const wardrobeLine = wardrobe.length
            ? `Clothes she actually owns (prefer these when they fit): ${wardrobe.map(w => [w.color, w.fit, w.category, w.vibe_tags?.join('/')].filter(Boolean).join(' ')).join('; ')}`
            : 'No wardrobe items logged yet — style from her general aesthetic.'

          const userPrompt = `${dayLines}\n\n${wardrobeLine}`
          const raw = await callAI(WEEK_SYSTEM, userPrompt, 2200)
          const parsed = parseAIJson<{ days: { date: string; day_name: string; occasion: string; why: string; outfit_caption: string }[] }>(raw)

          const byDate = new Map(parsed.days.map(d => [d.date, d]))
          const days: WeekDayPlan[] = dates.map(dk => {
            const p = byDate.get(dk)
            const w = weatherByDate.get(dk)
            const d = new Date(`${dk}T12:00:00`)
            const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(d)
            return {
              date: dk,
              day_name: p?.day_name ?? dayName,
              occasion: p?.occasion ?? (['Saturday', 'Sunday'].includes(dayName) ? 'Day off' : 'Work day'),
              why: p?.why ?? 'Dress true to your style today.',
              outfit_caption: p?.outfit_caption ?? 'A confident, easy street-style look',
              image_url: outfitImageForDate(dk),
              high_f: w ? Math.round(w.high_f) : null,
              low_f: w ? Math.round(w.low_f) : null,
              weather_text: w ? weatherCodeToText(w.weather_code) : null,
            }
          })

          return { payload: { days }, source: 'ai' as const }
        } catch (err) {
          console.error('[weekly-outfit-plan] generation error:', err)
          const days: WeekDayPlan[] = dates.map(dk => {
            const w = weatherByDate.get(dk)
            const d = new Date(`${dk}T12:00:00`)
            const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(d)
            const isWeekend = ['Saturday', 'Sunday'].includes(dayName)
            return {
              date: dk,
              day_name: dayName,
              occasion: isWeekend ? 'Day off' : 'Work day',
              why: 'Dress true to your style today.',
              outfit_caption: 'A confident, easy street-style look',
              image_url: outfitImageForDate(dk),
              high_f: w ? Math.round(w.high_f) : null,
              low_f: w ? Math.round(w.low_f) : null,
              weather_text: w ? weatherCodeToText(w.weather_code) : null,
            }
          })
          return { payload: { days }, source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(result.payload, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  } catch (err) {
    console.error('[atelier/weekly-outfit-plan] error:', err)
    return NextResponse.json({ days: [] })
  }
}
