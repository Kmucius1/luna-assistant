import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'

export interface GrowthCoachingInput {
  date:        string
  checkIns?:   Array<{
    type:            string
    feeling?:        string | null
    on_mind?:        string | null
    support_need?:   string | null
    pride_goal?:     string | null
    mood_rating?:    number | null
    energy_rating?:  number | null
    sleep_rating?:   number | null
    ai_response?:    { affirmation?: string; first_step?: string; ai_message?: string } | null
  }>
  transitReflections?: Array<{
    transit:    string
    aspect:     string
    planets:    string
    reflection: string
    question:   string
  }>
  journalEntries?: Array<{
    type:    string
    content: string
    mood?:   string
  }>
  patterns?: Array<{ type: string; context: string; value: string; source: string }>
}

const SYSTEM = `You are LUNA — Zoe's deeply personal growth coach and mirror. You know her birth chart, Human Design, and the whole arc of who she is becoming. You are honest, warm, direct, and deeply invested in her becoming the highest version of herself. You do not sugarcoat but you never tear down. Every word you write is in service of her wealth, beauty, inner peace, clarity, confidence, and abundance. Always respond with ONLY a valid JSON object — no preamble, no commentary, no markdown.`

export async function POST(req: NextRequest) {
  try {
    const body: GrowthCoachingInput = await req.json()
    const {
      date,
      checkIns            = [],
      transitReflections  = [],
      journalEntries      = [],
      patterns            = [],
    } = body

    const checkInText = checkIns.length > 0 ? checkIns.map(c => {
      const parts = [
        `[${c.type.toUpperCase()} CHECK-IN]`,
        c.mood_rating    ? `Mood: ${c.mood_rating}/10`    : '',
        c.energy_rating  ? `Energy: ${c.energy_rating}/10` : '',
        c.sleep_rating   ? `Sleep: ${c.sleep_rating}/10`   : '',
        c.feeling        ? `Feeling: "${c.feeling}"`        : '',
        c.on_mind        ? `On mind: "${c.on_mind}"`        : '',
        c.support_need   ? `Support need: "${c.support_need}"` : '',
        c.pride_goal     ? `Goal/pride: "${c.pride_goal}"`  : '',
        c.ai_response?.ai_message ? `LUNA said: "${c.ai_response.ai_message}"` : '',
      ].filter(Boolean)
      return parts.join('\n')
    }).join('\n\n') : 'No check-ins recorded.'

    const transitText = transitReflections.length > 0
      ? transitReflections.map(r => `Transit: ${r.transit}\nZoe reflected: "${r.reflection}"`).join('\n\n')
      : 'No transit reflections recorded.'

    const journalText = journalEntries.length > 0
      ? journalEntries.map(e => `[${e.type.toUpperCase()}]${e.mood ? ` · Mood: ${e.mood}` : ''}\n"${e.content}"`).join('\n\n')
      : 'No journal entries.'

    // Patterns include everything Zoe selected/typed across gratitude, shadow work, career reflection etc.
    const patternText = patterns.length > 0
      ? patterns.slice(-30).map(p => `${p.context}: "${p.value}"`).join('\n')
      : 'No recorded patterns for this day.'

    const userPrompt = `Date: ${date}

CHECK-INS:
${checkInText}

TRANSIT REFLECTIONS:
${transitText}

JOURNAL ENTRIES:
${journalText}

PATTERNS & SELECTIONS (everything she picked or typed today — gratitude, shadow work, career reflection, mood, etc.):
${patternText}

ZOE'S CONTEXT:
Birth chart: Scorpio Sun 22°, Cancer Moon 4°, Gemini Rising 12°, Virgo Midheaven, Venus Capricorn, Mars Libra, Saturn Taurus, North Node Cancer.
Human Design: Self-Projected Projector, 4/6 (Opportunist/Role Model).
She runs DRYP Digital. Outside that, her own focus is modeling, tattooing, TikTok/content creation, painting, and fashion. She is in her 6th line transition — becoming the role model through lived experience.
Goals: wealth, beauty, success, abundance, inner peace, security, confidence, alchemy.

Based on ALL of the above, generate her personalized daily coaching. Return ONLY this JSON object:
{
  "did_well": "2-3 sentences celebrating what she genuinely did well today. Root in actual data above — do not be generic.",
  "improve": "2-3 honest, loving sentences about what she can work on. Her Scorpio Sun can handle truth.",
  "highest_self": "3-4 sentences: what would the fully realized 4/6 Role Model Projector Scorpio version of Zoe have done differently today?",
  "next_time": "3-4 practical sentences about what to do NEXT TIME she faces this type of day or situation.",
  "affirmation": "One powerful first-person affirmation written specifically for today's themes.",
  "growth_score": <integer 1-10>,
  "theme": "<one word: the core growth theme of this day>"
}`

    const raw = await callAI(SYSTEM, userPrompt, 1500)
    const result = parseAIJson(raw)

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[growth-coaching]', msg)
    return NextResponse.json({ error: 'Could not generate coaching.', detail: msg }, { status: 500 })
  }
}
