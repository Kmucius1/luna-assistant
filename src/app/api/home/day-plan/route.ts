import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

// Read-only lookup of today's saved Plan My Day output, if she's generated
// one — never triggers AI generation itself, just reflects what's there.
export async function GET(req: NextRequest) {
  try {
    const tz = req.nextUrl.searchParams.get('tz') || 'America/New_York'
    const dateKey = localDateKey(new Date(), tz)

    const db = createAdminClient()
    const { data } = await db
      .from('daily_generation_cache')
      .select('payload')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', 'day_plan')
      .maybeSingle()

    return NextResponse.json(
      { plan: data?.payload ?? null },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    )
  } catch (err) {
    console.error('[home/day-plan] error:', err)
    return NextResponse.json({ plan: null })
  }
}
