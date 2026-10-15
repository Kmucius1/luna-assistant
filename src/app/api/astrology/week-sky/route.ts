import { NextRequest, NextResponse } from 'next/server'
import { buildWeekSky, isoToday } from '@/lib/luna/weekSky'

export const dynamic = 'force-dynamic'

// Deterministic: the real days of the week and the real sky for each, no AI.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('start')
  const start = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : isoToday()
  return NextResponse.json({ start, days: buildWeekSky(start, 7) })
}
