import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey } from '@/lib/luna/dailyCache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json()
    const { focus, exercises, durationMinutes, tz } = body
    const now = new Date()
    const dateKey = localDateKey(now, tz)
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/New_York', weekday: 'long' }).format(now)

    const { data, error } = await db
      .from('workout_logs')
      .insert({
        user_id: ZOE_USER_ID,
        date_key: dateKey,
        day_of_week: dayOfWeek,
        focus,
        exercises,
        duration_minutes: durationMinutes,
      })
      .select()
      .single()

    if (error) {
      console.error('[fitness/workouts] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ workout: data })
  } catch (err) {
    console.error('[fitness/workouts] POST error:', err)
    return NextResponse.json({ error: 'Failed to save workout' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient()
    const tz = req.nextUrl.searchParams.get('tz') || 'America/New_York'
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')
    const todayKey = localDateKey(new Date(), tz)

    const { data, error } = await db
      .from('workout_logs')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[fitness/workouts] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const completedToday = (data ?? []).some((w: { date_key: string }) => w.date_key === todayKey)
    return NextResponse.json(
      { completedToday, workouts: data || [] },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    )
  } catch (err) {
    console.error('[fitness/workouts] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}
