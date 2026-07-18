import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export interface MoneyTransaction {
  id: string
  account_id: string
  amount: number
  direction: 'inflow' | 'outflow'
  posted_date: string | null
  transaction_date: string | null
  merchant_normalized: string | null
  ownership_type: string
  is_refund: boolean
  transfer_pair_id: string | null
  matched_transaction_id: string | null
  original_transaction_id: string | null
  category: string | null
}

function dateOf(t: MoneyTransaction): number {
  const d = t.posted_date ?? t.transaction_date
  return d ? new Date(d).getTime() : 0
}

function daysBetween(a: MoneyTransaction, b: MoneyTransaction): number {
  return Math.abs(dateOf(a) - dateOf(b)) / 86_400_000
}

// Rule 1: transfers between Zoe's own accounts are not income or spending.
// Same amount, opposite direction, different accounts, within a short window.
export async function matchTransfers(db: SupabaseClient, userId: string, windowDays = 3): Promise<number> {
  const { data } = await db.from('transactions')
    .select('id, account_id, amount, direction, posted_date, transaction_date, merchant_normalized, ownership_type, is_refund, transfer_pair_id, matched_transaction_id, original_transaction_id, category')
    .eq('user_id', userId)
    .is('transfer_pair_id', null)
    .in('ownership_type', ['unknown', 'personal'])
  const txns = (data ?? []) as MoneyTransaction[]

  const used = new Set<string>()
  let matched = 0

  for (const outflow of txns.filter(t => t.direction === 'outflow')) {
    if (used.has(outflow.id)) continue
    const candidate = txns.find(inflow =>
      inflow.direction === 'inflow' &&
      !used.has(inflow.id) &&
      inflow.account_id !== outflow.account_id &&
      Math.abs(inflow.amount - outflow.amount) < 0.01 &&
      daysBetween(inflow, outflow) <= windowDays
    )
    if (!candidate) continue

    const pairId = randomUUID()
    used.add(outflow.id); used.add(candidate.id)
    await db.from('transactions').update({ ownership_type: 'transfer', transfer_pair_id: pairId, matched_transaction_id: candidate.id }).eq('id', outflow.id)
    await db.from('transactions').update({ ownership_type: 'transfer', transfer_pair_id: pairId, matched_transaction_id: outflow.id }).eq('id', candidate.id)
    matched += 2
  }
  return matched
}

// Rule 2: credit-card payments are debt payments, not new spending. A
// payment lands as an inflow on the card account and (usually) a matching
// outflow on a checking/cash account — both get marked debt_payment.
export async function matchCardPayments(db: SupabaseClient, userId: string, windowDays = 5): Promise<number> {
  const { data: cardAccounts } = await db.from('financial_accounts')
    .select('id').eq('user_id', userId).in('account_type', ['credit_card', 'business_credit_card'])
  const cardAccountIds = (cardAccounts ?? []).map(a => a.id as string)
  if (!cardAccountIds.length) return 0

  const { data } = await db.from('transactions')
    .select('id, account_id, amount, direction, posted_date, transaction_date, merchant_normalized, ownership_type, is_refund, transfer_pair_id, matched_transaction_id, original_transaction_id, category')
    .eq('user_id', userId)
    .in('ownership_type', ['unknown', 'personal'])
  const txns = (data ?? []) as MoneyTransaction[]

  const cardInflows = txns.filter(t => cardAccountIds.includes(t.account_id) && t.direction === 'inflow' && !t.is_refund)
  const otherOutflows = txns.filter(t => !cardAccountIds.includes(t.account_id) && t.direction === 'outflow')

  let matched = 0
  for (const payment of cardInflows) {
    const counterpart = otherOutflows.find(o =>
      !o.transfer_pair_id && o.matched_transaction_id === null &&
      Math.abs(o.amount - payment.amount) < 0.01 &&
      daysBetween(o, payment) <= windowDays
    )
    await db.from('transactions').update({
      ownership_type: 'debt_payment',
      matched_transaction_id: counterpart?.id ?? null,
    }).eq('id', payment.id)
    matched++
    if (counterpart) {
      await db.from('transactions').update({ ownership_type: 'debt_payment', matched_transaction_id: payment.id }).eq('id', counterpart.id)
      matched++
    }
  }
  return matched
}

// Rule 3: refunds reduce the original category when a match exists —
// same account, same merchant, an inflow following an earlier outflow.
export async function matchRefunds(db: SupabaseClient, userId: string, windowDays = 90): Promise<number> {
  const { data } = await db.from('transactions')
    .select('id, account_id, amount, direction, posted_date, transaction_date, merchant_normalized, ownership_type, is_refund, transfer_pair_id, matched_transaction_id, original_transaction_id, category')
    .eq('user_id', userId)
    .is('original_transaction_id', null)
  const txns = (data ?? []) as MoneyTransaction[]

  const outflows = txns.filter(t => t.direction === 'outflow' && !t.transfer_pair_id)
  const inflows = txns.filter(t => t.direction === 'inflow' && !t.transfer_pair_id && !t.is_refund)

  let matched = 0
  for (const inflow of inflows) {
    if (!inflow.merchant_normalized) continue
    const original = outflows.find(o =>
      o.account_id === inflow.account_id &&
      o.merchant_normalized === inflow.merchant_normalized &&
      o.amount >= inflow.amount - 0.01 &&
      dateOf(o) <= dateOf(inflow) &&
      daysBetween(o, inflow) <= windowDays
    )
    if (!original) continue
    await db.from('transactions').update({
      is_refund: true,
      original_transaction_id: original.id,
      category: original.category,
    }).eq('id', inflow.id)
    matched++
  }
  return matched
}

export async function runAllMatching(db: SupabaseClient, userId: string) {
  const transfers = await matchTransfers(db, userId)
  const cardPayments = await matchCardPayments(db, userId)
  const refunds = await matchRefunds(db, userId)
  return { transfers, cardPayments, refunds }
}
