import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { getCurrentPlanets, getTransitsToNatal, SIGN_ENERGY_DESCRIPTIONS, plainAspectPhrase, type PlanetPosition, type TransitAspect } from '@/lib/astrology'
import { realLifeBlock } from '@/lib/luna/realLife'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { LIFE_LANGUAGE_RULES, ROMANTIC_ACCURACY_RULES, DECISIVE_GUIDANCE_RULES } from '@/lib/luna/voiceRules'
import { createClient } from '@/lib/supabase/server'
import { moonSignChangeNote } from '@/lib/luna/moonChange'

const ZOE_USER_ID = OWNER_USER_ID

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

// A real first-person line for every Moon sign, so the fallback affirmation
// changes whenever the Moon does (every ~2.5 days) instead of ever repeating
// the exact same sentence — this is what she reads whenever the AI call
// below fails, so it can never be allowed to be a single fixed string again.
const AFFIRMATION_BY_MOON_SIGN: Record<string, string> = {
  Aries: 'I trust the fire in me to move first and figure the rest out as I go.',
  Taurus: 'I build slowly and steadily, and that steadiness is its own kind of power.',
  Gemini: 'I follow my curiosity today and trust it to lead somewhere real.',
  Cancer: 'I let myself feel everything today without needing to fix it right away.',
  Leo: 'I let myself be seen today, exactly as I am.',
  Virgo: 'I do one thing well today instead of everything halfway.',
  Libra: 'I choose connection today, and I let it be easy.',
  Scorpio: 'I go deep instead of staying on the surface today.',
  Sagittarius: 'I say yes to what actually excites me today.',
  Capricorn: 'I keep building, one honest step at a time.',
  Aquarius: 'I trust my own way of doing things today, even if it looks different.',
  Pisces: 'I let my intuition lead today, even when I cannot explain why.',
}

// A short second line reflecting whether today's strongest real transit is
// easy or tense — so the affirmation also shifts with the day's actual sky,
// not just the Moon sign.
function affirmationTransitClause(transits: TransitAspect[]): string {
  const top = transits[0]
  if (!top) return 'Today has room to breathe, and so do I.'
  if (top.type === 'trine' || top.type === 'sextile') return 'Today is on my side, and I can feel it.'
  if (top.type === 'square' || top.type === 'opposition') return "Today asks more of me than usual, and I am steady enough to meet it."
  return 'Today is intense, and I am ready for it.'
}

function buildFallbackAffirmation(moon: PlanetPosition | undefined, transits: TransitAspect[]): string {
  const moonLine = moon ? (AFFIRMATION_BY_MOON_SIGN[moon.sign] ?? 'I move at the pace that is actually mine.') : 'I move at the pace that is actually mine.'
  return `${moonLine} ${affirmationTransitClause(transits)}`
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
    energy: `${moon ? `The Moon in ${moon.sign} gives today a ${SIGN_BODY[moon.sign] ?? 'distinctive'} quality` : 'Your emotional field is active today'}. ${hardT ? `There is some tension — ${hardT.transiting} is ${plainAspectPhrase(hardT.type)} your ${hardT.natal} — ${hardT.interpretation}` : softT ? `There is ease — ${softT.transiting} is ${plainAspectPhrase(softT.type)} your ${softT.natal} — ${softT.interpretation}` : 'The overall energy is open and workable.'} You may notice it more in your body than in your thoughts — a heaviness, a lightness, a restlessness — so check in physically before deciding how you feel about the day.`,
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
    career: `${careerT ? `The sky is activating your ${careerT.natal} — ${careerT.interpretation}` : `${sun ? `The Sun in ${sun.sign} supports ${SIGN_BODY[sun.sign] ?? 'focused work'}` : 'Focus and intention are your tools today'}`}. For DRYP Digital and your own creative work: ${moon?.sign === 'Gemini' || moon?.sign === 'Aquarius' ? 'communication, pitches, and client relationships are highlighted' : moon?.sign === 'Cancer' ? 'nurturing existing relationships yields more than cold outreach' : moon?.sign === 'Scorpio' ? 'deep strategic work and research are supported' : 'bring full presence to whatever needs your attention most'}. Your 4/6 Projector design means the right opportunities arrive through your existing network — no need to cold outreach today. ${top[1] && top[1].natal !== careerT?.natal ? `There's also something to notice around your ${top[1].natal} today — ${top[1].interpretation}` : 'One focused piece of work done well will matter more today than several things done halfway.'}`,
    love: loveT ? `${loveT.transiting} is ${plainAspectPhrase(loveT.type)} your ${loveT.natal} — ${loveT.interpretation}. Your Venus loves big and needs connection that feels open and honest today. ${venus ? `Venus is currently in ${venus.sign}, which adds ${SIGN_BODY[venus.sign] ?? 'nuance'} to your magnetism.` : ''}` : `Your love energy is steady today. You're always seeking honest, adventurous connection — anything that feels constricting is a signal, not something to work harder at. ${moon?.sign === 'Cancer' ? 'Your Cancer Moon is emotionally open today — let yourself be vulnerable.' : ''}`,
    sex: `${mars ? `Mars in ${mars.sign} — your desire energy is ${mars.sign === 'Libra' ? 'harmoniously oriented; you are drawn toward beauty and mutuality' : mars.sign === 'Scorpio' ? 'intensely magnetic today' : 'active and present today'}.` : 'Your desire energy is present and workable today.'} Your Scorpio Sun brings depth and magnetism to physical connection — authenticity and real presence turn you on more than performance.`,
    money: `${transits.find(t => t.natal === 'Saturn') ? `Saturn transit active: ${transits.find(t => t.natal === 'Saturn')!.interpretation}` : 'Financial energy is stable and workable today.'}. Your Saturn in Taurus 27° is built for slow, sustainable wealth — resist any pressure to make quick decisions about money. ${sun?.sign === 'Gemini' ? 'Conversations about money or new ideas could be valuable today.' : 'Focus on the fundamentals of what you are already building.'} Today is better for reviewing what's already in motion than for starting something new financially — patience compounds for you more than speed does.`,
    friendship: `${moon?.sign === 'Gemini' || moon?.sign === 'Aquarius' ? 'Social energy is high and light today — great for connection and fun.' : moon?.sign === 'Cancer' ? 'You are in a feeling-forward space — reach out to someone who truly knows you.' : 'Your close-network 4th line means meaningful connection happens with people already in your life.'}. Your Gemini Rising makes you naturally magnetic in social settings — people enjoy your company and mental energy.`,
    family: `${moon?.sign === 'Cancer' ? 'The Cancer Moon heightens your emotional sensitivity around family — check in with someone you love today.' : 'Family field is background energy today.'}. Your Cancer Moon means family connections are never truly out of mind — even a small gesture of care can be meaningful.`,
    self_reflection: top[0] ? `${top[0].transiting} is ${plainAspectPhrase(top[0].type)} your ${top[0].natal} today — what is the part of yourself that you keep avoiding looking at directly, and what would it mean to stop turning away?` : `Your Scorpio Mercury wants depth — where in your life are you accepting a surface answer when the real truth is something more uncomfortable and more true?`,
    main_focus: top[0] ? top[0].interpretation : `Honor your natural energy rhythm today — do what is genuinely energizing, rest when it is not, and trust that this IS the work.`,
    highest_self: `Your 6th line is in its transition from experimenter to role model — you are becoming the person others look to for how to actually live. ${top[0] ? `Today, ${top[0].transiting} ${plainAspectPhrase(top[0].type)} your ${top[0].natal} is part of that becoming — it is showing you something about your ${top[0].natal}.` : 'Today is about living your truth visibly, even in small ways.'} As a Self-Projected Projector, your clarity comes from speaking — speak your truth today, even just to yourself. Wait for genuine invitations rather than initiating from pressure, and trust that the right recognition is already on its way.`,
    affirmation: buildFallbackAffirmation(moon, transits),
  }
}

export interface TransitBreakdown {
  sky:        string  // what the sky is doing, in plain words
  feels_like: string  // what that will actually feel/look like in her day
  what_to_do: string  // the concrete move to make about it
}

export interface RealAdvice {
  situation: string   // "If a client pushes back on a price…"
  do:        string   // the exact thing to do or say
}

export interface BestMove {
  headline:    string  // the one best thing to do today
  why:         string
  first:       string  // do this first
  then:        string  // then this
  skip:        string  // put this off or skip it
  best_window: string  // the best part of the day for it and why
  people:      string  // best move with the people closest to her today
}

export interface DailyGuidance {
  best_move?:          BestMove
  in_plain_words?:     string          // 3-4 short sentences, the whole day in everyday language
  transit_breakdown?:  TransitBreakdown[]
  real_advice?:        RealAdvice[]
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

    // `day=YYYY-MM-DD` asks for the full reading of a specific upcoming day (used by the
    // weekly forecast). The sky is computed for midday that date, and it caches per day.
    const dayParam = searchParams.get('day')
    const forDay   = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null

    const now    = forDay ? new Date(`${forDay}T16:00:00Z`) : new Date()
    // Use client's local date as cache key so the reading resets at midnight for Zoe, not at UTC midnight
    const dateKey = forDay
      ? `day_${forDay}`
      : localDate
        ? localDate.replace(/[^a-zA-Z0-9]/g, '_')
        : new Intl.DateTimeFormat('en-US', { timeZone: clientTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

    const userId = await resolveUserId()
    const realLife = await realLifeBlock(
      userId,
      forDay ?? new Intl.DateTimeFormat('en-CA', { timeZone: clientTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
    )

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
    const dateStr = (forDay ? '' : localDate) || new Intl.DateTimeFormat('en-US', {
      timeZone: clientTz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(now)
    const timeStr = forDay ? 'all day' : localTime || new Intl.DateTimeFormat('en-US', {
      timeZone: clientTz, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
    }).format(now)

    // ── Prompt ─────────────────────────────────────────────────────────────
    const userPrompt = `${forDay ? `This reading is for ${dateStr}, a day in the coming week (write it as that day, covering the whole day from morning to evening).` : `Today is ${dateStr} at ${timeStr}.`}

=== CURRENT SKY ===
${planetLines}${moonChange}

=== ZOE'S TOP TRANSITS TODAY ===
${transitLines}

${realLife ? `=== ZOE'S REAL DAY (facts from her calendar, lists and plan; cite these by name when the sky relates to them) ===\n${realLife}\n\n` : ''}=== ZOE'S NATAL CHART ===
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
- She runs DRYP Digital (creative agency). Outside that, her own focus is modeling, tattooing, TikTok/content creation, painting, and fashion. Visionary entrepreneur.
- She does NOT like to type — she is voice-first and intuitive. She processes through speaking.
- She is deeply relational, spiritually aware, and results-driven but needs to follow her energy, not grind.

ADVICE QUALITY RULES (mandatory):
- Explain, do not just describe. After every sky detail say "which means..." and then say what to do.
- transit_breakdown: exactly 3 items, one for each of the 3 strongest transits listed above, in order. Do not invent transits that are not listed.
- real_advice: exactly 5 items. Each is a specific situation + the exact thing to do or say. Cover work/money, relationships, her body and energy, content/creative, and one for if the day goes sideways.
- The horoscope string must have three short paragraphs separated by a blank line (\n\n): Morning, Midday, Evening. Start each with that word and a colon.
- Be direct and kind. Say the real thing, including a hard truth if the sky points to one. No filler, no repeating the same idea in different words, no fortune-cookie lines.
- Everything must be grounded in the sky, transits and Human Design data above. Never invent events that will happen to her.
- ACCURACY: when a REAL DAY section is present, tie advice to those actual events and tasks by name (for example "before your 2:00 call...") whenever the sky genuinely relates. Never mention a meeting, person, deadline or task that is not listed. If nothing is listed, give advice by type of situation, not invented specifics.
- Separate what is calculated from what is interpreted: the planets' positions are facts; what they mean for her day is a read. Use language like "this tends to show up as" and "watch for", never "this will happen". Never predict health diagnoses, deaths, or guaranteed money or relationship outcomes.
- If you are not sure a transit is strong, say it is subtle rather than inflating it.

Generate a complete daily reading for Zoe. Return ONLY valid JSON — no markdown, no prose outside the JSON. The JSON must exactly match this schema:

{
  "best_move": {
    "headline": "ONE sentence: the single best thing for Zoe to do today. Specific and decisive.",
    "why": "ONE sentence: why this is the best move given today's sky.",
    "first": "The first thing to do today, with a concrete action.",
    "then": "The next best thing to do after that.",
    "skip": "One specific thing to put off or skip today and why.",
    "best_window": "The best part of the day (morning, midday, afternoon or evening) for her most important thing, and why.",
    "people": "The best move with the people closest to her today: who to reach out to, who to give space, and how. If it involves Kaleb, follow the romance rules: honest, no predicting commitment."
  },
  "in_plain_words": "3-4 SHORT sentences, written like a smart best friend talking. What kind of day is this, why, and what is the single best move? Zero astrology vocabulary she would have to look up. If you must name a planet, say right away what it means for her day.",
  "transit_breakdown": [
    { "sky": "What the sky is doing, in plain words (e.g. 'Mercury is lining up with your Sun')", "feels_like": "What that will actually feel or look like in her real day, in 2 sentences, with a specific example (a conversation, a mood, a decision, a body feeling).", "what_to_do": "The concrete move: one clear thing to do about it, 1-2 sentences." }
  ],
  "real_advice": [
    { "situation": "A realistic situation that could come up today for HER (client, content, money, relationship, energy, body)", "do": "The exact thing to do or say. Give actual wording she could use when it helps, e.g. 'Tell them: I'll get back to you by 3.' No vague advice like 'trust the process'." }
  ],
  "horoscope": "8-10 sentence personalized daily horoscope — the main thing she reads, and it should feel like a genuinely full read, not a summary. Walk through the day in real terms: how the morning might feel, what could come up midday, and what the evening might ask of her. Reference current planets and transits by name, but every single one must be immediately translated into what it actually looks or feels like in her real day: a kind of conversation, a mood, a tension, a decision, a physical feeling. Never leave a planet/sign/aspect standing alone as just a label — see the PLAIN-ENGLISH LIFE RULE below.",
  "energy": "3-4 sentences: what the day's energy FEELS like in her body and emotional field right now, and how that might shift from morning to evening. Visceral, honest, specific — not just a mood word, but where she might feel it physically and what it might make her want to do.",
  "do_today": ["6 specific practical things she should actually do today — personal, actionable, grounded in her life and today's transits. Each one should be a full sentence explaining not just what to do but why today's sky makes it worth doing. If you reference a placement (like her North Node or a house), explain in plain words what to actually pay attention to — never just name the placement and stop there."],
  "dont_today": ["5 honest specific things to avoid today — real warnings, not generic cautions, translated into real situations not just placements. Each one should explain what it could actually look like if she doesn't heed it, not just the warning itself."],
  "career": "4-5 sentences for her career and business energy today. She runs DRYP Digital, and outside that her own focus is modeling, tattooing, TikTok/content creation, painting, and fashion. Get specific: what kind of task or conversation is favored, what to watch for, and how today's sky actually shows up in a work situation — a meeting, a decision, a piece of work — not just a mood about work in general.",
  "love": "4-5 sentences for her romantic and relationship energy today. Go beyond a mood statement — describe a real kind of moment, conversation, or feeling that could come up with a partner or in dating, and what it might be asking of her.",
  "sex": "3 sentences honest message about her sexual and desire energy today. Direct and real, specific to today's sky, not generic.",
  "money": "4-5 sentences for her financial energy and timing today. Be concrete: is today better for spending, saving, a financial conversation, reviewing numbers, or holding steady — and why, based on today's sky.",
  "friendship": "3 sentences for her social and friend energy today.",
  "family": "3 sentences for the family field today.",
  "self_reflection": "One deep, penetrating question for her to sit with today. Her Scorpio Mercury loves depth — make it cut through surface to truth.",
  "main_focus": "1-2 sentences: the single most important thing to put her energy toward today, and briefly why today's sky makes that the priority.",
  "highest_self": "5-6 sentences connecting her Human Design (Self-Projected Projector, 4/6) with her birth chart to guide her toward her highest state today. Speak to her role-model 6th line transition, her need for invitation not initiation, her clarity-through-speaking. Ground it in today's sky, and give her one concrete way to actually practice this today.",
  "affirmation": "One powerful affirmation written in first person, specific to today's energy. Not generic — written as if she is declaring it from her Scorpio Sun depth."
}${LIFE_LANGUAGE_RULES}${ROMANTIC_ACCURACY_RULES}${DECISIVE_GUIDANCE_RULES}`

    // ── Generate (or serve from the real Supabase daily cache) ──────────────
    const { payload: guidance } = await getOrCreateDailyContent<DailyGuidance>({
      userId,
      generationType: 'daily_guidance_v5',
      timezone: clientTz,
      dateKey,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const SYSTEM = 'You are LUNA, Zoe\'s personal astrology guide. Write in a warm, direct, honest voice. Never leave a planet, sign, house, or aspect standing alone as just a label — always translate it into what it actually looks or feels like in her real day (a conversation, a mood, a decision, a tension, a physical feeling). Speak as if you deeply know this woman. Be specific, be real, be encouraging but honest. Make every word feel personally written for Zoe, not for a generic reader. Return ONLY valid JSON — no markdown fences, no prose outside the JSON.'

          const required: (keyof DailyGuidance)[] = [
            'horoscope','energy','do_today','dont_today','career','love',
            'sex','money','friendship','family','self_reflection','main_focus',
            'highest_self','affirmation',
          ]

          let raw = await callAI(SYSTEM, userPrompt, 6000)
          let lastError = ''
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
              const parsed = JSON.parse(jsonText) as DailyGuidance
              const missing = required.filter(f => parsed[f] === undefined)
              if (missing.length === 0) return { payload: parsed, source: 'ai' as const }
              lastError = `missing fields: ${missing.join(', ')}`
            } catch (e) {
              lastError = e instanceof Error ? e.message : 'invalid JSON'
            }
            if (attempt === 0) {
              raw = await callAI(SYSTEM, `Your previous JSON response had a problem: ${lastError}. Here is what you returned:\n${raw}\n\nReturn the corrected, complete, VALID JSON in the exact same shape as before. Double-check every string value is properly escaped and every array/object is properly closed.`, 6000)
            }
          }
          throw new Error(lastError)
        } catch (err) {
          // AI unavailable or produced bad JSON even after a repair attempt — use the
          // always-real transit-based fallback. Logged, not swallowed silently, so a
          // spike in fallback use (e.g. the JSON repeatedly getting cut off) is visible
          // in the logs instead of just quietly showing template text every day.
          console.error('[daily-guidance] AI generation failed, using fallback:', err instanceof Error ? err.message : err)
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
