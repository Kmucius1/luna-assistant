import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { getCurrentPlanets, getTransitsToNatal, SIGN_ENERGY_DESCRIPTIONS, plainAspectPhrase, type PlanetPosition, type TransitAspect } from '@/lib/astrology'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { LIFE_LANGUAGE_RULES } from '@/lib/luna/voiceRules'
import { createClient } from '@/lib/supabase/server'
import { moonSignChangeNote } from '@/lib/luna/moonChange'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

// ─── Transit-based fallback (works with no AI credits) ────────────────────────
const SIGN_BODY = SIGN_ENERGY_DESCRIPTIONS
function buildFallback(planets: PlanetPosition[], transits: TransitAspect[], dateStr: string, _timeStr: string): DailyGuidance {
  const sun   = planets.find(p => p.name === 'Sun')
  const moon  = planets.find(p => p.name === 'Moon')
  const venus = planets.find(p => p.name === 'Venus')
  const mars  = planets.find(p => p.name === 'Mars')
  const top   = transits.slice(0, 3)
  const loveT = transits.find(t => ['Venus','Mars','Moon','NNode'].includes(t.natal))
  const careerT = transits.find(t => ['Sun','Saturn','Midheaven','Jupiter'].includes(t.natal))
  const hardT = transits.find(t => ['square','opposition'].includes(t.type))
  const softT = transits.find(t => ['trine','sextile'].includes(t.type))
  return {
    horoscope: `${dateStr} brings ${moon ? `the Moon through ${moon.sign} — ${SIGN_BODY[moon.sign] ?? 'shifting emotional energy'}` : 'a day of movement and awareness'}. Your Scorpio Sun and Gemini Rising are engaged with ${top.length > 0 ? `${top[0].transiting} ${plainAspectPhrase(top[0].type)} your ${top[0].natal} — ${top[0].interpretation}` : 'the current sky'}. ${top[1] ? `On top of that, ${top[1].transiting} is also ${plainAspectPhrase(top[1].type)} your ${top[1].natal}: ${top[1].interpretation}` : 'Trust your instincts and let energy flow where it naturally wants to go.'}`,
    energy: `${moon ? `The Moon in ${moon.sign} gives today a ${SIGN_BODY[moon.sign] ?? 'distinctive'} quality` : 'Your emotional field is active today'}. ${hardT ? `There is some tension — ${hardT.transiting} is ${plainAspectPhrase(hardT.type)} your ${hardT.natal} — ${hardT.interpretation}` : softT ? `There is ease — ${softT.transiting} is ${plainAspectPhrase(softT.type)} your ${softT.natal} — ${softT.interpretation}` : 'The overall energy is open and workable.'}`,
    do_today: [
      top[0] ? `Pay attention to your ${top[0].natal} area — ${top[0].interpretation}` : 'Trust your first instincts today',
      moon  ? `Moon in ${moon.sign}: ${moon.sign === 'Cancer' ? 'reach out to someone you care about' : moon.sign === 'Scorpio' ? 'go deep on one important thing' : moon.sign === 'Gemini' ? 'have the conversation you have been putting off' : 'work with the day\'s natural energy'}` : 'Stay present with what is happening',
      venus ? `Venus in ${venus.sign}: ${venus.sign === 'Gemini' ? 'express something creative or beautiful' : venus.sign === 'Cancer' ? 'nourish a relationship or yourself' : 'let beauty and pleasure have space today'}` : 'Make space for what you find beautiful',
      'As a Self-Projected Projector: if something feels forced or heavy, it is a sign to pause — not push harder',
      careerT ? `Career: ${careerT.interpretation}` : 'Put focused energy into one meaningful project rather than spreading thin',
    ],
    dont_today: [
      hardT ? `Avoid escalating the tension around ${hardT.natal} — ${hardT.interpretation}. Give it space to resolve.` : 'Do not force anything that is not flowing naturally',
      'Do not initiate from depletion — your Projector aura only magnetizes when you are genuinely energized',
      'Do not suppress what your Cancer Moon is feeling — it needs acknowledgment, not override',
      mars ? `Watch Mars in ${mars.sign} — avoid ${mars.sign === 'Libra' ? 'over-accommodating or being a doormat to keep peace' : 'reactive or impulsive action'}` : 'Do not act from frustration or urgency today',
      'Do not compare your pace to others — your design is a different rhythm, not a slower one',
    ],
    career: `${careerT ? `The sky is activating your ${careerT.natal} — ${careerT.interpretation}` : `${sun ? `The Sun in ${sun.sign} supports ${SIGN_BODY[sun.sign] ?? 'focused work'}` : 'Focus and intention are your tools today'}`}. For Ad-Vantage and DRYP Digital: ${moon?.sign === 'Gemini' || moon?.sign === 'Aquarius' ? 'communication, pitches, and client relationships are highlighted' : moon?.sign === 'Cancer' ? 'nurturing existing relationships yields more than cold outreach' : moon?.sign === 'Scorpio' ? 'deep strategic work and research are supported' : 'bring full presence to whatever needs your attention most'}. Your 4/6 Projector design means the right opportunities arrive through your existing network — no need to cold outreach today.`,
    love: loveT ? `${loveT.transiting} is ${plainAspectPhrase(loveT.type)} your ${loveT.natal} — ${loveT.interpretation}. Your Venus loves big and needs connection that feels open and honest today. ${venus ? `Venus is currently in ${venus.sign}, which adds ${SIGN_BODY[venus.sign] ?? 'nuance'} to your magnetism.` : ''}` : `Your love energy is steady today. You're always seeking honest, adventurous connection — anything that feels constricting is a signal, not something to work harder at. ${moon?.sign === 'Cancer' ? 'Your Cancer Moon is emotionally open today — let yourself be vulnerable.' : ''}`,
    sex: `${mars ? `Mars in ${mars.sign} — your desire energy is ${mars.sign === 'Libra' ? 'harmoniously oriented; you are drawn toward beauty and mutuality' : mars.sign === 'Scorpio' ? 'intensely magnetic today' : 'active and present today'}.` : 'Your desire energy is present and workable today.'} Your Scorpio Sun brings depth and magnetism to physical connection — authenticity and real presence turn you on more than performance.`,
    money: `${transits.find(t => t.natal === 'Saturn') ? `Saturn transit active: ${transits.find(t => t.natal === 'Saturn')!.interpretation}` : 'Financial energy is stable and workable today.'}. Your Saturn in Taurus 27° is built for slow, sustainable wealth — resist any pressure to make quick decisions about money. ${sun?.sign === 'Gemini' ? 'Conversations about money or new ideas could be valuable today.' : 'Focus on the fundamentals of what you are already building.'}`,
    friendship: `${moon?.sign === 'Gemini' || moon?.sign === 'Aquarius' ? 'Social energy is high and light today — great for connection and fun.' : moon?.sign === 'Cancer' ? 'You are in a feeling-forward space — reach out to someone who truly knows you.' : 'Your close-network 4th line means meaningful connection happens with people already in your life.'}. Your Gemini Rising makes you naturally magnetic in social settings — people enjoy your company and mental energy.`,
    family: `${moon?.sign === 'Cancer' ? 'The Cancer Moon heightens your emotional sensitivity around family — check in with someone you love today.' : 'Family field is background energy today.'}. Your Cancer Moon means family connections are never truly out of mind — even a small gesture of care can be meaningful.`,
    self_reflection: top[0] ? `${top[0].transiting} is ${plainAspectPhrase(top[0].type)} your ${top[0].natal} today — what is the part of yourself that you keep avoiding looking at directly, and what would it mean to stop turning away?` : `Your Scorpio Mercury wants depth — where in your life are you accepting a surface answer when the real truth is something more uncomfortable and more true?`,
    main_focus: top[0] ? top[0].interpretation : `Honor your natural energy rhythm today — do what is genuinely energizing, rest when it is not, and trust that this IS the work.`,
    highest_self: `Your 6th line is in its transition from experimenter to role model — you are becoming the person others look to for how to actually live. ${top[0] ? `Today, ${top[0].transiting} ${plainAspectPhrase(top[0].type)} your ${top[0].natal} is part of that becoming — it is showing you something about your ${top[0].natal}.` : 'Today is about living your truth visibly, even in small ways.'} As a Self-Projected Projector, your clarity comes from speaking — speak your truth today, even just to yourself. Wait for genuine invitations rather than initiating from pressure, and trust that the right recognition is already on its way.`,
    affirmation: `I move through this day in full alignment with who I am becoming. My pace is perfect. My energy is magnetic. What is truly mine will arrive.`,
  }
}

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

    const userId = await resolveUserId()

    // ── Build astronomical context ──────────────────────────────────────────
    const planets  = getCurrentPlanets(now)
    const transits = getTransitsToNatal(now).slice(0, 5)

    const moonChange = moonSignChangeNote(now, clientTz)
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
${planetLines}${moonChange}

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
  "horoscope": "5-6 sentence personalized daily horoscope — the main thing she reads. Reference current planets and transits by name, but every single one must be immediately translated into what it actually looks or feels like in her real day: a kind of conversation, a mood, a tension, a decision, a physical feeling. Never leave a planet/sign/aspect standing alone as just a label — see the PLAIN-ENGLISH LIFE RULE below.",
  "energy": "1-2 sentences: what the day's energy FEELS like in her body and emotional field right now. Visceral, honest, specific.",
  "do_today": ["5 specific practical things she should actually do today — personal, actionable, grounded in her life and today's transits. If you reference a placement (like her North Node or a house), explain in plain words what to actually pay attention to — never just name the placement and stop there."],
  "dont_today": ["5 honest specific things to avoid today — real warnings, not generic cautions, translated into real situations not just placements"],
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
}${LIFE_LANGUAGE_RULES}`

    // ── Generate (or serve from the real Supabase daily cache) ──────────────
    const { payload: guidance } = await getOrCreateDailyContent<DailyGuidance>({
      userId,
      generationType: 'daily_guidance',
      timezone: clientTz,
      dateKey,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const SYSTEM = 'You are LUNA, Zoe\'s personal astrology guide. Write in a warm, direct, honest voice. Never leave a planet, sign, house, or aspect standing alone as just a label — always translate it into what it actually looks or feels like in her real day (a conversation, a mood, a decision, a tension, a physical feeling). Speak as if you deeply know this woman. Be specific, be real, be encouraging but honest. Make every word feel personally written for Zoe, not for a generic reader. Return ONLY valid JSON — no markdown fences, no prose outside the JSON.'

          const rawText = await callAI(SYSTEM, userPrompt, 2000)
          const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
          const parsed = JSON.parse(jsonText) as DailyGuidance

          const required: (keyof DailyGuidance)[] = [
            'horoscope','energy','do_today','dont_today','career','love',
            'sex','money','friendship','family','self_reflection','main_focus',
            'highest_self','affirmation',
          ]
          for (const field of required) {
            if (parsed[field] === undefined) {
              throw new Error(`Missing field in AI response: ${field}`)
            }
          }
          return { payload: parsed, source: 'ai' as const }
        } catch {
          // AI unavailable — use transit-based fallback (always accurate, no AI needed)
          return { payload: buildFallback(planets, transits, dateStr, timeStr), source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(guidance)
  } catch (err) {
    console.error('[daily-guidance] error:', err)
    return NextResponse.json(
      { error: 'Could not generate daily guidance. Please try again.' },
      { status: 500 }
    )
  }
}
