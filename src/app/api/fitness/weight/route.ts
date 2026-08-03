import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient()
    const userId = await resolveUserId()
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

    const { data, error } = await db
      .from('body_weight_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date_key', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[fitness/weight] GET error:', error)
      return NextResponse.json({ logs: [] })
    }
    return NextResponse.json({ logs: data ?? [] })
  } catch (err) {
    console.error('[fitness/weight] GET error:', err)
    return NextResponse.json({ logs: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const userId = await resolveUserId()
    const { weightLbs, tz } = await req.json() as { weightLbs: number; tz?: string }

    if (!weightLbs || weightLbs <= 0) {
      return NextResponse.json({ error: 'weightLbs required' }, { status: 400 })
    }

    const dateKey = localDateKey(new Date(), tz)
    const { data, error } = await db
      .from('body_weight_logs')
      .upsert({ user_id: userId, date_key: dateKey, weight_lbs: weightLbs }, { onConflict: 'user_id,date_key' })
      .select()
      .single()

    if (error) {
      console.error('[fitness/weight] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ log: data })
  } catch (err) {
    console.error('[fitness/weight] POST error:', err)
    return NextResponse.json({ error: 'Failed to save weight' }, { status: 500 })
  }
}
