import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey, localHour } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

function getTimePeriod(hour: number): string {
  if (hour >= 5  && hour < 8)  return 'early morning'
  if (hour >= 8  && hour < 10) return 'morning routine'
  if (hour >= 10 && hour < 12) return 'morning work'
  if (hour >= 12 && hour < 14) return 'midday'
  if (hour >= 14 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 19) return 'transition'
  if (hour >= 19 && hour < 21) return 'evening'
  if (hour >= 21 && hour < 23) return 'night'
  return 'late night'
}

function getOpener(hour: number): string {
  if (hour >= 5  && hour < 8)  return "You're up early. How are you feeling before the day starts?"
  if (hour >= 8  && hour < 10) return "Good morning. How did you wake up today — grounded or already in your head?"
  if (hour >= 10 && hour < 12) return "You're into your morning now. What are you carrying into this work session?"
  if (hour >= 12 && hour < 14) return "Midday check-in. How has the morning actually gone — not the plan, the reality?"
  if (hour >= 14 && hour < 17) return "Afternoon. Are you still in flow or starting to push against something?"
  if (hour >= 17 && hour < 19) return "The day is wrapping up. What actually got done versus what you planned?"
  if (hour >= 19 && hour < 21) return "Evening. Are you winding down or still in work mode right now?"
  if (hour >= 21 && hour < 23) return "It's getting late. What's still on your mind that your body needs to let go of before sleep?"
  return "Hey. You're up late. What is it?"
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tz = searchParams.get('tz') || 'America/New_York'
    // Today's messages only (in the user's local timezone) — conversation
    // rolls over to a fresh session_id at local midnight. Prior days are
    // never deleted, just addressed under their own date-keyed session_id.
    const session_id = localDateKey(new Date(), tz)

    const db = createAdminClient()
    const hour = localHour(new Date(), tz)

    // Fetch the most recent messages first (so a busy day never gets silently
    // truncated to its earliest messages), then restore chronological order.
    const { data: recent } = await db
      .from('luna_messages')
      .select('id, role, content, created_at, time_period')
      .eq('user_id', ZOE_USER_ID)
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(500)

    const messages = (recent ?? []).slice().reverse()

    // If no history yet, return the time-aware opener
    if (!messages || messages.length === 0) {
      return NextResponse.json({
        messages: [{
          id: 'opener',
          role: 'assistant',
          content: getOpener(hour),
          created_at: new Date().toISOString(),
          time_period: getTimePeriod(hour),
        }],
        session_id,
        is_new: true,
      })
    }

    return NextResponse.json({ messages, session_id, is_new: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[chat/history]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
