import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMonthRange, getWeekRange } from '@/lib/money'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function GET() {
  try {
    const db = createAdminClient()
    const { start: monthStart, end: monthEnd } = getMonthRange()
    const { start: weekStart, end: weekEnd } = getWeekRange()

    const [
      monthExpensesResult,
      weekExpensesResult,
      incomeResult,
      recentTxnsResult,
      categoryResult,
      billsResult,
      subsResult,
      needsReviewResult,
      alertsResult,
      txnCountResult,
    ] = await Promise.allSettled([
      db.from('money_transactions')
        .select('amount')
        .eq('user_id', ZOE_USER_ID)
        .eq('is_income', false)
        .eq('pending', false)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd),
      db.from('money_transactions')
        .select('amount')
        .eq('user_id', ZOE_USER_ID)
        .eq('is_income', false)
        .eq('pending', false)
        .gte('transaction_date', weekStart)
        .lte('transaction_date', weekEnd),
      db.from('money_transactions')
        .select('amount')
        .eq('user_id', ZOE_USER_ID)
        .eq('is_income', true)
        .eq('pending', false)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd),
      db.from('money_transactions')
        .select('id, plaid_transaction_id, merchant_name, name, amount, transaction_date, expense_type, is_income, account_name, pending, category_primary')
        .eq('user_id', ZOE_USER_ID)
        .order('transaction_date', { ascending: false })
        .limit(10),
      db.from('money_transactions')
        .select('expense_type, amount')
        .eq('user_id', ZOE_USER_ID)
        .eq('is_income', false)
        .eq('pending', false)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd),
      db.from('money_bills')
        .select('*')
        .eq('user_id', ZOE_USER_ID)
        .eq('status', 'active')
        .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      db.from('money_subscriptions').select('*').eq('user_id', ZOE_USER_ID).eq('status', 'active'),
      db.from('money_transactions').select('id', { count: 'exact', head: true }).eq('user_id', ZOE_USER_ID).eq('needs_review', true),
      db.from('money_alerts').select('*').eq('user_id', ZOE_USER_ID).eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
      db.from('money_transactions').select('id', { count: 'exact', head: true }).eq('user_id', ZOE_USER_ID),
    ])

    // No Plaid accounts — balances derived from transactions
    const accounts: never[] = []
    const totalAvailable = 0
    const totalCurrent = 0

    // Spending
    const monthExpenses = monthExpensesResult.status === 'fulfilled' ? (monthExpensesResult.value.data ?? []) : []
    const weekExpenses = weekExpensesResult.status === 'fulfilled' ? (weekExpensesResult.value.data ?? []) : []
    const incomeData = incomeResult.status === 'fulfilled' ? (incomeResult.value.data ?? []) : []

    const spendingThisMonth = monthExpenses.reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0)
    const spendingThisWeek = weekExpenses.reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0)
    const incomeThisMonth = incomeData.reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0)

    // Category breakdown
    const catData = categoryResult.status === 'fulfilled' ? (categoryResult.value.data ?? []) : []
    const catMap: Record<string, { amount: number; count: number }> = {}
    for (const t of catData as { expense_type: string; amount: number }[]) {
      const cat = t.expense_type ?? 'other'
      if (!catMap[cat]) catMap[cat] = { amount: 0, count: 0 }
      catMap[cat].amount += Math.abs(t.amount)
      catMap[cat].count++
    }
    const topCategories = Object.entries(catMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)

    // Subscriptions total
    const subs = subsResult.status === 'fulfilled' ? (subsResult.value.data ?? []) : []
    const subsTotal = subs.reduce((s: number, sub: { amount_estimate: number | null }) => s + (sub.amount_estimate ?? 0), 0)

    const txnCount = txnCountResult.status === 'fulfilled' ? (txnCountResult.value.count ?? 0) : 0

    return NextResponse.json({
      total_available_balance: totalAvailable,
      total_current_balance: totalCurrent,
      spending_this_month: spendingThisMonth,
      spending_this_week: spendingThisWeek,
      income_this_month: incomeThisMonth,
      top_categories: topCategories,
      recent_transactions: recentTxnsResult.status === 'fulfilled' ? (recentTxnsResult.value.data ?? []) : [],
      bills_due_soon: billsResult.status === 'fulfilled' ? (billsResult.value.data ?? []) : [],
      active_subscriptions: {
        count: subs.length,
        total: subsTotal,
        items: subs,
      },
      accounts,
      needs_review_count: needsReviewResult.status === 'fulfilled' ? (needsReviewResult.value.count ?? 0) : 0,
      alerts: alertsResult.status === 'fulfilled' ? (alertsResult.value.data ?? []) : [],
      has_transactions: txnCount > 0,
      last_synced_at: null,
    })
  } catch (error) {
    console.error('[Money] summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
