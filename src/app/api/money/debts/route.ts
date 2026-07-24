import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('debts').select('*').eq('user_id', userId).order('due_date', { ascending: true })
    if (error) throw error
    interface DebtRow { balance: number | null; minimum_payment: number | null; [key: string]: unknown }
    const debts = (data ?? []) as DebtRow[]
    const totalBalance = debts.reduce((s, d) => s + (d.balance ?? 0), 0)
    const totalMinimums = debts.reduce((s, d) => s + (d.minimum_payment ?? 0), 0)
    return NextResponse.json({ debts, total_balance: totalBalance, total_minimums: totalMinimums }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[debts] error:', error)
    return NextResponse.json({ debts: [], total_balance: 0, total_minimums: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.creditor || body.balance == null) return NextResponse.json({ error: 'creditor and balance required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('debts').insert({
      user_id: userId,
      creditor: body.creditor,
      balance: body.balance,
      balance_is_estimated: body.balance_is_estimated ?? false,
      credit_limit: body.credit_limit ?? null,
      apr: body.apr ?? null,
      minimum_payment: body.minimum_payment ?? null,
      due_date: body.due_date ?? null,
      target_payoff_date: body.target_payoff_date ?? null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ debt: data })
  } catch (error) {
    console.error('[debts] POST error:', error)
    return NextResponse.json({ error: 'Failed to create debt' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('debts').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ debt: data })
  } catch (error) {
    console.error('[debts] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 })
  }
}
