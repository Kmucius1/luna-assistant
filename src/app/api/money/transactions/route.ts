import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMonthRange, getWeekRange } from '@/lib/money'

const ZOE_USER_ID = '98f5b277-bb63-41d5-89ec-0edadc1e2858'

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') ?? 'month'
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const type = searchParams.get('type')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db
      .from('money_transactions')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('transaction_date', { ascending: false })

    if (period === 'month') {
      const { start, end } = getMonthRange()
      query = query.gte('transaction_date', start).lte('transaction_date', end)
    } else if (period === 'week') {
      const { start, end } = getWeekRange()
      query = query.gte('transaction_date', start).lte('transaction_date', end)
    }

    if (category) query = query.eq('category_primary', category)
    if (search) {
      query = query.or(`merchant_name.ilike.%${search}%,name.ilike.%${search}%`)
    }
    if (type === 'income') query = query.eq('is_income', true)
    if (type === 'expense') query = query.eq('is_income', false)
    if (type === 'business') query = query.eq('is_business_expense', true)
    if (type === 'subscription') query = query.eq('is_subscription', true)
    if (type === 'bill') query = query.eq('is_bill', true)

    const { data, error } = await query.limit(200)

    if (error) {
      console.error('[transactions] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const transactions = data ?? []
    const total_spent = transactions
      .filter((t: { is_income?: boolean; amount: number }) => !t.is_income)
      .reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    const total_income = transactions
      .filter((t: { is_income?: boolean; amount: number }) => t.is_income)
      .reduce((s: number, t: { amount: number }) => s + t.amount, 0)

    return NextResponse.json({ transactions, total_spent, total_income, count: transactions.length })
  } catch (error) {
    console.error('[transactions] error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json() as {
      merchant_name?: string
      name?: string
      amount: number
      transaction_date: string
      is_income?: boolean
      expense_type?: string
      category_primary?: string
      account_name?: string
      notes?: string
      is_business_expense?: boolean
    }

    const { data, error } = await db
      .from('money_transactions')
      .insert({
        ...body,
        user_id: ZOE_USER_ID,
        name: body.name || body.merchant_name || 'Manual entry',
        plaid_transaction_id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        is_income: body.is_income ?? false,
        pending: false,
        needs_review: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[transactions] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transaction: data })
  } catch (error) {
    console.error('[transactions] POST error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
