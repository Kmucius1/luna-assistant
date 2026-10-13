import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { buildLunaContext, formatLunaContextForPrompt } from '@/lib/luna/context'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = OWNER_USER_ID

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export interface DailyMessage {
  message: string
  affirmation: string
}

const FALLBACK_MESSAGE: DailyMessage = {
  message: 'Your energy needs structure before speed. Pick one priority and protect your body before you start spiraling.',
  affirmation: 'I move at my own pace. What is truly mine will arrive.',
}

const SYSTEM = `You are LUNA, a warm and direct personal guide. Write ONE short daily message (2-3 sentences, under 45 words) that names what today likely needs from the person, grounded in whatever real context you're given. No astrology jargon, no generic affirmations-as-filler. Then write one short first-person affirmation (under 20 words). Return ONLY valid JSON: {"message": "...", "affirmation": "..."}`

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === '1'
  const clientTz = searchParams.get('tz') || 'America/New_York'

  const userId = await resolveUserId()

  const { payload, source } = await getOrCreateDailyContent<DailyMessage>({
    userId,
    generationType: 'luna_message',
    timezone: clientTz,
    forceRegenerate: refresh,
    generate: async () => {
      try {
        const ctx = await buildLunaContext(userId)
        const contextBlock = formatLunaContextForPrompt(ctx)
        const userPrompt = contextBlock
          ? `${contextBlock}\n\nWrite today's message.`
          : `Write today's message for someone who tends to overthink and carry too much mentally, and needs soft structure more than generic reassurance.`

        const raw = await callAI(SYSTEM, userPrompt, 300)
        const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
        const parsed = JSON.parse(jsonText) as DailyMessage
        if (!parsed.message || !parsed.affirmation) throw new Error('incomplete response')
        return { payload: parsed, source: 'ai' as const }
      } catch {
        return { payload: FALLBACK_MESSAGE, source: 'fallback' as const }
      }
    },
  })

  return NextResponse.json({ ...payload, source })
}
