import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI, RECOVERY_MODE_PROMPT, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey } from '@/lib/luna/dailyCache'
import { ZOE_BUSINESS_FOCUS_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'

const ZOE_USER_ID = OWNER_USER_ID

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tz = body.tz || 'America/New_York'
    const now = new Date()
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(now)
    const businessFocus = ZOE_BUSINESS_FOCUS_BY_DAY[weekday] ?? null

    const context = `Zoe woke up late. ${body.context || 'Help her recover without shame.'}
Today is ${weekday}.${businessFocus ? ` Today's business focus theme: ${businessFocus.theme} — ${businessFocus.note}` : ''}
${body.occasion ? `Today's outfit occasion: ${body.occasion}.` : ''}
${body.eventsSummary ? `Today's real calendar events: ${body.eventsSummary}` : 'No real calendar events known.'}`

    const raw = await callAI(RECOVERY_MODE_PROMPT, context, 1400)
    const parsed = parseAIJson<Record<string, unknown>>(raw)

    const payload = { ...parsed, movement_choice: body.movementChoice ?? 'rest', source_mode: 'recovery' }

    // Writes into the SAME cache row the normal plan-my-day flow uses, so
    // every downstream reader (Home widget, FitnessTodayView, daily-outfit)
    // works identically whichever path generated today's plan.
    try {
      const db = createAdminClient()
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        date_key: localDateKey(now, tz),
        timezone: tz,
        generation_type: 'day_plan',
        payload,
        source: 'ai',
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id,date_key,generation_type' })
    } catch (saveError) {
      console.error('[recovery-mode] failed to persist plan:', saveError instanceof Error ? saveError.message : saveError)
    }

    return NextResponse.json(payload)
  } catch (err) {
    console.error('Recovery mode error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
