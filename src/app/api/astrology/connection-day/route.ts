import { NextRequest, NextResponse } from 'next/server'
import { localBirthToUTC } from '@/lib/luna/birthTime'
import { OWNER_USER_ID } from '@/lib/owner'
import { callAI } from '@/lib/ai'
import {
  ZOE_NATAL, getCurrentPlanets, getTransitsToNatal, isRetrograde, plainAspectPhrase,
  SIGN_ENERGY_DESCRIPTIONS, type ZodiacSign,
} from '@/lib/astrology'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { ROMANTIC_ACCURACY_RULES, LIFE_LANGUAGE_RULES, KALEB_FACT, DECISIVE_GUIDANCE_RULES } from '@/lib/luna/voiceRules'
import { createClient } from '@/lib/supabase/server'
import { POINTS, hitsFor, rate, verdict } from '@/lib/luna/connectionSky'

export const dynamic = 'force-dynamic'

// "How do I navigate this person on this exact day": the planets' real positions
// that day, compared against THEIR chart and HERS, scored deterministically, then
// explained in plain language. The ratings come from real aspects, not the AI.

interface Body { knownMoonSign?: string; birthTimezone?: string; name: string; relationship: string; birthDate: string; birthTime?: string; day?: string; refresh?: boolean }

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

  const birth = localBirthToUTC(body.birthDate, body.birthTime, body.birthTimezone)
  if (isNaN(birth.getTime())) return NextResponse.json({ error: 'invalid birth date' }, { status: 400 })

  const theirNatalList = getCurrentPlanets(birth)
  const theirNatal: Record<string, { lon: number; sign: ZodiacSign; degree: number }> = {}
  for (const p of theirNatalList) theirNatal[p.name] = { lon: p.lon, sign: p.sign as ZodiacSign, degree: p.degree }

  const analyse = (when: Date) => {
    const planets = getCurrentPlanets(when)
    const retro = isRetrograde('Mercury', when)
    const h = [
      ...hitsFor(planets, theirNatal, 'theirs'),
      ...hitsFor(planets, ZOE_NATAL as unknown as Record<string, { lon: number }>, 'yours'),
    ].sort((a, b) => a.orb - b.orb)
    const r = rate(h, retro)
    return { planets, retro, hits: h, ratings: r, verdict: verdict(r) }
  }

  const today = analyse(at)
  const sky = today.planets
  const mercuryRetro = today.retro
  const hits = today.hits
  const ratings = today.ratings
  const v = today.verdict
  const moon = sky.find(p => p.name === 'Moon')

  // The best day in the next 7 for the deeper conversation: easy to talk, close-feeling,
  // and no space needed. Deterministic, so it never contradicts the ratings.
  const lvl: Record<string, number> = { great: 2, good: 1, neutral: 0, careful: -2 }
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(at.getTime() + i * 86_400_000)
    const a = analyse(d)
    const score = lvl[a.ratings.communication.level] * 1.2 + lvl[a.ratings.closeness.level] - (a.ratings.space.needsSpace ? 3 : 0)
    return {
      day: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(d),
      label: a.verdict.label, score,
    }
  })
  const bestDay = [...week].sort((a, b) => b.score - a.score)[0]

  // Their Moon moves ~13 degrees a day, so without a confirmed birth time it can
  // sit in the wrong sign. Say so instead of presenting it as certain.
  const tm = theirNatal.Moon
  const moonConfirmed = !!body.knownMoonSign && !!tm && tm.sign.toLowerCase() === body.knownMoonSign.toLowerCase()
  const moonMismatch = !!body.knownMoonSign && !!tm && !moonConfirmed
  const moonUncertain = !moonConfirmed && (moonMismatch || !body.birthTime || (tm && (tm.degree <= 3 || tm.degree >= 27)))

  const style = (p: string) => {
    const s = theirNatal[p]?.sign
    return s ? `${p} in ${s}: ${SIGN_ENERGY_DESCRIPTIONS[s] ?? ''}` : ''
  }
  const topLines = hits.slice(0, 8).map(h => `- ${h.transiting} is ${plainAspectPhrase(h.type)} ${h.chart === 'theirs' ? `${body.name}'s` : `Zoe's`} ${h.point} (${h.orb < 1.5 ? 'very strong' : h.orb < 3.5 ? 'noticeable' : 'subtle'})`).join('\n')
  const zoeTransits = getTransitsToNatal(at).slice(0, 3).map(t => `- ${t.transiting} ${plainAspectPhrase(t.type)} her ${t.natal}`).join('\n')

  const isKaleb = /kaleb/i.test(body.name)
  const cacheId = `${body.name}|${body.birthDate}|${body.birthTime ?? ''}|${body.birthTimezone ?? 'ny'}|${body.relationship}`.toLowerCase().replace(/[^a-z0-9|]/g, '').slice(0, 80)
  const { payload } = await getOrCreateDailyContent<Record<string, unknown>>({
    userId,
    generationType: `connection_day_v9_${cacheId}`,
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
- Next 7 days, calculated: ${week.map(w => `${w.day}: ${w.label}`).join('; ')}. Best day this week for a deeper conversation: ${bestDay.day}.
- Calculated ratings for today: communication = ${ratings.communication.level}; closeness = ${ratings.closeness.level}; space needed = ${ratings.space.needsSpace ? 'yes' : 'no'}. Overall: "${v.label}".

Return ONLY valid JSON:
{
  "best_move": { "decision": "exactly one of: reach_out, wait, give_space, be_close, keep_light", "headline": "ONE decisive sentence: the best move with ${body.name} today.", "when": "The best time of day to do it and why, or when to wait until.", "how": "How to do it in 1-2 sentences, concrete." },
  "feeling_today": "3-4 sentences describing what ${body.name} is most likely feeling today and underneath it (his need or fear), based on his placements, today's sky${isKaleb ? ', and the fact that he has said he is not ready for commitment' : ''}. Hedged: 'is likely', 'may', 'tends to'. Not certain, never mind-reading.",
  "feeling_clues": ["2-3 observable signs that would suggest he is feeling that way today (behaviors she can notice), phrased as possibilities"],
  "conversation_plan": ["4 short steps for how the conversation should go today, in order (for example: open warmly, say one true thing, ask one clear question, close kindly). Each step is one sentence."],
  "exact_words": [
    { "situation": "e.g. 'Your opening message or first line'", "say": "The exact words, first person, 1-3 sentences, calm and honest.", "why_it_works": "1-2 sentences: why these words work for him and for her, based on his placements and today's sky.", "if_he_responds": "1-2 sentences: what a warm response versus a distant or deflecting response could look like, and the next thing to say." },
    { "situation": "e.g. 'Saying what you feel and want'", "say": "Exact words.", "why_it_works": "Why.", "if_he_responds": "What to say next." },
    { "situation": "e.g. 'Asking where he stands, without pressure'", "say": "Exact words.", "why_it_works": "Why.", "if_he_responds": "What to say next." },
    { "situation": "e.g. 'If he pulls away or goes quiet'", "say": "Exact words.", "why_it_works": "Why.", "if_he_responds": "What to say next." },
    { "situation": "e.g. 'If he says he is not ready'", "say": "Exact words that stay honest and keep her dignity, without pressure.", "why_it_works": "Why.", "if_he_responds": "What to say next." }
  ],
  "healthy_outcome": "3-4 sentences: what a healthy outcome looks like between them, what to look for in his actions (not just words) over time, and the boundary she can keep for her own sake. Honest that commitment is one possible outcome and clarity or stepping back is another.",
  "deeper_talk": "1-2 sentences: today is or is not the day for a deeper conversation; if not, say that ${bestDay.day} is the best day this week for it and why, and what to do today instead.",
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
- This reading is for ${new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/New_York' }).format(at)} and that day IS today in this reading. Never write "tomorrow" or "yesterday", and never suggest saving something for that same weekday. Name other days by weekday only.
- Never state an invented event as fact (he "texts you", "says"). Scripts are for "if" situations.
- Only use the facts above. Do not invent events or what ${body.name} will do. Astrology describes tendencies, never certainties.
- Plain words an eighth grader understands. Short sentences. Translate every planet into what it feels like in a real conversation.
- Be useful and honest. If the day is tense, say so kindly and say what to do.
- Do not make the relationship romantic unless the relationship type above is Romantic or the name is Kaleb.${isKaleb ? `\n- ABOUT THIS PERSON: ${KALEB_FACT} Write about the real situation: a romantic connection that is not committed. Never predict commitment, and keep advice centred on Zoe's needs and honesty.` : ''}${LIFE_LANGUAGE_RULES}${ROMANTIC_ACCURACY_RULES}${DECISIVE_GUIDANCE_RULES}`
      try {
        const raw = await callAI('You are LUNA, Zoe\'s astrology guide. Warm, direct, honest. Return only valid JSON.', prompt, 6000)
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
    bestDay: { day: bestDay.day, label: bestDay.label },
    moonUncertain,
    moonConfirmed,
    mercuryRetrograde: mercuryRetro,
    connections: hits.slice(0, 6).map(h => ({
      text: `${h.transiting} is ${plainAspectPhrase(h.type)} ${h.chart === 'theirs' ? `${body.name}'s` : 'your'} ${h.point}`,
      strength: h.orb < 1.5 ? 'very strong' : h.orb < 3.5 ? 'noticeable' : 'subtle',
    })),
    reading: payload,
  })
}
