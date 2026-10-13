import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI, SPIRITUAL_GUIDANCE_PROMPT, parseAIJson } from '@/lib/ai'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

const ZOE_USER_ID = OWNER_USER_ID

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

interface SpiritualGuidance {
  energy_today: string
  quote: string
  highlights: string[]
  crystal: string
  crystal_why: string
  moon_note: string
  affirmation: string
  intention: string
  shadow_question: string
  gratitude_prompt: string
  meditation_prompt: string
  human_design_reminder: string
  chart_theme: string
}

const FALLBACK_GUIDANCE: SpiritualGuidance = {
  energy_today: 'Today asks you to move slowly before you move fast. Your mind may want to jump ahead, but your power is in choosing one clear step.',
  quote: '"The quieter you become, the more you can hear." — Rumi',
  highlights: ['Your Cancer Moon is asking for emotional honesty before action.', 'Slow down enough to notice what your body already knows.'],
  crystal: 'Moonstone',
  crystal_why: 'Supports emotional steadiness and connects you to your natural cycles.',
  moon_note: 'The Moon is always moving through something — check the Astrology tab for today\'s exact phase and sign.',
  affirmation: 'I move with grace. I do not chase the day. I guide it.',
  intention: 'I choose depth over speed. I am selective. I trust what is opening naturally.',
  shadow_question: 'Where am I confusing urgency with importance?',
  gratitude_prompt: 'What does my body need from me today that I have been too busy to give?',
  meditation_prompt: 'Breathe in: I receive. Breathe out: I release.',
  human_design_reminder: 'As a Self-Projected Projector, speak your decision out loud before you make it. Your truth is in your voice.',
  chart_theme: 'Your Scorpio Sun and Cancer Moon are always in dialogue — depth seeking safety, safety seeking depth.',
}

const REQUIRED_FIELDS: (keyof SpiritualGuidance)[] = [
  'energy_today', 'crystal', 'crystal_why', 'moon_note', 'affirmation',
  'intention', 'shadow_question', 'gratitude_prompt', 'meditation_prompt', 'human_design_reminder',
]

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === '1'
    const tz = searchParams.get('tz') || 'America/New_York'
    const userId = await resolveUserId()

    const { payload } = await getOrCreateDailyContent<SpiritualGuidance>({
      userId,
      generationType: 'spiritual_guidance',
      timezone: tz,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const context = `Generate spiritual guidance for Zoe. Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')}.`
          const result = await callAI(SPIRITUAL_GUIDANCE_PROMPT, context, 1500)
          const parsed = parseAIJson<SpiritualGuidance>(result)
          for (const field of REQUIRED_FIELDS) {
            if (parsed[field] === undefined) throw new Error(`Missing field: ${field}`)
          }
          return { payload: parsed, source: 'ai' as const }
        } catch {
          return { payload: FALLBACK_GUIDANCE, source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(payload)
  } catch (err) {
    console.error('Spiritual guidance error:', err)
    return NextResponse.json(FALLBACK_GUIDANCE)
  }
}
