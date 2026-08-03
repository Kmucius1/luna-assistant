import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrCreateDailyContent, localDateKey } from '@/lib/luna/dailyCache'
import { getCurrentPlanets } from '@/lib/astrology'
import { callAI, parseAIJson } from '@/lib/ai'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

// Curated streetwear/Y2K photos, hosted locally — HIGGSFIELD_API_KEY isn't
// configured server-side, so live per-day image generation always failed
// and fell back to an external Pinterest hotlink that didn't reliably load.
// Rotates deterministically by date so the look still changes day to day.
const OUTFIT_IMAGES = [
  '/images/outfits/streetwear-01.jpg',
  '/images/outfits/streetwear-02.jpg',
  '/images/outfits/streetwear-03.jpg',
  '/images/outfits/streetwear-04.jpg',
]

function outfitImageForDate(dateKey: string): string {
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0
  return OUTFIT_IMAGES[hash % OUTFIT_IMAGES.length]
}

interface DayPlanAnchors { at_work?: string; gym?: string }
interface DayPlan { key_anchors?: DayPlanAnchors }
interface WeatherNow { tempF: number; forecast: string }

async function getWeather(lat: number, lon: number): Promise<WeatherNow | null> {
  try {
    const ua = { 'User-Agent': 'luna-assistant (info@drypdigital.com)' }
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: ua, signal: AbortSignal.timeout(6000) })
    if (!pointsRes.ok) return null
    const points = await pointsRes.json()
    const forecastUrl = points.properties?.forecast
    if (!forecastUrl) return null
    const forecastRes = await fetch(forecastUrl, { headers: ua, signal: AbortSignal.timeout(6000) })
    if (!forecastRes.ok) return null
    const forecast = await forecastRes.json()
    const today = forecast.properties?.periods?.[0]
    if (!today) return null
    return { tempF: today.temperature, forecast: today.shortForecast }
  } catch {
    return null
  }
}

const OUTFIT_SYSTEM = `You are LUNA, Zoe's personal stylist. Her confirmed real aesthetic is downtown
streetwear/Y2K baddie — cropped tops or bandeaus, oversized wide-leg denim or cargo pants, chunky
sneakers or boots, layered jewelry, candid mirror-selfie or street-style energy. NOT polished
editorial, NOT "old money," NOT business-casual unless she's explicitly going into the office.

Given her real context for today — weather, zodiac energy, mood, and whether it's a work day or a
day off — decide on ONE specific outfit true to her aesthetic but genuinely adapted to today's real
conditions (temperature, what she's actually doing today).

Return ONLY valid JSON:
{
  "occasion": "short label, e.g. 'Work from home' or 'Sunday errands'",
  "why": "1-2 sentences on why this fits today specifically — reference the actual weather/mood/energy given",
  "outfit_caption": "one short line describing the outfit, e.g. 'Cropped hoodie, wide-leg cargos, chunky sneakers'",
  "image_prompt": "a vivid, specific prompt for an AI image generator: candid mirror selfie or street style photo of this exact outfit, downtown streetwear/Y2K baddie aesthetic, weather-appropriate, iPhone photo quality, not overly posed"
}`

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tz = searchParams.get('tz') || 'America/New_York'
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const dateKey = localDateKey(new Date(), tz)
    const db = createAdminClient()

    const dayName = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(new Date())
    const isWeekend = ['Saturday', 'Sunday'].includes(dayName)

    const [weather, checkInR, dayPlanR] = await Promise.all([
      lat && lon ? getWeather(parseFloat(lat), parseFloat(lon)) : Promise.resolve(null),
      db.from('check_ins').select('mood_rating, feeling').eq('user_id', ZOE_USER_ID).eq('date', dateKey)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
      db.from('daily_generation_cache').select('payload').eq('user_id', ZOE_USER_ID).eq('date_key', dateKey)
        .eq('generation_type', 'day_plan').maybeSingle(),
    ])

    const checkIn = checkInR.data as { mood_rating?: number; feeling?: string } | null
    const dayPlan = dayPlanR.data?.payload as DayPlan | undefined
    const isWorkDay = dayPlan?.key_anchors?.at_work ? true : !isWeekend
    const planets = getCurrentPlanets(new Date())
    const sun = planets.find(p => p.name === 'Sun')
    const moon = planets.find(p => p.name === 'Moon')

    const result = await getOrCreateDailyContent<{
      occasion: string; why: string; outfit_caption: string; image_url: string | null
    }>({
      userId: ZOE_USER_ID,
      generationType: 'daily_outfit',
      timezone: tz,
      dateKey,
      generate: async () => {
        try {
          const contextLines = [
            `Today: ${dayName}, ${isWeekend ? 'weekend' : 'weekday'}`,
            `Day type: ${isWorkDay ? 'working today' : 'day off'}`,
            weather ? `Weather: ${weather.tempF}°F, ${weather.forecast}` : 'Weather: unknown, dress seasonally reasonable',
            sun ? `Sun in ${sun.sign} — ${sun.formatted}` : '',
            moon ? `Moon in ${moon.sign} — ${moon.formatted}` : '',
            checkIn?.mood_rating ? `Logged mood today: ${checkIn.mood_rating}/10${checkIn.feeling ? ` (${checkIn.feeling})` : ''}` : 'No mood logged yet today',
          ].filter(Boolean).join('\n')

          const raw = await callAI(OUTFIT_SYSTEM, contextLines, 400)
          const parsed = parseAIJson<{ occasion: string; why: string; outfit_caption: string; image_prompt: string }>(raw)

          return {
            payload: { occasion: parsed.occasion, why: parsed.why, outfit_caption: parsed.outfit_caption, image_url: outfitImageForDate(dateKey) },
            source: 'ai' as const,
          }
        } catch (err) {
          console.error('[daily-outfit] generation error:', err)
          return {
            payload: {
              occasion: isWorkDay ? 'Work day' : 'Day off',
              why: 'Dress true to your style today.',
              outfit_caption: 'A confident, easy street-style look',
              image_url: outfitImageForDate(dateKey),
            },
            source: 'fallback' as const,
          }
        }
      },
    })

    return NextResponse.json(result.payload, { headers: { 'Cache-Control': 'no-store, must-revalidate' } })
  } catch (err) {
    console.error('[atelier/daily-outfit] error:', err)
    return NextResponse.json({
      occasion: '',
      why: '',
      outfit_caption: '',
      image_url: OUTFIT_IMAGES[0],
    })
  }
}
