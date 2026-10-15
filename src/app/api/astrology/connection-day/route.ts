import { NextRequest, NextResponse } from 'next/server'
import { OWNER_USER_ID } from '@/lib/owner'
import { callAI } from '@/lib/ai'
import {
  ZOE_NATAL, angleBetween, getAspect, getCurrentPlanets, getTransitsToNatal, isRetrograde, plainAspectPhrase,
  SIGN_ENERGY_DESCRIPTIONS, type ZodiacSign,
} from '@/lib/astrology'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { ROMANTIC_ACCURACY_RULES, LIFE_LANGUAGE_RULES, KALEB_FACT, DECISIVE_GUIDANCE_RULES } from '@/lib/luna/voiceRules'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// "How do I navigate this person on this exact day": the planets' real positions
// that day, compared against THEIR chart and HERS, scored deterministically, then
// explained in plain language. The ratings come from real aspects, not the AI.

interface Body { name: string; relationship: string; birthDate: string; birthTime?: string; day?: string; refresh?: boolean }
type Level = 'great' | 'good' | 'neutral' | 'careful'

const POINTS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Saturn']
const TRANSITING = ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Saturn']
const HARD = ['square', 'opposition']
const SOFT = ['trine', 'sextile']

interface Hit { transiting: string; point: string; type: string; orb: number; chart: 'theirs' | 'yours' }

function hitsFor(planets: { name: string; lon: number }[], natal: Record<string, { lon: number }>, chart: 'theirs' | 'yours'): Hit[] {
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

function level(score: number): Level {
  return score >= 2 ? 'great' : score >= 0.8 ? 'good' : score <= -0.8 ? 'careful' : 'neutral'
}

function rate(hits: Hit[], mercuryRetro: boolean) {
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

function verdict(r: ReturnType<typeof rate>): { label: string; key: string } {
  if (r.space.level === 'careful') return { label: 'Give space today', key: 'space' }
  if (r.communication.level === 'careful') return { label: 'Keep it light and simple', key: 'light' }
  if (r.closeness.level === 'great') return { label: 'A good day to get close', key: 'close' }
  if (r.communication.level === 'great' || r.communication.level === 'good') return { label: 'A good day to talk', key: 'talk' }
  return { label: 'A steady, low-key day', key: 'steady' }
}

export async function POST(req: NextRequest) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }) }
  if (!body.name || !body.birthDate) return NextResponse.json({ error: 'name and birthDate required' }, { status: 400 })

  let userId = OWNER_USER_ID
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) userId = user.id
  } catch { /* single-owner fallback */ }

  const dayKey = body.day && /^\d{4}-\d{2}-\d{2}$/.test(body.day)
    ? body.day
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const at = new Date(`${dayKey}T16:00:00Z`)

  const birth = new Date(`${body.birthDate}T${body.birthTime || '12:00'}:00Z`)
  if (isNaN(birth.getTime())) return NextResponse.json({ error: 'invalid birth date' }, { status: 400 })

  const theirNatalList = getCurrentPlanets(birth)
  const theirNatal: Record<string, { lon: number; sign: ZodiacSign; degree: number }> = {}
  for (const p of theirNatalList) theirNatal[p.name] = { lon: p.lon, sign: p.sign as ZodiacSign, degree: p.degree }

  const sky = getCurrentPlanets(at)
  const mercuryRetro = isRetrograde('Mercury', at)
  const hits = [
    ...hitsFor(sky, theirNatal, 'theirs'),
    ...hitsFor(sky, ZOE_NATAL as unknown as Record<string, { lon: number }>, 'yours'),
  ].sort((a, b) => a.orb - b.orb)
  const ratings = rate(hits, mercuryRetro)
  const v = verdict(ratings)
  const moon = sky.find(p => p.name === 'Moon')

  // Their Moon moves ~13 degrees a day, so without a confirmed birth time it can
  // sit in the wrong sign. Say so instead of presenting it as certain.
  const tm = theirNatal.Moon
  const moonUncertain = !body.birthTime || (tm && (tm.degree <= 3 || tm.degree >= 27))

  const style = (p: string) => {
    const s = theirNatal[p]?.sign
    return s ? `${p} in ${s}: ${SIGN_ENERGY_DESCRIPTIONS[s] ?? ''}` : ''
  }
  const topLines = hits.slice(0, 8).map(h => `- ${h.transiting} is ${plainAspectPhrase(h.type)} ${h.chart === 'theirs' ? `${body.name}'s` : `Zoe's`} ${h.point} (${h.orb < 1.5 ? 'very strong' : h.orb < 3.5 ? 'noticeable' : 'subtle'})`).join('\n')
  const zoeTransits = getTransitsToNatal(at).slice(0, 3).map(t => `- ${t.transiting} ${plainAspectPhrase(t.type)} her ${t.natal}`).join('\n')

  const isKaleb = /kaleb/i.test(body.name)
  const cacheId = `${body.name}|${body.birthDate}|${body.birthTime ?? ''}|${body.relationship}`.toLowerCase().replace(/[^a-z0-9|]/g, '').slice(0, 80)
  const { payload } = await getOrCreateDailyContent<Record<string, unknown>>({
    userId,
    generationType: `connection_day_v3_${cacheId}`,
    dateKey: dayKey,
    forceRegenerate: !!body.refresh,
    generate: async () => {
      const prompt = `Write a "how to navigate ${body.name} today" reading for Zoe for ${dayKey}.
Relationship: ${body.relationship}.

REAL FACTS (calculated, do not contradict):
- ${body.name}'s placements: ${POINTS.map(p => theirNatal[p] ? `${p} ${theirNatal[p].sign}` : '').filter(Boolean).join(', ')}${moonUncertain ? ' (their Moon sign is uncertain without a confirmed birth time, treat it as a possibility)' : ''}
- How ${body.name} tends to come across:
${['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].map(style).filter(Boolean).map(l => '  ' + l).join('\n')}
- Today's Moon: ${moon ? `${moon.sign} ${moon.degree}°` : 'unknown'}${mercuryRetro ? '. Mercury is moving backward today.' : ''}
- Strongest sky-to-chart connections today:
${topLines || '- Nothing strong today'}
- Zoe's strongest personal transits today:
${zoeTransits}
- Calculated ratings for today: communication = ${ratings.communication.level}; closeness = ${ratings.closeness.level}; space needed = ${ratings.space.needsSpace ? 'yes' : 'no'}. Overall: "${v.label}".

Return ONLY valid JSON:
{
  "best_move": { "decision": "exactly one of: reach_out, wait, give_space, be_close, keep_light", "headline": "ONE decisive sentence: the best move with ${body.name} today.", "when": "The best time of day to do it and why, or when to wait until.", "how": "How to do it in 1-2 sentences, concrete." },
  "summary": "3-4 short sentences in plain words: what kind of day this is between Zoe and ${body.name}, and the single best move.",
  "communication": "2-3 sentences: should she reach out or wait, how, and what kind of conversation works today. Explain why using the facts above.",
  "closeness": "2-3 sentences: is today good for being close or doing something together, and what that should look like.",
  "space": "2-3 sentences: whether to give space today, and what giving space looks like without being cold.",
  "how_they_may_feel": "2-3 sentences: how ${body.name} is likely to feel and respond today based on their placements and the sky. Use words like 'may' and 'tends to', never certainty.",
  "how_to_approach": ["3 specific things to do when dealing with ${body.name} today"],
  "what_to_say": ["2 short things she could actually say, in quotes"],
  "avoid": ["2 specific things not to do or say today"],
  "if_it_goes_sideways": "1-2 sentences: what to do if the interaction gets tense."
}

RULES:
- Only use the facts above. Do not invent events or what ${body.name} will do. Astrology describes tendencies, never certainties.
- Plain words an eighth grader understands. Short sentences. Translate every planet into what it feels like in a real conversation.
- Be useful and honest. If the day is tense, say so kindly and say what to do.
- Do not make the relationship romantic unless the relationship type above is Romantic or the name is Kaleb.${isKaleb ? `\n- ABOUT THIS PERSON: ${KALEB_FACT} Write about the real situation: a romantic connection that is not committed. Never predict commitment, and keep advice centred on Zoe's needs and honesty.` : ''}${LIFE_LANGUAGE_RULES}${ROMANTIC_ACCURACY_RULES}${DECISIVE_GUIDANCE_RULES}`
      try {
        const raw = await callAI('You are LUNA, Zoe\'s astrology guide. Warm, direct, honest. Return only valid JSON.', prompt, 2500)
        const json = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim())
        return { payload: json as Record<string, unknown>, source: 'ai' as const }
      } catch (e) {
        console.error('[connection-day] AI failed, returning calculated ratings only:', e instanceof Error ? e.message : e)
        return { payload: { summary: `${v.label}. These ratings are calculated from the real sky for today.` }, source: 'fallback' as const }
      }
    },
  })

  return NextResponse.json({
    day: dayKey,
    verdict: v,
    ratings,
    moonUncertain,
    mercuryRetrograde: mercuryRetro,
    connections: hits.slice(0, 6).map(h => ({
      text: `${h.transiting} is ${plainAspectPhrase(h.type)} ${h.chart === 'theirs' ? `${body.name}'s` : 'your'} ${h.point}`,
      strength: h.orb < 1.5 ? 'very strong' : h.orb < 3.5 ? 'noticeable' : 'subtle',
    })),
    reading: payload,
  })
}
