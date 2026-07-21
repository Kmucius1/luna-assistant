import { NextRequest, NextResponse } from 'next/server'

interface WeatherNow { tempF: number; forecast: string }

async function getWeather(lat: number, lon: number): Promise<WeatherNow | null> {
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

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lon = req.nextUrl.searchParams.get('lon')
  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })
  }
  const weather = await getWeather(parseFloat(lat), parseFloat(lon))
  if (!weather) {
    return NextResponse.json({ error: 'weather unavailable' }, { status: 502 })
  }
  return NextResponse.json(weather)
}
