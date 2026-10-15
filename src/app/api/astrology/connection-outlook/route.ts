import { NextRequest, NextResponse } from 'next/server'
import { ZOE_NATAL, getCurrentPlanets, isRetrograde, plainAspectPhrase, type ZodiacSign } from '@/lib/astrology'
import { hitsFor, rate, verdict, type Hit } from '@/lib/luna/connectionSky'

export const dynamic = 'force-dynamic'

// The next ~30 days for one person: which days the sky favours closeness and easy
// talk, and which days call for care. Fully calculated, no AI, so it is fast and
// never contradicts the daily readings (they use the same scoring).

interface Body { name: string; birthDate: string; birthTime?: string; days?: number }

const LVL: Record<string, number> = { great: 2, good: 1, neutral: 0, careful: -2 }

function why(h: Hit, name: string): string {
  const owner = h.chart === 'theirs' ? `${name}'s` : 'your'
  return `${h.transiting} ${plainAspectPhrase(h.type)} ${owner} ${h.point}`
}

export async function POST(req: NextRequest) {
  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }) }
  if (!body.name || !body.birthDate) return NextResponse.json({ error: 'name and birthDate required' }, { status: 400 })

  const birth = new Date(`${body.birthDate}T${body.birthTime || '12:00'}:00Z`)
  if (isNaN(birth.getTime())) return NextResponse.json({ error: 'invalid birth date' }, { status: 400 })

  const theirNatal: Record<string, { lon: number; sign: ZodiacSign }> = {}
  for (const p of getCurrentPlanets(birth)) theirNatal[p.name] = { lon: p.lon, sign: p.sign as ZodiacSign }

  const horizon = Math.min(Math.max(body.days ?? 30, 7), 45)
  const start = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T16:00:00Z`)

  const days = Array.from({ length: horizon }, (_, i) => {
    const at = new Date(start.getTime() + i * 86_400_000)
    const planets = getCurrentPlanets(at)
    const retro = isRetrograde('Mercury', at)
    const hits = [
      ...hitsFor(planets, theirNatal, 'theirs'),
      ...hitsFor(planets, ZOE_NATAL as unknown as Record<string, { lon: number }>, 'yours'),
    ].sort((a, b) => a.orb - b.orb)
    const r = rate(hits, retro)
    const score = LVL[r.closeness.level] * 1.3 + LVL[r.communication.level] - (r.space.needsSpace ? 3 : 0) - (retro ? 0.5 : 0)
    return {
      iso: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at),
      label: new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(at),
      verdict: verdict(r).label,
      verdictKey: verdict(r).key,
      closeness: r.closeness.level,
      communication: r.communication.level,
      needsSpace: r.space.needsSpace,
      mercuryRetrograde: retro,
      score: Math.round(score * 10) / 10,
      reasons: [...r.closeness.why, ...r.communication.why].slice(0, 3),
      cautions: r.space.why.slice(0, 2),
      topSky: hits.slice(0, 2).map(h => why(h, body.name)),
    }
  })

  // Only call a day "closer" if it truly scores well; do not pad the list.
  const closer = days.filter(d => d.score >= 2 && !d.needsSpace).sort((a, b) => b.score - a.score).slice(0, 5)
    .sort((a, b) => a.iso.localeCompare(b.iso))
  const careful = days.filter(d => d.needsSpace || d.communication === 'careful').sort((a, b) => a.score - b.score).slice(0, 4)
    .sort((a, b) => a.iso.localeCompare(b.iso))

  const moonDeg = theirNatal.Moon ? theirNatal.Moon.lon % 30 : 15
  const moonUncertain = !body.birthTime || moonDeg <= 3 || moonDeg >= 27

  return NextResponse.json({
    name: body.name,
    horizon,
    closer,
    careful,
    days: days.map(d => ({ iso: d.iso, label: d.label, verdict: d.verdict, score: d.score })),
    moonUncertain,
    lookFor: {
      closer: [
        `${body.name} reaching out first, or replying faster and with more than one word`,
        'Conversation that flows without you carrying it',
        'Him making a specific plan with a day and a time, not "sometime"',
        'Him asking about your life and remembering what you said',
        'Warmth that matches in person what it is in text',
      ],
      careful: [
        'Short or slow replies that are about the day, not about you',
        'Him going quiet or pulling back for a bit; one quiet day is not a verdict',
        'Sharper tone or defensiveness if the topic is commitment',
        'Your own urge to chase or over-explain; that is your signal to pause',
      ],
      always: [
        'Actions over words: does what he does match what he says over several days?',
        'Whether warmth on a good day turns into clarity, or stays vague',
        'How you feel after you spend time together: steady and respected, or anxious and waiting',
      ],
    },
    note: 'These are days the sky favours closeness and easy conversation, based on real planet positions against both charts. They are tendencies, not predictions of what he will do or decide. A good-sky day does not mean he is ready for commitment.',
  })
}
