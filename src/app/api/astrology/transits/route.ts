import { NextRequest, NextResponse } from 'next/server'
import { getTransitsToNatal, getCurrentPlanets, ZOE_NATAL, SIGN_KEYWORDS } from '@/lib/astrology'

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    const aspects = getTransitsToNatal(now)
    const current = getCurrentPlanets(now)

    // Group aspects by intensity
    const major = aspects.filter(a => a.type === 'conjunction' || a.type === 'opposition' || a.type === 'square')
    const supportive = aspects.filter(a => a.type === 'trine' || a.type === 'sextile')

    // Build daily theme from tightest aspect
    const tightest = aspects[0]
    let dailyTheme = 'An open energetic day with no dominant planetary pressure.'
    if (tightest) {
      const verbMap: Record<string, string> = {
        conjunction: 'intensely activates',
        square:      'challenges',
        opposition:  'illuminates the tension in',
        trine:       'flows beautifully through',
        sextile:     'gently supports',
      }
      const verb = verbMap[tightest.type] ?? 'connects to'
      dailyTheme = `Transiting ${tightest.transiting} in ${tightest.transitSign} ${verb} your natal ${tightest.natal} in ${tightest.natalSign}. ${tightest.interpretation}`
    }

    // Moon's current house (approximate based on natal rising)
    const moonPlanet = current.find(p => p.name === 'Moon')
    let moonHouse = null
    if (moonPlanet) {
      const risingLon = ZOE_NATAL.Rising.lon
      const moonLon = moonPlanet.lon
      const diff = ((moonLon - risingLon) + 360) % 360
      moonHouse = Math.floor(diff / 30) + 1
    }

    return NextResponse.json({
      aspects,
      major_aspects: major,
      supportive_aspects: supportive,
      daily_theme: dailyTheme,
      moon_house: moonHouse,
      moon_house_meaning: moonHouse ? HOUSE_MEANINGS[moonHouse] : null,
      active_natal_points: [...new Set(aspects.map(a => a.natal))],
      calculated_at: now.toISOString(),
    })
  } catch (err) {
    console.error('transits route error:', err)
    return NextResponse.json({ error: 'Transit calculation error' }, { status: 500 })
  }
}

const HOUSE_MEANINGS: Record<number, string> = {
  1:  'Self, identity, first impressions — how you show up today',
  2:  'Money, values, resources, self-worth — what you build with',
  3:  'Communication, ideas, short trips, siblings — how you think and speak',
  4:  'Home, roots, family, emotional foundation — where you feel safe',
  5:  'Creativity, romance, play, self-expression — where your heart leads',
  6:  'Health, work, routines, service — how you show up every day',
  7:  'Relationships, partnerships, contracts, mirrors — what others show you',
  8:  'Transformation, shared resources, depth, sex, death — what changes you',
  9:  'Travel, philosophy, higher learning, expansion, beliefs — what frees you',
  10: 'Career, public image, legacy, authority — how the world sees your work',
  11: 'Community, friends, dreams, innovation, collective — who sees your vision',
  12: 'Spirituality, hidden matters, solitude, dreams, undoing — what dissolves you',
}
