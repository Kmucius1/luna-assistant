import { NextRequest, NextResponse } from 'next/server'

// Destinations are worldwide, but the app's main /api/weather route uses
// weather.gov which only covers the US. Open-Meteo (already used there for
// UV) is free, keyless, and genuinely global, so it's the real source here
// rather than a second US-only call.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'lat/lon required' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&forecast_days=7&timezone=auto`,
      { signal: AbortSignal.timeout(6000) },
    )
    if (!res.ok) throw new Error('Open-Meteo request failed')
    const data = await res.json()
    return NextResponse.json({
      current_temp_f: data.current?.temperature_2m ?? null,
      current_weather_code: data.current?.weather_code ?? null,
      daily: data.daily ? data.daily.time.map((date: string, i: number) => ({
        date, high_f: data.daily.temperature_2m_max[i], low_f: data.daily.temperature_2m_min[i], weather_code: data.daily.weather_code[i],
      })) : [],
      source: 'Open-Meteo',
      fetched_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[travel/weather] error:', error)
    return NextResponse.json({ error: 'Weather data is temporarily unavailable' }, { status: 502 })
  }
}
