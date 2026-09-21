import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mondayKeyOf } from '@/lib/luna/today'

function mondayOf(date: Date): string { return mondayKeyOf(date) }

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const weekStart = mondayOf(new Date())
    const { data, error } = await supabase
      .from('food_weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ plan: data ?? null })
  } catch (error) {
    console.error('[food/weekly-plan] GET error:', error)
    return NextResponse.json({ plan: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const checkedItems: string[] = Array.isArray(body.checked_items) ? body.checked_items : []

    const weekStart = mondayOf(new Date())
    const { data, error } = await supabase
      .from('food_weekly_plans')
      .update({ checked_items: checkedItems })
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ plan: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/weekly-plan] PATCH error:', message)
    return NextResponse.json({ error: 'Failed to update checklist', detail: message }, { status: 500 })
  }
}
