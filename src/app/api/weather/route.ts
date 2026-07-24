import { NextRequest, NextResponse } from 'next/server'

interface WeatherNow { tempF: number; forecast: string; uvIndex: number | null }

async function getWeather(lat: number, lon: number): Promise<Omit<WeatherNow, 'uvIndex'> | null> {
  const ua = { 'User-Agent': 'luna-assistant (zoe personal app)' }
  try {
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, { headers: ua, signal: AbortSignal.timeout(6000) })
    if (!pointsRes.ok) return null
    const points = await pointsRes.json()
    const forecastUrl = points?.properties?.forecast
    if (!forecastUrl) return null
    const forecastRes = await fetch(forecastUrl, { headers: ua, signal: AbortSignal.timeout(6000) })
    if (!forecastRes.ok) return null
    const forecast = await forecastRes.json()
    const today = forecast?.properties?.periods?.[0]
    if (!today) return null
    return { tempF: today.temperature, forecast: today.shortForecast }
  } catch {
    return null
  }
}

// Open-Meteo needs no API key and has no US-only coverage limit (unlike
// weather.gov above), so it's the real source for UV — not fabricated.
async function getUvIndex(lat: number, lon: number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=uv_index_max&timezone=auto&forecast_days=1`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    const uv = data?.daily?.uv_index_max?.[0]
    return typeof uv === 'number' ? Math.round(uv * 10) / 10 : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')
  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })
  }
  const [weather, uvIndex] = await Promise.all([
    getWeather(parseFloat(lat), parseFloat(lon)),
    getUvIndex(parseFloat(lat), parseFloat(lon)),
  ])
  if (!weather) {
    return NextResponse.json({ error: 'weather unavailable' }, { status: 502 })
  }
  return NextResponse.json({ ...weather, uvIndex })
}
