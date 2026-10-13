import { OWNER_USER_ID } from '@/lib/owner'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { planningWeekMondayKey } from '@/lib/luna/planningCycle'

const ZOE_USER_ID = OWNER_USER_ID
const ZOE_TIMEZONE = 'America/New_York'

// Whether THIS week's reset (keyed to this week's Monday, same date_key
// finalize() writes to) has actually been completed — not whether today
// happens to be Sunday. The cycle itself flips at Sunday 4am local (see
// planningWeekMondayKey), so Home starts nudging her toward it from that
// moment, any day of the week, instead of only ever prompting on Sunday.
export async function GET() {
  try {
    const supabase = createAdminClient()
    const weekMondayKey = planningWeekMondayKey(new Date(), ZOE_TIMEZONE)

    const { data, error } = await supabase
      .from('daily_generation_cache')
      .select('id')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', weekMondayKey)
      .eq('generation_type', 'weekly_reset_final')
      .maybeSingle()
    if (error) throw error

    return NextResponse.json({ completedThisWeek: !!data, weekMondayKey })
  } catch (error) {
    console.error('[weekly-reset/status] GET error:', error)
    // Fail open toward "don't nag" rather than a false-positive nudge on a transient error.
    return NextResponse.json({ completedThisWeek: true, weekMondayKey: null })
  }
}
