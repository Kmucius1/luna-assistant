import type { SupabaseClient } from '@supabase/supabase-js'

export interface SafeToSpendBreakdown {
  postedBalances: number
  confirmedIncome: number
  pendingOutflows: number
  billsDue: number
  groceryReserve: number
  gasReserve: number
  necessityReserve: number
  minimumDebtPayments: number
  plannedSavings: number
  safetyBuffer: number
  safeToSpend: number
  daysUntilNextConfirmedIncome: number | null
  dailySpendingAmount: number | null
  cutoffDate: string
  // Fields the schema doesn't yet have a precise number for — always 0,
  // called out explicitly rather than silently folded into the total.
  notComputed: string[]
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0]
}

// posted checking/cash + confirmed income - pending outflows - bills due
// - grocery/gas/necessity reserves - minimum debt payments - planned
// savings - safety buffer = safe to spend. Exactly the formula in the spec.
export async function computeSafeToSpend(db: SupabaseClient, userId: string): Promise<SafeToSpendBreakdown> {
  const { data: prefs } = await db.from('money_preferences').select('*').eq('user_id', userId).maybeSingle()
  const safetyBuffer = prefs?.checking_safety_buffer ?? 100
  const weeklyGrocery = prefs?.weekly_grocery_target ?? 0
  const weeklyGas = prefs?.weekly_gas_target ?? 0
  const today = todayKey()
  const cutoffDate: string = prefs?.planning_cutoff_date ?? new Date(Date.now() + 14 * 86_400_000).toISOString().split('T')[0]
  const daysToCutoff = Math.max(1, Math.round((new Date(cutoffDate).getTime() - Date.now()) / 86_400_000))

  const { data: accounts } = await db.from('financial_accounts')
    .select('current_balance, account_type, ownership_type, include_in_safe_to_spend, is_archived')
    .eq('user_id', userId).eq('is_archived', false).eq('include_in_safe_to_spend', true).eq('ownership_type', 'personal')
    .in('account_type', ['checking', 'cash'])
  const postedBalances = (accounts ?? []).reduce((s, a) => s + (a.current_balance ?? 0), 0)

  const { data: income } = await db.from('income_events')
    .select('amount, expected_date, confirmed')
    .eq('user_id', userId).eq('confirmed', true).lte('expected_date', cutoffDate).gte('expected_date', today)
  const confirmedIncome = (income ?? []).reduce((s, i) => s + i.amount, 0)

  const { data: nextIncome } = await db.from('income_events')
    .select('expected_date').eq('user_id', userId).eq('confirmed', true).gte('expected_date', today)
    .order('expected_date', { ascending: true }).limit(1).maybeSingle()
  const daysUntilNextConfirmedIncome = nextIncome?.expected_date
    ? Math.max(1, Math.round((new Date(nextIncome.expected_date).getTime() - Date.now()) / 86_400_000))
    : null

  const { data: pending } = await db.from('transactions')
    .select('amount, account_id, direction, status')
    .eq('user_id', userId).eq('status', 'pending').eq('direction', 'outflow')
  const { data: includedAccountRows } = await db.from('financial_accounts')
    .select('id').eq('user_id', userId).eq('is_archived', false).eq('include_in_safe_to_spend', true).eq('ownership_type', 'personal').in('account_type', ['checking', 'cash'])
  const includedIds = new Set((includedAccountRows ?? []).map(a => a.id))
  const pendingOutflows = (pending ?? []).filter(p => includedIds.has(p.account_id)).reduce((s, p) => s + p.amount, 0)

  const { data: bills } = await db.from('bills')
    .select('expected_amount, minimum_amount, due_date, status, ownership_type')
    .eq('user_id', userId).eq('ownership_type', 'personal').lte('due_date', cutoffDate).gte('due_date', today)
    .in('status', ['upcoming', 'needs_review'])
  const billsDue = (bills ?? []).reduce((s, b) => s + (b.expected_amount ?? b.minimum_amount ?? 0), 0)

  const scale = daysToCutoff / 7
  const groceryReserve = weeklyGrocery * scale
  const gasReserve = weeklyGas * scale
  // No schema field for a medication/necessity weekly target yet.
  const necessityReserve = 0

  const { data: debts } = await db.from('debts').select('minimum_payment, due_date').eq('user_id', userId).lte('due_date', cutoffDate).gte('due_date', today)
  const minimumDebtPayments = (debts ?? []).reduce((s, d) => s + (d.minimum_payment ?? 0), 0)

  // savings_goals has no per-period contribution amount field in the given
  // schema — treated as 0 until Zoe defines a concrete contribution rule.
  const plannedSavings = 0

  const safeToSpend = postedBalances + confirmedIncome - pendingOutflows - billsDue
    - groceryReserve - gasReserve - necessityReserve - minimumDebtPayments - plannedSavings - safetyBuffer

  const dailySpendingAmount = daysUntilNextConfirmedIncome ? safeToSpend / daysUntilNextConfirmedIncome : null

  return {
    postedBalances, confirmedIncome, pendingOutflows, billsDue,
    groceryReserve, gasReserve, necessityReserve, minimumDebtPayments, plannedSavings, safetyBuffer,
    safeToSpend, daysUntilNextConfirmedIncome, dailySpendingAmount, cutoffDate,
    notComputed: ['medication_and_necessity_reserve', 'planned_savings_per_period'],
  }
}
