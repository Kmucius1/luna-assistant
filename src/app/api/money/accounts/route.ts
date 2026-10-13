import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId , isUnauthorizedError } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('financial_accounts')
      .select('*').eq('user_id', userId).eq('is_archived', false).order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ accounts: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    if (isUnauthorizedError(err)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[money/accounts] GET error:', err)
    return NextResponse.json({ accounts: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('financial_accounts').insert({
      user_id: userId,
      nickname: body.nickname,
      institution_name: body.institution_name ?? null,
      account_type: body.account_type,
      last_four: body.last_four ?? null,
      ownership_type: body.ownership_type ?? 'personal',
      current_balance: body.current_balance ?? null,
      available_balance: body.available_balance ?? null,
      credit_limit: body.credit_limit ?? null,
      statement_balance: body.statement_balance ?? null,
      minimum_payment: body.minimum_payment ?? null,
      payment_due_date: body.payment_due_date ?? null,
      include_in_safe_to_spend: body.include_in_safe_to_spend ?? true,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ account: data })
  } catch (err) {
    if (isUnauthorizedError(err)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[money/accounts] POST error:', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('financial_accounts').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ account: data })
  } catch (err) {
    if (isUnauthorizedError(err)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[money/accounts] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}
