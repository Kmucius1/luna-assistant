import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayKey, daysFromNow, monthBoundsKeys } from '@/lib/luna/today'

function monthBounds(): { start: string; end: string } { return monthBoundsKeys() }

interface BillingRow { retainer_amount: number | null; billing_type: string; contract_start: string | null; contract_end: string | null }
interface OpportunityRow { potential_value: number | null; probability_pct: number | null }
interface InvoiceRow { amount: number; paid_date: string | null }
interface TxnRow { amount: number }

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = todayKey()
    const { start: monthStart, end: monthEnd } = monthBounds()
    const in30Days = daysFromNow(30)

    const [billingRes, oppsRes, invoicesRes, expensesRes] = await Promise.all([
      supabase.from('dryp_client_billing').select('retainer_amount, billing_type, contract_start, contract_end').eq('user_id', user.id),
      supabase.from('dryp_opportunities').select('potential_value, probability_pct').eq('user_id', user.id).eq('status', 'open'),
      supabase.from('dryp_invoices').select('amount, paid_date').eq('user_id', user.id).eq('status', 'paid').gte('paid_date', monthStart).lte('paid_date', monthEnd),
      supabase.from('transactions').select('amount').eq('user_id', user.id).eq('direction', 'outflow').in('ownership_type', ['dryp_business', 'client_expense']).gte('posted_date', monthStart).lte('posted_date', monthEnd),
    ])

    const billing = (billingRes.data ?? []) as BillingRow[]
    const recurring = billing.filter(b => (b.billing_type === 'retainer' || b.billing_type === 'mixed') && b.retainer_amount)

    // MRR — computed live from real contract dates, not stored/stale.
    const currentMRR = recurring.filter(b => !b.contract_end || b.contract_end >= today).reduce((s, b) => s + (b.retainer_amount ?? 0), 0)
    const newMRR = recurring.filter(b => b.contract_start && b.contract_start >= monthStart && b.contract_start <= monthEnd).reduce((s, b) => s + (b.retainer_amount ?? 0), 0)
    const lostMRR = recurring.filter(b => b.contract_end && b.contract_end >= monthStart && b.contract_end <= monthEnd).reduce((s, b) => s + (b.retainer_amount ?? 0), 0)
    const endingSoon = recurring.filter(b => b.contract_end && b.contract_end >= today && b.contract_end <= in30Days).reduce((s, b) => s + (b.retainer_amount ?? 0), 0)
    const expectedMRRNextMonth = currentMRR - endingSoon

    const opportunities = (oppsRes.data ?? []) as OpportunityRow[]
    // Probability-weighted, not a raw sum — pipeline is never counted as
    // actual cash, only a weighted estimate of what it might become.
    const pendingMRR = opportunities.reduce((s, o) => s + ((o.potential_value ?? 0) * ((o.probability_pct ?? 0) / 100)), 0)

    const invoices = (invoicesRes.data ?? []) as InvoiceRow[]
    const drypMoneyInThisMonth = invoices.reduce((s, i) => s + i.amount, 0)
    const drypMoneyOutThisMonth = ((expensesRes.data ?? []) as TxnRow[]).reduce((s, t) => s + t.amount, 0)

    return NextResponse.json({
      mrr: {
        current: Math.round(currentMRR * 100) / 100,
        new: Math.round(newMRR * 100) / 100,
        lost: Math.round(lostMRR * 100) / 100,
        pending: Math.round(pendingMRR * 100) / 100,
        expected_next_month: Math.round(expectedMRRNextMonth * 100) / 100,
      },
      cash_flow_this_month: {
        dryp_money_in: Math.round(drypMoneyInThisMonth * 100) / 100,
        dryp_money_out: Math.round(drypMoneyOutThisMonth * 100) / 100,
        net: Math.round((drypMoneyInThisMonth - drypMoneyOutThisMonth) * 100) / 100,
      },
    })
  } catch (error) {
    console.error('[dryp/revenue-summary] error:', error)
    return NextResponse.json({ error: 'Could not compute revenue summary' }, { status: 500 })
  }
}
