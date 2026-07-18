import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'
import { buildFingerprint } from '@/lib/money/fingerprint'

interface TransactionRow { direction: string; ownership_type: string; amount: number; [key: string]: unknown }

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const ownership = searchParams.get('ownership')
    const search = searchParams.get('search')
    const accountId = searchParams.get('account_id')
    const reviewStatus = searchParams.get('review_status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = db.from('transactions').select('*').eq('user_id', userId)
      .order('posted_date', { ascending: false, nullsFirst: false })

    if (category) query = query.eq('category', category)
    if (ownership) query = query.eq('ownership_type', ownership)
    if (accountId) query = query.eq('account_id', accountId)
    if (reviewStatus) query = query.eq('review_status', reviewStatus)
    if (startDate) query = query.gte('posted_date', startDate)
    if (endDate) query = query.lte('posted_date', endDate)
    if (search) query = query.or(`merchant_normalized.ilike.%${search}%,merchant_raw.ilike.%${search}%`)

    const { data, error } = await query.limit(300)
    if (error) throw error

    const transactions = (data ?? []) as TransactionRow[]
    const totalSpent = transactions.filter(t => t.direction === 'outflow' && t.ownership_type === 'personal').reduce((s, t) => s + t.amount, 0)
    const totalIncome = transactions.filter(t => t.direction === 'inflow' && t.ownership_type !== 'transfer').reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({ transactions, total_spent: totalSpent, total_income: totalIncome, count: transactions.length }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[transactions] error:', error)
    return NextResponse.json({ transactions: [], total_spent: 0, total_income: 0, count: 0 })
  }
}

// Manual entry — a single transaction typed in directly rather than imported.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      account_id: string; merchant: string; amount: number; direction: 'inflow' | 'outflow'
      transaction_date?: string; category?: string; ownership_type?: string; notes?: string
    }
    if (!body.account_id || !body.merchant || !body.amount) {
      return NextResponse.json({ error: 'account_id, merchant, and amount are required' }, { status: 400 })
    }
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const date = body.transaction_date ?? new Date().toISOString().split('T')[0]
    const fingerprint = buildFingerprint({
      userId, accountId: body.account_id, postedDate: date, merchantNormalized: body.merchant, amount: Math.abs(body.amount), direction: body.direction,
    })

    const { data, error } = await db.from('transactions').insert({
      user_id: userId,
      account_id: body.account_id,
      transaction_date: date,
      posted_date: date,
      merchant_raw: body.merchant,
      merchant_normalized: body.merchant,
      amount: Math.abs(body.amount),
      direction: body.direction,
      status: 'posted',
      category: body.category ?? 'unknown',
      ownership_type: body.ownership_type ?? 'unknown',
      notes: body.notes ?? null,
      fingerprint,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (error) {
    console.error('[transactions] POST error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}

// Zoe can override categories, merchants, dates, and duplicate decisions
// (acceptance test 12).
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json() as { id: string; [key: string]: unknown }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('transactions').update({ ...updates, review_status: updates.review_status ?? 'confirmed' }).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ transaction: data })
  } catch (error) {
    console.error('[transactions] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}
