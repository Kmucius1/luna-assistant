import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// Whether THIS week's reset (keyed to this week's Monday, same date_key
// finalize() writes to) has actually been completed — not whether today
// happens to be Sunday. Lets Home nudge her toward it any day of the week
// if Sunday got missed, instead of only ever prompting on Sunday itself.
export async function GET() {
  try {
    const supabase = createAdminClient()
    const weekMondayKey = mondayOf(new Date())

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
