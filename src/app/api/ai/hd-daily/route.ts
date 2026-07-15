import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson, ZOE_SOUL } from '@/lib/ai'
import { getOrCreateDailyContent, localHour } from '@/lib/luna/dailyCache'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

interface HdDaily {
  daily_focus: string
  invitation_watch: string
  not_self_check: string
  strategy_note: string
  voice_prompt: string
  affirmation: string
}

const FALLBACK_HD: HdDaily = {
  daily_focus: 'Today calibrates your Projector wisdom toward one thing: noticing where you are giving energy without being asked. Your clarity comes from pausing before you offer, not from working harder.',
  invitation_watch: 'Watch for a moment where someone genuinely asks for your full read on something — strategy, not just execution. That is the invitation worth leaning into.',
  not_self_check: 'Notice if you start explaining yourself twice, or over-justifying a decision no one questioned. That is the bitterness signal — a sign you gave before being asked.',
  strategy_note: 'Practice Wait For Invitation today by choosing one thing NOT to push forward on. Let it sit. Notice how it feels to let something come to you instead.',
  voice_prompt: 'Say out loud: "What do I actually think is true here?" — before you decide anything today. Your authority lives in your voice, not your head.',
  affirmation: 'I am recognized for what I already know. I do not have to prove it — I only have to wait to be seen.',
}

const REQUIRED_FIELDS: (keyof HdDaily)[] = [
  'daily_focus', 'invitation_watch', 'not_self_check', 'strategy_note', 'voice_prompt', 'affirmation',
]

const HD_SYSTEM = `${ZOE_SOUL}

You are Zoe's Human Design guide. Generate her daily HD focus — grounded, specific, and lived-in. Not generic Human Design theory. Talk to her like someone who has been walking this path with her.

Return ONLY valid JSON, no markdown, no explanation:
{
  "daily_focus": "2-3 sentences about today's HD energy — what her Projector wisdom is calibrated to guide today. Make it specific to her real life: DRYP, clients, Kaleb, her creative work.",
  "invitation_watch": "What type of invitation or recognition she is most open to receiving today — be specific. Not 'a business opportunity' but something like 'a client who finally asks for her full strategy mind, not just execution'.",
  "not_self_check": "The specific bitterness signal to watch for today — name the situation, not just the feeling. Make it real.",
  "strategy_note": "One practical, specific way to practice Wait For Invitation today in her actual life — something she can do or NOT do that demonstrates the strategy.",
  "voice_prompt": "A Self-Projected prompt: one thing she should speak out loud today to access her clarity. Her authority is in her voice — what question should she say out loud to herself right now?",
  "affirmation": "A short, powerful HD-specific affirmation in first person. In her voice. Rooted in her Projector truth, not hustle."
}`

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === '1'
    const tz = searchParams.get('tz') || 'America/New_York'
    const userId = await resolveUserId()

    const { payload } = await getOrCreateDailyContent<HdDaily>({
      userId,
      generationType: 'hd_daily',
      timezone: tz,
      forceRegenerate: refresh,
      generate: async () => {
        try {
          const today = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          }).format(new Date())
          const hour = localHour(new Date(), tz)
          const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
          const message = `Today is ${today}, ${timeOfDay}. Generate Zoe's Human Design daily focus. Be specific to her actual life at DRYP right now.`

          const result = await callAI(HD_SYSTEM, message, 900)
          const parsed = parseAIJson<HdDaily>(result)
          for (const field of REQUIRED_FIELDS) {
            if (parsed[field] === undefined) throw new Error(`Missing field: ${field}`)
          }
          return { payload: parsed, source: 'ai' as const }
        } catch {
          return { payload: FALLBACK_HD, source: 'fallback' as const }
        }
      },
    })

    return NextResponse.json(payload)
  } catch (err) {
    console.error('HD daily error:', err)
    return NextResponse.json(FALLBACK_HD)
  }
}
