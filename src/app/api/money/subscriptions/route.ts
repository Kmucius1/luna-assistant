import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

interface SubscriptionRow { status: string; expected_amount: number | null; billing_frequency: string | null; [key: string]: unknown }

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('subscriptions').select('*').eq('user_id', userId).order('expected_amount', { ascending: false })
    if (error) throw error

    const subs = (data ?? []) as SubscriptionRow[]
    const active = subs.filter(s => !['canceled', 'unknown'].includes(s.status))
    const monthlyTotal = active.reduce((sum, s) => {
      const amt = s.expected_amount ?? 0
      if (s.billing_frequency === 'annual') return sum + amt / 12
      if (s.billing_frequency === 'quarterly') return sum + amt / 3
      if (s.billing_frequency === 'weekly') return sum + amt * 4
      if (s.billing_frequency === 'biweekly') return sum + amt * 2
      return sum + amt
    }, 0)

    return NextResponse.json({ subscriptions: subs, count: active.length, monthly_total: monthlyTotal }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[subscriptions] error:', error)
    return NextResponse.json({ subscriptions: [], count: 0, monthly_total: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('subscriptions').insert({
      user_id: userId,
      merchant_normalized: body.merchant_normalized,
      display_name: body.display_name ?? body.merchant_normalized,
      expected_amount: body.expected_amount ?? null,
      billing_frequency: body.billing_frequency ?? 'monthly',
      account_id: body.account_id ?? null,
      ownership_type: body.ownership_type ?? 'personal',
      status: body.status ?? 'review',
      notes: body.notes ?? null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('[subscriptions] POST error:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json() as { id: string; status?: string; [key: string]: unknown }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Spec: "When Zoe marks a subscription canceled, watch for later
    // charges and alert her" — stamping canceled_at is what lets the
    // duplicate detector recognize a stray post-cancellation charge.
    const payload: Record<string, unknown> = { ...updates }
    if (updates.status === 'canceled') payload.canceled_at = new Date().toISOString()

    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('subscriptions').update(payload).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('[subscriptions] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}
