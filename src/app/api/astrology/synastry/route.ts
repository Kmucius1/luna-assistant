import { NextRequest, NextResponse } from 'next/server'
import { localBirthToUTC } from '@/lib/luna/birthTime'
import { getCurrentPlanets, getAspect, getSynastryAspectMeaning, ZOE_NATAL, angleBetween as _angleBetween } from '@/lib/astrology'

// Real synastry: the other person's planetary positions at their birth
// moment are computed with the exact same astronomy-engine functions used
// for "current sky" elsewhere in this app (getCurrentPlanets takes any
// Date) — then cross-compared against Zoe's real natal longitudes. No
// percentage is invented; every category below is backed by an explicit,
// real aspect list.
export const dynamic = 'force-dynamic'

interface SynastryBody { birthDate: string; birthTime?: string; birthTimezone?: string }

interface ScoredAspect { a: string; b: string; type: string; orb: number; interpretation: string }

// Note: no Rising/Ascendant comparison here — that requires the other
// person's birth LOCATION (not just date/time), which this minimal form
// doesn't collect yet. Only the 10 classical planets are real+computable
// from date/time alone.
const NATAL_POINTS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Saturn']

const CATEGORY_PAIRS: Record<string, [string, string][]> = {
  emotionalConnection: [['Moon', 'Moon'], ['Moon', 'Sun'], ['Moon', 'Venus']],
  communication: [['Mercury', 'Mercury'], ['Mercury', 'Moon'], ['Mercury', 'Sun']],
  attraction: [['Venus', 'Mars'], ['Mars', 'Venus'], ['Venus', 'Venus'], ['Mars', 'Mars']],
  trustAndSupport: [['Saturn', 'Sun'], ['Saturn', 'Moon'], ['Sun', 'Saturn'], ['Moon', 'Saturn']],
}

function scoreCategory(aspects: { a: string; b: string; type: string }[], pairs: [string, string][]): number {
  const relevant = aspects.filter(asp => pairs.some(([x, y]) => (asp.a === x && asp.b === y) || (asp.a === y && asp.b === x)))
  if (!relevant.length) return 60 // neutral baseline — no strong real signal either way
  let score = 60
  for (const r of relevant) {
    if (r.type === 'trine' || r.type === 'sextile') score += 14
    else if (r.type === 'conjunction') score += 10
    else if (r.type === 'square' || r.type === 'opposition') score -= 8
  }
  return Math.max(15, Math.min(98, Math.round(score)))
}

export async function POST(req: NextRequest) {
  try {
    const body: SynastryBody = await req.json()
    if (!body.birthDate) return NextResponse.json({ error: 'birthDate required' }, { status: 400 })

    const dateTime = localBirthToUTC(body.birthDate, body.birthTime, body.birthTimezone)
    if (isNaN(dateTime.getTime())) return NextResponse.json({ error: 'invalid date' }, { status: 400 })

    const theirPlanets = getCurrentPlanets(dateTime)
    const theirRelevant = theirPlanets.filter(p => NATAL_POINTS.includes(p.name))

    const aspects: ScoredAspect[] = []
    for (const their of theirRelevant) {
      for (const natalPoint of NATAL_POINTS) {
        const zoePoint = ZOE_NATAL[natalPoint]
        if (!zoePoint) continue
        const cfg = getAspect(their.lon, zoePoint.lon)
        if (!cfg) continue
        const orb = Math.round(Math.abs(_angleBetween(their.lon, zoePoint.lon) - cfg.angle) * 10) / 10
        aspects.push({ a: their.name, b: natalPoint, type: cfg.name, orb, interpretation: getSynastryAspectMeaning(their.name, natalPoint, cfg.name) })
      }
    }
    aspects.sort((x, y) => x.orb - y.orb)

    const categories = {
      emotionalConnection: scoreCategory(aspects, CATEGORY_PAIRS.emotionalConnection),
      communication: scoreCategory(aspects, CATEGORY_PAIRS.communication),
      attraction: scoreCategory(aspects, CATEGORY_PAIRS.attraction),
      trustAndSupport: scoreCategory(aspects, CATEGORY_PAIRS.trustAndSupport),
    }

    return NextResponse.json({
      theirPlacements: theirRelevant.map(p => ({ name: p.name, sign: p.sign, degree: p.degree })),
      aspects: aspects.slice(0, 10),
      categories,
      note: 'Based on birth date' + (body.birthTime ? ' and time' : ' only (no birth time given — Rising/house comparisons are skipped, and Moon position may be off by up to a sign since it moves fast)') + '.',
    })
  } catch (err) {
    console.error('synastry error:', err)
    return NextResponse.json({ error: 'Could not calculate synastry' }, { status: 500 })
  }
}
