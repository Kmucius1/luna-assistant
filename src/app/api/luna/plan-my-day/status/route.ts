import { OWNER_USER_ID } from '@/lib/owner'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { planningDateKey } from '@/lib/luna/planningCycle'

const ZOE_USER_ID = OWNER_USER_ID
const ZOE_TIMEZONE = 'America/New_York'

// Whether today's Plan My Day (4am-local planning day, same key
// /api/ai/plan-my-day writes to) has actually been generated yet — the
// signal the global forced gate uses to decide whether to send her to
// /plan-my-day, same day-boundary as the weekly reset's own status check.
export async function GET() {
  try {
    const supabase = createAdminClient()
    const dayKey = planningDateKey(new Date(), ZOE_TIMEZONE)

    const { data, error } = await supabase
      .from('daily_generation_cache')
      .select('id')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dayKey)
      .eq('generation_type', 'day_plan')
      .maybeSingle()
    if (error) throw error

    return NextResponse.json({ completedToday: !!data, dayKey })
  } catch (error) {
    console.error('[plan-my-day/status] GET error:', error)
    return NextResponse.json({ completedToday: true, dayKey: null })
  }
}
