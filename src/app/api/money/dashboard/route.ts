import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId , isUnauthorizedError } from '@/lib/money/auth'
import { computeSafeToSpend } from '@/lib/money/safeToSpend'
import { todayKey, daysFromNow } from '@/lib/luna/today'


interface BillRow { due_date: string | null; expected_amount: number | null; minimum_amount: number | null }
interface TxnRow { amount: number; ownership_type: string; direction: string; category: string | null; account_id?: string; id?: string }
interface SavingsRow { current_amount: number | null }
interface DebtRow { balance: number | null }
interface AccountIdRow { id: string }

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const today = todayKey()

    const [
      safeToSpend,
      billsRes,
      subsRes,
      duplicatesRes,
      txnsRes,
      reimbursableRes,
      savingsRes,
      debtsRes,
      subsReviewRes,
      dupesPreviewRes,
      goalsPreviewRes,
    ] = await Promise.all([
      computeSafeToSpend(db, userId),
      db.from('bills').select('id, name, due_date, expected_amount, minimum_amount, status, autopay_status, account_id').eq('user_id', userId).in('status', ['upcoming', 'needs_review']).gte('due_date', today).lte('due_date', daysFromNow(31)),
      db.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'review'),
      db.from('duplicate_charge_alerts').select('id').eq('user_id', userId).eq('status', 'open'),
      db.from('transactions').select('amount, ownership_type, direction, category').eq('user_id', userId).gte('posted_date', daysFromNow(-30)),
      db.from('transactions').select('amount').eq('user_id', userId).eq('reimbursable', true).eq('review_status', 'unreviewed'),
      db.from('savings_goals').select('current_amount').eq('user_id', userId).eq('active', true),
      db.from('debts').select('balance').eq('user_id', userId),
      db.from('subscriptions').select('display_name, merchant_normalized, expected_amount').eq('user_id', userId).eq('status', 'review').limit(5),
      db.from('duplicate_charge_alerts').select('id, reason, severity').eq('user_id', userId).eq('status', 'open').order('severity', { ascending: false }).limit(5),
      db.from('savings_goals').select('id, name, goal_type, current_amount, target_amount').eq('user_id', userId).eq('active', true).order('priority', { ascending: true }).limit(3),
    ])

    // Visibility-only income preview for the Weekly Reset's money step —
    // confirmed, plan-included sources only, no unconfirmed/paused guesses.
    const { data: incomeRows } = await db
      .from('income_events')
      .select('source_name, amount')
      .eq('user_id', userId)
      .eq('confirmed', true)
      .eq('include_in_plan', true)

    const bills = (billsRes.data ?? []) as BillRow[]
    const billsDueToday = bills.filter(b => b.due_date === today)
    const billsDueThisWeek = bills.filter(b => b.due_date! <= daysFromNow(7))
    const billsDueThisMonth = bills

    const txns = (txnsRes.data ?? []) as TxnRow[]
    const personalSpending = txns.filter(t => t.direction === 'outflow' && t.ownership_type === 'personal').reduce((s, t) => s + t.amount, 0)
    const businessSpending = txns.filter(t => t.direction === 'outflow' && ['dryp_business', 'client_expense', 'linkd_up_event'].includes(t.ownership_type)).reduce((s, t) => s + t.amount, 0)
    const unknownCount = txns.filter(t => t.ownership_type === 'unknown' || t.category === 'unknown').length

    const businessExpensesPaidPersonallyRes = await db.from('transactions')
      .select('id, account_id').eq('user_id', userId).in('ownership_type', ['dryp_business', 'client_expense', 'linkd_up_event', 'shared_expense'])
    const boRows = (businessExpensesPaidPersonallyRes.data ?? []) as TxnRow[]
    const boAccountIds = [...new Set(boRows.map(t => t.account_id))]
    const { data: personalAccountsData } = boAccountIds.length
      ? await db.from('financial_accounts').select('id').in('id', boAccountIds).eq('ownership_type', 'personal')
      : { data: [] as AccountIdRow[] }
    const personalAccounts = (personalAccountsData ?? []) as AccountIdRow[]
    const personalAccountIds = new Set(personalAccounts.map(a => a.id))
    const businessExpensesPaidPersonally = boRows.filter(t => t.account_id && personalAccountIds.has(t.account_id)).length

    const reimbursementsOwed = ((reimbursableRes.data ?? []) as TxnRow[]).reduce((s, t) => s + t.amount, 0)
    const savingsTotal = ((savingsRes.data ?? []) as SavingsRow[]).reduce((s, g) => s + (g.current_amount ?? 0), 0)
    const debtTotal = ((debtsRes.data ?? []) as DebtRow[]).reduce((s, d) => s + (d.balance ?? 0), 0)

    // Unified alerts preview for the hero-adjacent "Money Alerts" card —
    // combines duplicate/unusual-charge alerts with subscriptions flagged
    // for review, each with a plain reason string, newest/highest-severity first.
    interface DupeRow { id: string; reason: string; severity: string }
    interface SubReviewRow { display_name: string | null; merchant_normalized: string; expected_amount: number | null }
    const alertsPreview = [
      ...((dupesPreviewRes.data ?? []) as DupeRow[]).map(d => ({ id: d.id, kind: 'duplicate' as const, reason: d.reason, severity: d.severity })),
      ...((subsReviewRes.data ?? []) as SubReviewRow[]).map(s => ({ id: s.merchant_normalized, kind: 'subscription' as const, reason: `${s.display_name ?? s.merchant_normalized} needs review`, severity: 'low' as const })),
    ].slice(0, 5)

    return NextResponse.json({
      safe_to_spend: safeToSpend,
      bills_due_today: billsDueToday,
      bills_due_this_week: billsDueThisWeek,
      bills_due_this_month: billsDueThisMonth,
      bills_preview: bills.slice(0, 3),
      subscription_alerts_count: (subsRes.data ?? []).length,
      duplicate_charges_count: (duplicatesRes.data ?? []).length,
      alerts_preview: alertsPreview,
      alerts_total_count: (dupesPreviewRes.data ?? []).length + (subsReviewRes.data ?? []).length,
      personal_spending: personalSpending,
      business_spending: businessSpending,
      reimbursements_owed: reimbursementsOwed,
      business_expenses_paid_personally: businessExpensesPaidPersonally,
      savings_total: savingsTotal,
      savings_preview: goalsPreviewRes.data ?? [],
      debt_total: debtTotal,
      unknown_transactions_count: unknownCount,
      income_sources: (incomeRows ?? []) as { source_name: string; amount: number }[],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    console.error('[money/dashboard] error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
