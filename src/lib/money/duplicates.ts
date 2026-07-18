import type { SupabaseClient } from '@supabase/supabase-js'

interface Txn {
  id: string; account_id: string; amount: number; direction: string
  posted_date: string | null; transaction_date: string | null
  merchant_normalized: string | null; ownership_type: string; is_refund: boolean
}

function dateOf(t: Txn): number {
  const d = t.posted_date ?? t.transaction_date
  return d ? new Date(d).getTime() : 0
}
function daysBetween(a: Txn, b: Txn): number {
  return Math.abs(dateOf(a) - dateOf(b)) / 86_400_000
}

// A price increase beyond this fraction of the subscription's last known
// amount flags a "low" duplicate-style alert. Not a field in the given
// schema — a reasonable fixed default until Zoe wants it configurable.
const PRICE_INCREASE_THRESHOLD = 0.15

export async function detectDuplicates(db: SupabaseClient, userId: string) {
  const { data } = await db.from('transactions')
    .select('id, account_id, amount, direction, posted_date, transaction_date, merchant_normalized, ownership_type, is_refund')
    .eq('user_id', userId)
    .eq('direction', 'outflow')
    .not('merchant_normalized', 'is', null)
  const txns = ((data ?? []) as Txn[]).filter(t =>
    !['transfer', 'debt_payment'].includes(t.ownership_type) && !t.is_refund
  )

  const alerts: { transaction_a_id: string; transaction_b_id: string; severity: string; reason: string }[] = []
  const seenPairs = new Set<string>()

  for (let i = 0; i < txns.length; i++) {
    for (let j = i + 1; j < txns.length; j++) {
      const a = txns[i], b = txns[j]
      if (a.merchant_normalized !== b.merchant_normalized) continue
      const days = daysBetween(a, b)
      const sameAmount = Math.abs(a.amount - b.amount) < 0.01
      const pairKey = [a.id, b.id].sort().join('|')
      if (seenPairs.has(pairKey)) continue

      if (sameAmount && days <= 10) {
        alerts.push({ transaction_a_id: a.id, transaction_b_id: b.id, severity: 'high', reason: `${a.merchant_normalized} charged $${a.amount.toFixed(2)} twice within ${Math.round(days)} days` })
        seenPairs.add(pairKey)
      } else if (days <= 35) {
        const severity = a.account_id !== b.account_id ? 'low' : 'medium'
        const reason = a.account_id !== b.account_id
          ? `${a.merchant_normalized} charged on two different accounts within ${Math.round(days)} days`
          : `${a.merchant_normalized} charged twice within ${Math.round(days)} days ($${a.amount.toFixed(2)} and $${b.amount.toFixed(2)})`
        alerts.push({ transaction_a_id: a.id, transaction_b_id: b.id, severity, reason })
        seenPairs.add(pairKey)
      }
    }
  }

  // Canceled service charging again — always high priority (acceptance test 5).
  const { data: canceled } = await db.from('subscriptions')
    .select('id, merchant_normalized, canceled_at').eq('user_id', userId).eq('status', 'canceled').not('canceled_at', 'is', null)
  for (const sub of canceled ?? []) {
    const canceledAt = new Date(sub.canceled_at as string).getTime()
    const laterCharges = txns.filter(t => t.merchant_normalized === sub.merchant_normalized && dateOf(t) > canceledAt)
    // duplicate_charge_alerts needs two distinct transactions, so each stray
    // post-cancellation charge is paired with the last charge before
    // cancellation (the "this shouldn't have happened again" reference point).
    if (laterCharges.length) {
      const { data: priorCharge } = await db.from('transactions')
        .select('id, account_id, amount, direction, posted_date, transaction_date, merchant_normalized, ownership_type, is_refund')
        .eq('user_id', userId).eq('merchant_normalized', sub.merchant_normalized)
        .lte('posted_date', new Date(canceledAt).toISOString().split('T')[0])
        .order('posted_date', { ascending: false }).limit(1).maybeSingle()
      for (const stray of laterCharges) {
        if (!priorCharge) continue
        const pairKey = [priorCharge.id, stray.id].sort().join('|')
        if (seenPairs.has(pairKey)) continue
        alerts.push({
          transaction_a_id: priorCharge.id, transaction_b_id: stray.id, severity: 'high',
          reason: `${sub.merchant_normalized} charged again after being marked canceled`,
        })
        seenPairs.add(pairKey)
      }
    }
  }

  // Subscription price increase beyond threshold.
  const { data: subs } = await db.from('subscriptions').select('merchant_normalized, expected_amount').eq('user_id', userId).not('expected_amount', 'is', null)
  for (const sub of subs ?? []) {
    const expected = sub.expected_amount as number
    const merchantTxns = txns.filter(t => t.merchant_normalized === sub.merchant_normalized).sort((a, b) => dateOf(b) - dateOf(a))
    const latest = merchantTxns[0]
    if (!latest || expected <= 0) continue
    if ((latest.amount - expected) / expected > PRICE_INCREASE_THRESHOLD) {
      const prior = merchantTxns[1]
      if (prior) {
        const pairKey = [prior.id, latest.id].sort().join('|')
        if (!seenPairs.has(pairKey)) {
          alerts.push({
            transaction_a_id: prior.id, transaction_b_id: latest.id, severity: 'low',
            reason: `${sub.merchant_normalized} price increased from $${prior.amount.toFixed(2)} to $${latest.amount.toFixed(2)}`,
          })
          seenPairs.add(pairKey)
        }
      }
    }
  }

  let created = 0
  for (const alert of alerts) {
    const { error } = await db.from('duplicate_charge_alerts').upsert({
      user_id: userId, ...alert, status: 'open',
    }, { onConflict: 'user_id,transaction_a_id,transaction_b_id', ignoreDuplicates: true })
    if (!error) created++
  }
  return { alertsCreated: created, candidates: alerts.length }
}
