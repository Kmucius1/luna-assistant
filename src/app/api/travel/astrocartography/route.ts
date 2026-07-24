import { NextRequest, NextResponse } from 'next/server'
import { getAstrocartographyLines, findNearbyAstroLines, describeAstroLine, ZOE_BIRTH_DATE } from '@/lib/astrology'

export const dynamic = 'force-static'

// Real line-of-position math from the same birth data used by the natal
// chart — cached as static since it's deterministic (birth data never
// changes). Birth time is the same "approximate" accuracy noted on
// /astrology/chart, which matters more here than almost anywhere else:
// AC/DC lines shift with birth time, MC/IC lines don't (they only depend
// on the birth date+location's sidereal time, which is exact regardless of
// time-of-day uncertainty within a single day).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  const lines = getAstrocartographyLines(ZOE_BIRTH_DATE)

  if (lat && lon) {
    const nearby = findNearbyAstroLines(lines, parseFloat(lat), parseFloat(lon), 4)
    const readings = nearby.map(n => ({ ...n, description: describeAstroLine(n.body, n.type) }))
    return NextResponse.json({ lines, nearby: readings, timeAccuracyNote: 'Birth time is approximate — AC/DC lines (which depend on time of day) carry more uncertainty than MC/IC lines (which don\'t).' })
  }

  return NextResponse.json({ lines, timeAccuracyNote: 'Birth time is approximate — AC/DC lines (which depend on time of day) carry more uncertainty than MC/IC lines (which don\'t).' })
}
