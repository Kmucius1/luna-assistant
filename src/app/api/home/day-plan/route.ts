import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { planningDateKey } from '@/lib/luna/planningCycle'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

// Read-only lookup of today's saved Plan My Day output, if she's generated
// one — never triggers AI generation itself, just reflects what's there.
export async function GET(req: NextRequest) {
  try {
    const tz = req.nextUrl.searchParams.get('tz') || 'America/New_York'
    const dateKey = planningDateKey(new Date(), tz)

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

interface ScheduleBlock { time: string; label: string; detail?: string; type: string; anchor?: boolean; emoji?: string; completed?: boolean }

// Real-time adjustment + schedule repair in one mechanism: patches exactly
// the one block she acted on — mark it done, or remove it because it fell
// through — without regenerating the rest of the day. This is deliberately
// simpler than diffing a changed calendar event; it's the tractable, honest
// slice of "repair, don't rebuild": completing or dropping a block never
// touches any other block.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { blockIndex, action, tz } = body as { blockIndex?: number; action?: 'complete' | 'uncomplete' | 'remove'; tz?: string }
    if (typeof blockIndex !== 'number' || !action) return NextResponse.json({ error: 'blockIndex and action are required' }, { status: 400 })

    const dateKey = planningDateKey(new Date(), tz || 'America/New_York')
    const db = createAdminClient()

    const { data: row, error: fetchError } = await db
      .from('daily_generation_cache')
      .select('payload')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', 'day_plan')
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!row?.payload) return NextResponse.json({ error: 'No plan found for today' }, { status: 404 })

    const payload = row.payload as { schedule?: ScheduleBlock[] }
    const schedule = payload.schedule ?? []
    if (blockIndex < 0 || blockIndex >= schedule.length) return NextResponse.json({ error: 'Invalid blockIndex' }, { status: 400 })

    if (action === 'remove') schedule.splice(blockIndex, 1)
    else schedule[blockIndex] = { ...schedule[blockIndex], completed: action === 'complete' }
    payload.schedule = schedule

    const { error: updateError } = await db
      .from('daily_generation_cache')
      .update({ payload, updated_at: new Date().toISOString() })
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', 'day_plan')
    if (updateError) throw updateError

    return NextResponse.json({ ok: true, plan: payload })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[home/day-plan] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update the schedule', detail: message }, { status: 500 })
  }
}
