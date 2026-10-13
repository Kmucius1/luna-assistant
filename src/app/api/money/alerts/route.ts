import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId , isUnauthorizedError } from '@/lib/money/auth'
import { todayKey, daysFromNow } from '@/lib/luna/today'


interface BillRow { id: string; name: string; due_date: string; expected_amount: number | null }

// Bills don't fire an event when they become due — the calendar just
// advances — so alerts have to be regenerated on read, not written once at
// import time. dedupe_key keeps this idempotent: re-running never creates
// a second alert for the same bill/due-date pair.
async function generateBillAlerts(db: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await db
    .from('bills')
    .select('id, name, due_date, expected_amount')
    .eq('user_id', userId)
    .in('status', ['upcoming', 'needs_review'])
    .lte('due_date', daysFromNow(3))
  const bills = (data ?? []) as BillRow[]
  if (!bills.length) return

  const today = todayKey()
  const rows = bills.map(b => ({
    user_id: userId,
    kind: (b.due_date < today ? 'bill_overdue' : 'bill_due_soon') as 'bill_overdue' | 'bill_due_soon',
    title: b.due_date < today ? `${b.name} is overdue` : `${b.name} is due soon`,
    detail: `${b.expected_amount ? `$${b.expected_amount.toFixed(0)} — ` : ''}due ${b.due_date}`,
    dedupe_key: `bill:${b.id}:${b.due_date}`,
  }))
  await db.from('money_alerts').upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
}

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()

    await generateBillAlerts(db, userId).catch(() => {})

    const [alertsRes, dupesRes, subsRes] = await Promise.all([
      db.from('money_alerts').select('*').eq('user_id', userId).eq('status', 'unread').order('created_at', { ascending: false }).limit(20),
      db.from('duplicate_charge_alerts').select('id, reason, severity, created_at').eq('user_id', userId).eq('status', 'open').order('created_at', { ascending: false }).limit(10),
      db.from('subscriptions').select('id, display_name, merchant_normalized, expected_amount').eq('user_id', userId).eq('status', 'review').limit(10),
    ])

    interface MoneyAlertRow { id: string; kind: string; title: string; detail: string | null; status: string; created_at: string }
    interface DupeRow { id: string; reason: string; severity: string; created_at: string }
    interface SubReviewRow { id: string; display_name: string | null; merchant_normalized: string; expected_amount: number | null }

    const billAlerts = ((alertsRes.data ?? []) as MoneyAlertRow[]).map(a => ({ ...a, source: 'bill' as const }))
    const dupeAlerts = ((dupesRes.data ?? []) as DupeRow[]).map(d => ({
      id: d.id, kind: 'duplicate_charge' as const, title: 'Possible duplicate charge', detail: d.reason,
      status: 'unread', created_at: d.created_at, source: 'duplicate' as const,
    }))
    const subAlerts = ((subsRes.data ?? []) as SubReviewRow[]).map(s => ({
      id: s.id, kind: 'subscription_review' as const, title: `${s.display_name ?? s.merchant_normalized} needs review`,
      detail: s.expected_amount ? `$${s.expected_amount.toFixed(0)}/mo` : null, status: 'unread', created_at: null, source: 'subscription' as const,
    }))

    const alerts = [...billAlerts, ...dupeAlerts, ...subAlerts]
    return NextResponse.json({ alerts, count: alerts.length })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[alerts] error:', error)
    return NextResponse.json({ alerts: [], count: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action = 'dismiss' } = await req.json() as { id: string; action?: 'dismiss' | 'read' | 'resolve' }
    if (!id) return NextResponse.json({ error: 'Missing alert id' }, { status: 400 })

    const status = action === 'dismiss' ? 'dismissed' : action === 'resolve' ? 'resolved' : 'read'
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('money_alerts').update({ status }).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ alert: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[alerts] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
