import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId , isUnauthorizedError } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('savings_goals').select('*').eq('user_id', userId).eq('active', true).order('priority', { ascending: true })
    if (error) throw error
    interface GoalRow { current_amount: number | null; target_amount: number | null; [key: string]: unknown }
    const goals = (data ?? []) as GoalRow[]
    const totalSaved = goals.reduce((s, g) => s + (g.current_amount ?? 0), 0)
    const totalTarget = goals.reduce((s, g) => s + (g.target_amount ?? 0), 0)
    return NextResponse.json({ goals, total_saved: totalSaved, total_target: totalTarget }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[goals] error:', error)
    return NextResponse.json({ goals: [], total_saved: 0, total_target: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name || !body.target_amount) return NextResponse.json({ error: 'name and target_amount required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('savings_goals').insert({
      user_id: userId,
      name: body.name,
      goal_type: body.goal_type ?? 'custom',
      target_amount: body.target_amount,
      current_amount: body.current_amount ?? 0,
      target_date: body.target_date ?? null,
      priority: body.priority ?? 50,
      linked_account_id: body.linked_account_id ?? null,
      is_reserved: body.is_reserved ?? true,
      active: true,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ goal: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[goals] POST error:', error)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('savings_goals').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ goal: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[goals] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}
