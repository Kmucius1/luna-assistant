import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId, isUnauthorizedError } from '@/lib/money/auth'
import { todayKey } from '@/lib/luna/today'

export const PAYDAY_CATEGORIES = [
  'bills', 'business_expenses', 'savings', 'debt', 'groceries', 'gas_car',
  'personal_necessities', 'beauty_self_care', 'clothing_work_necessities', 'fun_spending', 'buffer',
] as const

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db
      .from('payday_allocations')
      .select('*')
      .eq('user_id', userId)
      .order('pay_date', { ascending: false })
      .limit(10)
    if (error) throw error

    return NextResponse.json({ allocations: data ?? [] })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('[money/payday] GET error:', error)
    return NextResponse.json({ allocations: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveMoneyUserId()
    const body = await req.json().catch(() => ({}))
    const totalAmount: number = Number(body.total_amount)
    const allocations: Record<string, number> = body.allocations ?? {}
    if (!totalAmount) return NextResponse.json({ error: 'total_amount is required' }, { status: 400 })

    const db = createAdminClient()
    const { data, error } = await db.from('payday_allocations').insert({
      user_id: userId,
      pay_date: body.pay_date || todayKey(),
      total_amount: totalAmount,
      allocations,
    }).select().single()
    if (error) throw error

    return NextResponse.json({ allocation: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const message = error instanceof Error ? error.message : String(error)
    console.error('[money/payday] POST error:', message)
    return NextResponse.json({ error: 'Could not save that allocation', detail: message }, { status: 500 })
  }
}
