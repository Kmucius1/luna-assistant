import { NextResponse } from 'next/server'
import { getFullNatalChart, getNatalAspects } from '@/lib/astrology'

export const dynamic = 'force-static'

// Zoe's natal chart never changes — this is deterministic, reproducible
// data (real longitudes from src/data/astrology/natal-zoe.json + a real
// whole-sign house derivation), not AI-generated, so it's safe to statically
// cache rather than recompute per request.
export async function GET() {
  const placements = getFullNatalChart()
  const aspects = getNatalAspects()
  return NextResponse.json({
    placements,
    aspects,
    birthData: {
      date: '2000-11-14',
      time: '19:04',
      place: 'Sellersville, Pennsylvania, USA',
      timeAccuracy: 'approximate' as const,
    },
    houseSystem: 'whole-sign',
    source: 'astronomy-engine (Swiss Ephemeris compatible)',
  })
}
