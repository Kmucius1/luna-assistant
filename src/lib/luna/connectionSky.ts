// Shared, deterministic sky-to-chart scoring for the Connections readings. No AI here:
// every rating comes from real planet positions compared against two charts.

import { angleBetween, getAspect, plainAspectPhrase } from '@/lib/astrology'

export type Level = 'great' | 'good' | 'neutral' | 'careful'

export const POINTS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Saturn']
const TRANSITING = ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Saturn']
const HARD = ['square', 'opposition']
const SOFT = ['trine', 'sextile']

export interface Hit { transiting: string; point: string; type: string; orb: number; chart: 'theirs' | 'yours' }

export function hitsFor(planets: { name: string; lon: number }[], natal: Record<string, { lon: number }>, chart: 'theirs' | 'yours'): Hit[] {
  const out: Hit[] = []
  for (const tp of planets.filter(p => TRANSITING.includes(p.name))) {
    for (const pt of POINTS) {
      const n = natal[pt]
      if (!n) continue
      const cfg = getAspect(tp.lon, n.lon)
      if (!cfg) continue
      out.push({ transiting: tp.name, point: pt, type: cfg.name, orb: Math.round(Math.abs(angleBetween(tp.lon, n.lon) - cfg.angle) * 10) / 10, chart })
    }
  }
  return out
}

export function level(score: number): Level {
  return score >= 2 ? 'great' : score >= 0.8 ? 'good' : score <= -0.8 ? 'careful' : 'neutral'
}

export function rate(hits: Hit[], mercuryRetro: boolean) {
  let comm = 0, close = 0, tension = 0
  const why = { communication: [] as string[], closeness: [] as string[], space: [] as string[] }
  const phrase = (h: Hit) => `${h.transiting} ${plainAspectPhrase(h.type)} ${h.chart === 'theirs' ? 'their' : 'your'} ${h.point}`
  const weight = (h: Hit) => (h.orb <= 1.5 ? 1 : h.orb <= 3.5 ? 0.7 : 0.4)

  if (mercuryRetro) { comm -= 1.5; why.communication.push('Mercury is moving backward, so messages are easier to misread and plans change') }
  for (const h of hits) {
    const w = weight(h)
    const soft = SOFT.includes(h.type), hard = HARD.includes(h.type), conj = h.type === 'conjunction'
    if (h.transiting === 'Mercury' || (h.transiting === 'Moon' && ['Mercury', 'Sun'].includes(h.point))) {
      const d = soft ? w * 1.2 : hard ? -w : conj ? w * 0.5 : 0
      comm += d; if (d !== 0) why.communication.push(phrase(h))
    }
    if (h.transiting === 'Venus' || (h.transiting === 'Moon' && ['Venus', 'Moon'].includes(h.point))) {
      const d = soft ? w * 1.5 : hard ? -w : conj ? w : 0
      close += d; if (d !== 0) why.closeness.push(phrase(h))
    }
    if ((h.transiting === 'Mars' || h.transiting === 'Saturn') && ['Sun', 'Moon'].includes(h.point) && (hard || conj)) {
      tension += w; why.space.push(phrase(h))
    }
  }
  const space = (tension >= 2 ? 'careful' : tension >= 1 ? 'neutral' : 'good') as Level
  return {
    communication: { level: level(comm), why: why.communication.slice(0, 3) },
    closeness: { level: level(close), why: why.closeness.slice(0, 3) },
    // For "space" the label means: how much space the day calls for.
    space: { level: space, needsSpace: tension >= 1, why: why.space.slice(0, 3) },
  }
}

export function verdict(r: ReturnType<typeof rate>): { label: string; key: string } {
  if (r.space.level === 'careful') return { label: 'Give space today', key: 'space' }
  if (r.communication.level === 'careful') return { label: 'Keep it light and simple', key: 'light' }
  if (r.closeness.level === 'great') return { label: 'A good day to get close', key: 'close' }
  if (r.communication.level === 'great' || r.communication.level === 'good') return { label: 'A good day to talk', key: 'talk' }
  return { label: 'A steady, low-key day', key: 'steady' }
}

