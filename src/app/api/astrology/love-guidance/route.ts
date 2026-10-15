import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { getCurrentPlanets, getTransitsToNatal, plainAspectPhrase, type PlanetPosition, type TransitAspect } from '@/lib/astrology'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { moonSignChangeNote } from '@/lib/luna/moonChange'
import { LIFE_LANGUAGE_RULES, ROMANTIC_ACCURACY_RULES } from '@/lib/luna/voiceRules'

const ZOE_USER_ID = OWNER_USER_ID

export interface LoveGuidance {
  daily_message:     string
  love_energy:       string
  venus_influence:   string
  attract_energy:    string
  watch_out:         string
  love_ritual:       string
  affirmation:       string
  compatibility_now: string
  navigate_now:      string[]
}

// ─── Transit-based fallback (no AI needed) ────────────────────────────────────
const VENUS_SIGN_LOVE: Record<string, string> = {
  Aries:       'Passion and pursuit energy is high. You attract through confidence and directness.',
  Taurus:      'Sensual, steady energy. You attract through beauty, presence, and ease.',
  Gemini:      'Wit and conversation are your love language today. Mental connection is magnetic.',
  Cancer:      'Deep emotional availability. You attract through warmth, home energy, and memory.',
  Leo:         'Radiant and heart-led. Your generosity and confidence are incredibly magnetic.',
  Virgo:       'Thoughtful, devoted energy. You attract through acts of service and genuine care.',
  Libra:       'Balanced and charming. Partnership energy is strong — connection comes naturally.',
  Scorpio:     'Magnetic, intense, and deeply present. You attract through your mystique and depth.',
  Sagittarius: 'Free-spirited and expansive. You attract through adventure, honesty, and fire.',
  Capricorn:   'Grounded and purposeful. You attract through your ambition, loyalty, and strength.',
  Aquarius:    'Uniquely yourself. Your authenticity and vision draw the right people in.',
  Pisces:      'Soft, dreamy, deeply feeling. You attract through empathy, art, and soul connection.',
}

const MOON_SIGN_LOVE: Record<string, string> = {
  Aries:       'Feelings run hot and fast. Act on what you feel but pause before drama.',
  Taurus:      'Emotional steadiness. Comfort, beauty, and consistency feel essential now.',
  Gemini:      'Curious and light-hearted emotionally. Talk through feelings — voice brings clarity.',
  Cancer:      'Deep, nurturing, emotionally available. Your care is your superpower — receive it too.',
  Leo:         'Warmth and radiance. Express your feelings boldly — you deserve to be seen.',
  Virgo:       'Analytical in love. Be careful not to over-think; let yourself feel first.',
  Libra:       'Craving harmony and connection. Beautiful energy for deepening relationships.',
  Scorpio:     'Intense feeling. What is surfacing emotionally needs honest acknowledgment.',
  Sagittarius: 'Freedom-loving feelings. You need space to breathe in love right now.',
  Capricorn:   'Reserved but loyal. Your feelings run deep even when your expression is cool.',
  Aquarius:    'Detached but genuine. Connect through ideas and shared values right now.',
  Pisces:      'Dreamy and empathic. Boundaries matter — protect your emotional energy.',
}

function buildFallbackLoveGuidance(planets: PlanetPosition[], transits: TransitAspect[]): LoveGuidance {
  const venus = planets.find(p => p.name === 'Venus')
  const moon  = planets.find(p => p.name === 'Moon')
  const sun   = planets.find(p => p.name === 'Sun')

  const loveTransits = transits.filter(t =>
    ['Venus', 'Mars', 'Moon', 'NNode'].includes(t.natal) ||
    ['Venus', 'Mars', 'Moon', 'Jupiter'].includes(t.transiting)
  ).slice(0, 3)

  const venusMsg  = venus  ? VENUS_SIGN_LOVE[venus.sign]  ?? '' : ''
  const moonMsg   = moon   ? MOON_SIGN_LOVE[moon.sign]    ?? '' : ''
  const transitMsg = loveTransits.length > 0
    ? loveTransits.map(t => t.interpretation).join(' ')
    : 'The sky is quiet in your love sector — use this space for inner reflection.'

  const navigateNow = [
    loveTransits[0] ? `${loveTransits[0].transiting} is ${plainAspectPhrase(loveTransits[0].type)} your ${loveTransits[0].natal}: ${loveTransits[0].interpretation}` : 'Trust your intuition in love today — it is reliable.',
    moon ? `Moon in ${moon.sign}: ${moonMsg}` : '',
    venus ? `Venus in ${venus.sign} amplifies your magnetic pull. ${venusMsg}` : '',
    'Your Venus in Sagittarius 29° craves honesty, freedom, and expansive connection. If it feels constricting, it is not the one.',
    'Your Mars in Libra seeks fairness and beauty. You move toward love through creating harmony, not through force.',
  ].filter(Boolean)

  return {
    daily_message: `${venus ? `Venus in ${venus.sign} lights up your love field today.` : 'The sky holds space for love today.'} ${venusMsg} Your own Venus sits at the very last degree of Sagittarius — the most intense spot a planet can be in that sign — which means you love with your whole spirit or not at all. Half-measures do not work for you. ${transitMsg}`,
    love_energy:   `${moonMsg} ${loveTransits.length > 0 ? `Real shifts are touching your love planets right now — ${loveTransits.map(t => `${t.transiting} ${plainAspectPhrase(t.type)} your ${t.natal}`).join(', ')}.` : 'The cosmic field around love is calm today.'}`,
    venus_influence: `Your own Venus sits at the very last degree of Sagittarius, which means your capacity for love is both fierce and free. You love without restraint when it feels right — and you cannot stay where love feels like a cage. ${venus ? `Today's Venus in ${venus.sign} ${venus.retrograde ? '(moving backward for a while — a time to review and reconnect, not to start something new)' : ''} adds ${VENUS_SIGN_LOVE[venus.sign] ?? 'an additional layer of magnetism'} to your natural pull.` : ''}`,
    attract_energy: `Your Gemini Rising makes you incredibly charming and mentally magnetic — people are drawn to your mind and your way of connecting. Your Scorpio Sun adds depth and mystique beneath that surface sparkle. Today you attract best through: honest conversation, genuine curiosity about the other person, and being unapologetically yourself. Do not perform or over-give to be liked.`,
    watch_out: loveTransits.some(t => ['square', 'opposition'].includes(t.type))
      ? `Watch for: ${loveTransits.filter(t => ['square', 'opposition'].includes(t.type)).map(t => t.interpretation).join(' ')} Your Cancer Moon may feel this tension more intensely — give yourself space before reacting.`
      : `Watch for: Giving more than you receive (Mars in Libra can over-accommodate to keep the peace). Your Scorpio Sun knows when something is off — trust that knowing even when it is uncomfortable.`,
    love_ritual: `Light a pink or white candle. Write down: what you genuinely want in love right now — not what you think you should want, what is actually true. Your Self-Projected Projector nature means you know what you feel by speaking or writing it out loud. Let the truth surface. Then burn or fold the paper and say: "I am magnetic to what is genuinely aligned with me."`,
    affirmation: `I love freely, deeply, and without apology. I attract connections that match my full depth. I do not shrink for love — I expand into it.`,
    compatibility_now: `Right now, you are most magnetically aligned with: ${sun ? `people whose energy harmonizes with the ${sun.sign} Sun in the sky` : 'fire and air energy'}. Your Venus in Sagittarius craves intellectual fire (Aries, Leo, Sagittarius energy), expansive conversations (Gemini, Aquarius), and raw honesty. Your Mars in Libra is attracted to beauty, wit, and fairness. People who challenge you to grow — and give you room to breathe — are your people.`,
    navigate_now: navigateNow,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const refresh  = searchParams.get('refresh') === '1'
    const clientTz = searchParams.get('tz')   || 'America/New_York'

    const now = new Date()

    const planets  = getCurrentPlanets(now)
    const transits = getTransitsToNatal(now).slice(0, 8)

    const moonChange = moonSignChangeNote(now, clientTz)
    const planetLines = planets.map(p =>
      `${p.name}: ${p.sign} ${p.degree}°${p.retrograde ? ' Rx' : ''}`
    ).join('\n')

    const loveTransits = transits.filter(t =>
      ['Venus','Mars','Moon','NNode','Jupiter'].includes(t.natal) ||
      ['Venus','Mars','Moon'].includes(t.transiting)
    )

    const transitLines = loveTransits.map(t =>
      `${t.transiting} ${t.type} natal ${t.natal} (${t.natalSign} ${t.natalDegree}°) — ${t.interpretation}`
    ).join('\n')

    const { payload: guidance } = await getOrCreateDailyContent<LoveGuidance>({
      userId: ZOE_USER_ID,
      generationType: 'love_guidance_v3',
      timezone: clientTz,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: clientTz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          }).format(now)

          const prompt = `Today is ${dateStr}.

CURRENT SKY:
${planetLines}${moonChange}

ZOE'S LOVE-RELATED TRANSITS TODAY:
${transitLines || 'No major love transits active right now — quiet field.'}

ZOE'S NATAL LOVE PLANETS:
- Venus: Sagittarius 29° (anaretic degree — fierce, freedom-seeking, all-or-nothing love. Cusp Capricorn energy)
- Mars: Libra 6° (pursues through harmony, fairness, beauty. Conflict-careful but deeply value-driven)
- Moon: Cancer 4° (emotionally cyclical, needs emotional safety, deeply intuitive, very feeling-sensitive)
- 7th House: Sagittarius (her partnership house — she needs expansive, adventurous, honest partnerships)
- North Node: Cancer 17° (soul growth through receiving love, emotional depth, nurturing others AND self)
- Chiron: Sagittarius 15° (wound around freedom, being truly seen, belief that she has to earn love)

ZOE'S LOVE NATURE:
- Scorpio Sun: She loves deeply or not at all. She can sense inauthenticity immediately.
- Gemini Rising: She attracts through her mind, wit, and the way she makes people feel seen in conversation.
- Self-Projected Projector (Human Design): She must wait for invitations in love too — initiating from the wrong energy drains her. The right person WILL pursue her.
- 4/6 Profile: Her deep connections come through her close inner network. She is not meant to swipe endlessly — she is meant to be found by people already in her orbit.

Generate a complete love energy reading for today. Return ONLY valid JSON matching this exact schema:

{
  "daily_message": "3-sentence love message for today. Reference actual transits and how they affect her love energy. Warm, honest, and deeply personal to Zoe.",
  "love_energy": "2 sentences: what the love field feels like in her body and energy today. What is available? What is she radiating?",
  "venus_influence": "2-3 sentences about how today's Venus position interacts with her natal Venus in Sagittarius 29°. What does this mean for her magnetism and what she attracts?",
  "attract_energy": "2 sentences about what she is attracting today and how to let that attraction work for her.",
  "watch_out": "2 sentences: one honest warning about love energy today. What is the shadow or the trap she should navigate around?",
  "love_ritual": "A specific, doable ritual or practice for her love energy today. Something she can actually do in 5-10 minutes.",
  "affirmation": "One powerful first-person love affirmation written from her Scorpio depth. Specific to today, not generic.",
  "compatibility_now": "2 sentences about who she is most magnetically aligned with right now based on current sky and her natal chart. Be specific about qualities, not just sun signs.",
  "navigate_now": ["5 specific pieces of guidance for how to navigate her love life right now, grounded in today's transits and her chart"]
}${LIFE_LANGUAGE_RULES}${ROMANTIC_ACCURACY_RULES}`

          const SYSTEM = "You are LUNA, Zoe's personal astrology guide. Write about love with honesty, warmth, and real depth. No toxic positivity. No vague generalities. You know this woman — speak directly to her. Return ONLY valid JSON — no markdown fences."
          const rawText = await callAI(SYSTEM, prompt, 1500)
          const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
          const parsed = JSON.parse(jsonText) as LoveGuidance
          return { payload: parsed, source: 'ai' as const }
        } catch {
          // AI unavailable — use transit-based fallback (always accurate)
          return { payload: buildFallbackLoveGuidance(planets, transits), source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(guidance)
  } catch (err) {
    console.error('[love-guidance] error:', err)
    return NextResponse.json({ error: 'Failed to generate love guidance.' }, { status: 500 })
  }
}
