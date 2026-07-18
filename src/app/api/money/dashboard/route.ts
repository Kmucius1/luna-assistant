import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'
import { computeSafeToSpend } from '@/lib/money/safeToSpend'

function todayKey(): string { return new Date().toISOString().split('T')[0] }
function daysFromNow(n: number): string { return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0] }

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
    ] = await Promise.all([
      computeSafeToSpend(db, userId),
      db.from('bills').select('id, name, due_date, expected_amount, minimum_amount, status').eq('user_id', userId).in('status', ['upcoming', 'needs_review']).gte('due_date', today).lte('due_date', daysFromNow(31)),
      db.from('subscriptions').select('id').eq('user_id', userId).eq('status', 'review'),
      db.from('duplicate_charge_alerts').select('id').eq('user_id', userId).eq('status', 'open'),
      db.from('transactions').select('amount, ownership_type, direction, category').eq('user_id', userId).gte('posted_date', daysFromNow(-30)),
      db.from('transactions').select('amount').eq('user_id', userId).eq('reimbursable', true).eq('review_status', 'unreviewed'),
      db.from('savings_goals').select('current_amount').eq('user_id', userId).eq('active', true),
      db.from('debts').select('balance').eq('user_id', userId),
    ])

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

    return NextResponse.json({
      safe_to_spend: safeToSpend,
      bills_due_today: billsDueToday,
      bills_due_this_week: billsDueThisWeek,
      bills_due_this_month: billsDueThisMonth,
      subscription_alerts_count: (subsRes.data ?? []).length,
      duplicate_charges_count: (duplicatesRes.data ?? []).length,
      personal_spending: personalSpending,
      business_spending: businessSpending,
      reimbursements_owed: reimbursementsOwed,
      business_expenses_paid_personally: businessExpensesPaidPersonally,
      savings_total: savingsTotal,
      debt_total: debtTotal,
      unknown_transactions_count: unknownCount,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[money/dashboard] error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
