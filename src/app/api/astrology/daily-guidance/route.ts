import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getCurrentPlanets, getTransitsToNatal, ZOE_NATAL } from '@/lib/astrology'

// ─── Cache (per calendar day, 1-hour TTL) ────────────────────────────────────
const cache = new Map<string, { data: DailyGuidance; ts: number }>()

export interface DailyGuidance {
  horoscope:       string
  energy:          string
  do_today:        string[]
  dont_today:      string[]
  career:          string
  love:            string
  sex:             string
  money:           string
  friendship:      string
  family:          string
  self_reflection: string
  main_focus:      string
  highest_self:    string
  affirmation:     string
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const refresh   = searchParams.get('refresh') === '1'
    // Client passes its local timezone + time so the reading is accurate
    const clientTz  = searchParams.get('tz')    || 'America/New_York'
    const localTime = searchParams.get('time')  || ''   // e.g. "7:42 PM"
    const localDate = searchParams.get('date')  || ''   // e.g. "Sunday, June 22, 2025"

    const now    = new Date()
    // Use client's local date as cache key so the reading resets at midnight for Zoe, not at UTC midnight
    const dateKey = localDate
      ? localDate.replace(/[^a-zA-Z0-9]/g, '_')
      : new Intl.DateTimeFormat('en-US', { timeZone: clientTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

    // Serve from cache unless refresh requested or TTL expired (1 hr)
    if (!refresh) {
      const hit = cache.get(dateKey)
      if (hit && Date.now() - hit.ts < 60 * 60 * 1000) {
        return NextResponse.json(hit.data)
      }
    }

    // ── Build astronomical context ──────────────────────────────────────────
    const planets  = getCurrentPlanets(now)
    const transits = getTransitsToNatal(now).slice(0, 5)

    const planetLines = planets.map(p =>
      `${p.name}: ${p.sign} ${p.degree}°${p.minutes.toString().padStart(2,'0')}'${p.retrograde ? ' (retrograde)' : ''}`
    ).join('\n')

    const transitLines = transits.map(t =>
      `${t.transiting} ${t.type} natal ${t.natal} (${t.natalSign} ${t.natalDegree}°) — orb ${t.orb}° — ${t.interpretation}`
    ).join('\n')

    // Always use client's timezone for display so we don't tell Claude it's 2 AM when it's 10 PM
    const dateStr = localDate || new Intl.DateTimeFormat('en-US', {
      timeZone: clientTz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(now)
    const timeStr = localTime || new Intl.DateTimeFormat('en-US', {
      timeZone: clientTz, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
    }).format(now)

    // ── Prompt ─────────────────────────────────────────────────────────────
    const userPrompt = `Today is ${dateStr} at ${timeStr}.

=== CURRENT SKY ===
${planetLines}

=== ZOE'S TOP TRANSITS TODAY ===
${transitLines}

=== ZOE'S NATAL CHART ===
Sun: Scorpio 22° | Moon: Cancer 4° | Rising: Gemini 12°
Mercury: Scorpio 3° | Venus: Sagittarius 29° | Mars: Libra 6°
Jupiter: Gemini 7° | Saturn: Taurus 27° | North Node: Cancer 17°
Chiron: Sagittarius 15° | Midheaven: Virgo 12°

=== ZOE'S HUMAN DESIGN ===
Type: Self-Projected Projector
Profile: 4/6 — Opportunist / Role Model
- She gains clarity by speaking her truth out loud. She must speak to know what she thinks and feels.
- She must wait for the right invitations rather than initiating — hustle drains her, invitation energizes her.
- She is designed to guide others, not to grind or produce. She sees systems, potential, and the right path.
- Her 4th line means her opportunities come through her close inner network — not cold outreach, not strangers.
- Her 6th line means she is in a transition from experimenter (trying everything) to wisdom-keeper (becoming the role model she was born to be). She is becoming someone others look to for how to live.

=== ZOE'S PERSONALITY ===
- Scorpio Sun: depth, truth, transformation, magnetism. She wants to go deep in everything or not at all.
- Cancer Moon: emotionally cyclical, needs safety and softness, feels everything, deeply intuitive, protects the people she loves.
- Gemini Rising: communicative, curious, quick-minded, multi-faceted first impression. She connects instantly with words.
- She runs Ad-Vantage (media/advertising agency) and DRYP Digital (creative agency). Visionary entrepreneur.
- She does NOT like to type — she is voice-first and intuitive. She processes through speaking.
- She is deeply relational, spiritually aware, and results-driven but needs to follow her energy, not grind.

Generate a complete daily reading for Zoe. Return ONLY valid JSON — no markdown, no prose outside the JSON. The JSON must exactly match this schema:

{
  "horoscope": "3-sentence personalized daily horoscope. Reference current planets by plain descriptions (e.g. 'the Sun moving through Gemini'), reference Zoe's Scorpio Sun, Cancer Moon, and Gemini Rising naturally. No jargon as explanation — only as label if needed.",
  "energy": "1-2 sentences: what the day's energy FEELS like in her body and emotional field right now. Visceral, honest, specific.",
  "do_today": ["5 specific practical things she should actually do today — personal, actionable, grounded in her life and today's transits"],
  "dont_today": ["5 honest specific things to avoid today — real warnings, not generic cautions"],
  "career": "2-3 sentences for her career and business energy today. She runs Ad-Vantage + DRYP Digital. Specific to what the sky supports or challenges in her work.",
  "love": "2-3 sentences for her romantic and relationship energy today.",
  "sex": "2 sentences honest message about her sexual and desire energy today. Direct and real.",
  "money": "2-3 sentences for her financial energy and timing today.",
  "friendship": "2 sentences for her social and friend energy today.",
  "family": "2 sentences for the family field today.",
  "self_reflection": "One deep, penetrating question for her to sit with today. Her Scorpio Mercury loves depth — make it cut through surface to truth.",
  "main_focus": "1 sentence: the single most important thing to put her energy toward today.",
  "highest_self": "3-4 sentences connecting her Human Design (Self-Projected Projector, 4/6) with her birth chart to guide her toward her highest state today. Speak to her role-model 6th line transition, her need for invitation not initiation, her clarity-through-speaking. Ground it in today's sky.",
  "affirmation": "One powerful affirmation written in first person, specific to today's energy. Not generic — written as if she is declaring it from her Scorpio Sun depth."
}`

    // ── Call Claude ─────────────────────────────────────────────────────────
    const client = new Anthropic()

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens:  2000,
      system:     'You are LUNA, Zoe\'s personal astrology guide. Write in a warm, direct, honest voice. Never use textbook astrology jargon in descriptions — if you use a term (like "trine" or "retrograde"), it is only as a label/title, never as the explanation. Speak as if you deeply know this woman. Be specific, be real, be encouraging but honest. Make every word feel personally written for Zoe, not for a generic reader.',
      messages: [
        { role: 'user', content: userPrompt },
      ],
    })

    // ── Parse response ──────────────────────────────────────────────────────
    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : ''

    // Strip any accidental markdown fences
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    const guidance = JSON.parse(jsonText) as DailyGuidance

    // Validate that required fields exist
    const required: (keyof DailyGuidance)[] = [
      'horoscope','energy','do_today','dont_today','career','love',
      'sex','money','friendship','family','self_reflection','main_focus',
      'highest_self','affirmation',
    ]
    for (const field of required) {
      if (guidance[field] === undefined) {
        throw new Error(`Missing field in Claude response: ${field}`)
      }
    }

    // Store in cache
    cache.set(dateKey, { data: guidance, ts: Date.now() })

    return NextResponse.json(guidance)
  } catch (err) {
    console.error('[daily-guidance] error:', err)
    return NextResponse.json(
      { error: 'Could not generate daily guidance. Please try again.' },
      { status: 500 }
    )
  }
}
