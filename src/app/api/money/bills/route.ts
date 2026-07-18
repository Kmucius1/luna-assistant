import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

interface BillRow { due_date: string | null; expected_amount: number | null; minimum_amount: number | null; [key: string]: unknown }

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('bills').select('*').eq('user_id', userId).neq('status', 'canceled').order('due_date', { ascending: true })
    if (error) throw error

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const bills = ((data ?? []) as BillRow[]).map(bill => {
      const daysUntil = bill.due_date ? Math.ceil((new Date(bill.due_date).getTime() - today.getTime()) / 86_400_000) : null
      return { ...bill, days_until: daysUntil }
    })
    const totalMonthly = bills.reduce((s, b) => s + (b.expected_amount ?? b.minimum_amount ?? 0), 0)

    return NextResponse.json({ bills, total_monthly: totalMonthly, count: bills.length }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[bills] error:', error)
    return NextResponse.json({ bills: [], total_monthly: 0, count: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('bills').insert({
      user_id: userId,
      name: body.name,
      merchant_normalized: body.merchant_normalized ?? null,
      account_id: body.account_id ?? null,
      expected_amount: body.expected_amount ?? null,
      minimum_amount: body.minimum_amount ?? null,
      due_date: body.due_date ?? null,
      date_is_confirmed: body.date_is_confirmed ?? false,
      autopay_status: body.autopay_status ?? 'unknown',
      amount_type: body.amount_type ?? 'variable',
      requirement_type: body.requirement_type ?? 'required',
      ownership_type: body.ownership_type ?? 'personal',
      notes: body.notes ?? null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ bill: data })
  } catch (error) {
    console.error('[bills] POST error:', error)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('bills').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ bill: data })
  } catch (error) {
    console.error('[bills] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}
