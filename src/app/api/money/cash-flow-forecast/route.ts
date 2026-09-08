import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId, isUnauthorizedError } from '@/lib/money/auth'
import { computeSafeToSpend } from '@/lib/money/safeToSpend'

const WINDOWS = [7, 30, 60, 90]

function todayKey(): string { return new Date().toISOString().split('T')[0] }
function daysFromNow(n: number): string { return new Date(Date.now() + n * 86_400_000).toISOString().split('T')[0] }

interface BillRow { expected_amount: number | null; due_date: string | null }
interface SubRow { expected_amount: number | null; next_expected_date: string | null }
interface IncomeRow { amount: number; expected_date: string | null; confirmed: boolean }
interface OppRow { potential_value: number | null; probability_pct: number | null; expected_close_date: string | null }

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const today = todayKey()

    const [safeToSpend, billsRes, subsRes, incomeRes, oppsRes] = await Promise.all([
      computeSafeToSpend(db, userId),
      db.from('bills').select('expected_amount, due_date').eq('user_id', userId).in('status', ['upcoming', 'needs_review']).gte('due_date', today),
      db.from('subscriptions').select('expected_amount, next_expected_date').eq('user_id', userId).eq('status', 'keep').gte('next_expected_date', today),
      db.from('income_events').select('amount, expected_date, confirmed').eq('user_id', userId).gte('expected_date', today),
      db.from('dryp_opportunities').select('potential_value, probability_pct, expected_close_date').eq('user_id', userId).eq('status', 'open'),
    ])

    const bills = (billsRes.data ?? []) as BillRow[]
    const subs = (subsRes.data ?? []) as SubRow[]
    const income = (incomeRes.data ?? []) as IncomeRow[]
    const opps = (oppsRes.data ?? []) as OppRow[]

    const forecast = WINDOWS.map(days => {
      const windowEnd = daysFromNow(days)
      const requiredOut = bills.filter(b => b.due_date && b.due_date <= windowEnd).reduce((s, b) => s + (b.expected_amount ?? 0), 0)
        + subs.filter(s => s.next_expected_date && s.next_expected_date <= windowEnd).reduce((s, sub) => s + (sub.expected_amount ?? 0), 0)
      const confirmedIn = income.filter(i => i.confirmed && i.expected_date && i.expected_date <= windowEnd).reduce((s, i) => s + i.amount, 0)
      const expectedIn = income.filter(i => !i.confirmed && i.expected_date && i.expected_date <= windowEnd).reduce((s, i) => s + i.amount, 0)
      // Pipeline is never counted as actual cash — only a probability-
      // weighted "possible" figure, kept in its own bucket.
      const possibleIn = opps.filter(o => o.expected_close_date && o.expected_close_date <= windowEnd)
        .reduce((s, o) => s + ((o.potential_value ?? 0) * ((o.probability_pct ?? 0) / 100)), 0)

      return {
        days,
        confirmed: { moneyIn: Math.round(confirmedIn * 100) / 100, moneyOut: Math.round(requiredOut * 100) / 100 },
        expected: { moneyIn: Math.round(expectedIn * 100) / 100 },
        possible: { moneyIn: Math.round(possibleIn * 100) / 100 },
        // Projected balance only uses confirmed money — expected/possible
        // are shown separately, never folded into a number that looks final.
        projectedBalance: Math.round((safeToSpend.postedBalances + confirmedIn - requiredOut) * 100) / 100,
      }
    })

    return NextResponse.json({ forecast, currentBalance: Math.round(safeToSpend.postedBalances * 100) / 100 })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('[money/cash-flow-forecast] error:', error)
    return NextResponse.json({ error: 'Could not compute forecast' }, { status: 500 })
  }
}
