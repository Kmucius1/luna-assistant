import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SAFE_DAYS = 4 // cooked protein/mixed dishes — 3-4 days refrigerated

function todayKey(): string { return new Date().toISOString().split('T')[0] }
function addDays(dateKey: string, days: number): string {
  const d = new Date(dateKey)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('cooked_leftovers')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('safe_until', { ascending: true })
    if (error) throw error

    const today = todayKey()
    const leftovers = (data ?? []).map((row: { safe_until: string }) => ({ ...row, isPastSafeWindow: row.safe_until < today }))
    return NextResponse.json({ leftovers })
  } catch (error) {
    console.error('[food/cooked-leftovers] GET error:', error)
    return NextResponse.json({ leftovers: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const mealName: string = typeof body.meal_name === 'string' ? body.meal_name.trim() : ''
    const mealType: string | null = ['breakfast', 'lunch', 'dinner'].includes(body.meal_type) ? body.meal_type : null
    if (!mealName) return NextResponse.json({ error: 'meal_name is required' }, { status: 400 })

    const cookedAt = todayKey()
    const { data, error } = await supabase
      .from('cooked_leftovers')
      .insert({ user_id: user.id, meal_name: mealName, meal_type: mealType, cooked_at: cookedAt, safe_until: addDays(cookedAt, SAFE_DAYS) })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ leftover: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/cooked-leftovers] POST error:', message)
    return NextResponse.json({ error: 'Could not save that', detail: message }, { status: 500 })
  }
}
