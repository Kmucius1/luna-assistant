import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('money_preferences').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    return NextResponse.json({ preferences: data ?? null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[money/settings] GET error:', error)
    return NextResponse.json({ preferences: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('money_preferences').upsert({
      user_id: userId,
      checking_safety_buffer: body.checking_safety_buffer,
      weekly_grocery_target: body.weekly_grocery_target,
      weekly_gas_target: body.weekly_gas_target,
      weekly_personal_target: body.weekly_personal_target,
      emergency_goal: body.emergency_goal,
      store_switch_savings_threshold: body.store_switch_savings_threshold,
      planning_cutoff_date: body.planning_cutoff_date,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select().single()
    if (error) throw error
    return NextResponse.json({ preferences: data })
  } catch (error) {
    console.error('[money/settings] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
