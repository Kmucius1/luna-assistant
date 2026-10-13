import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId , isUnauthorizedError } from '@/lib/money/auth'
import { todayKey } from '@/lib/luna/today'

// income_events.confirmed gates whether computeSafeToSpend() counts a
// deposit at all — nothing writes to this table anywhere else in the app
// yet, so without this route confirmed income can never be non-zero.
export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const today = todayKey()
    const { data, error } = await db.from('income_events').select('*').eq('user_id', userId).gte('expected_date', today).order('expected_date', { ascending: true })
    if (error) throw error
    return NextResponse.json({ income: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[income] error:', error)
    return NextResponse.json({ income: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.source_name || body.amount == null || !body.expected_date) {
      return NextResponse.json({ error: 'source_name, amount, and expected_date required' }, { status: 400 })
    }
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('income_events').insert({
      user_id: userId,
      source_name: body.source_name,
      income_type: body.income_type ?? 'earned_income',
      amount: body.amount,
      expected_date: body.expected_date,
      confirmed: body.confirmed ?? true,
      include_in_plan: true,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ income: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[income] POST error:', error)
    return NextResponse.json({ error: 'Failed to save income' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('income_events').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ income: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[income] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 })
  }
}
