import { NextResponse } from 'next/server'
import { OWNER_USER_ID } from '@/lib/owner'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { todayKey } from '@/lib/luna/today'
import { currentNudge, type NudgeContext } from '@/lib/luna/thirtyNudges'

export const dynamic = 'force-dynamic'

export async function GET() {
  let userId = OWNER_USER_ID
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) userId = user.id
  } catch { /* single-owner fallback */ }

  const dateKey = todayKey()
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: false }).format(new Date())) % 24

  let guidance: NudgeContext['guidance'] = null
  try {
    const db = createAdminClient()
    const { data } = await db.from('daily_generation_cache').select('payload')
      .eq('user_id', userId).eq('date_key', dateKey).eq('generation_type', 'daily_guidance_v7').maybeSingle()
    guidance = (data?.payload as NudgeContext['guidance']) ?? null
  } catch { /* astrology lines simply fall back */ }

  return NextResponse.json({ dateKey, nudge: currentNudge(hour, { dateKey, guidance }) })
}
