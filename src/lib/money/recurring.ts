import type { SupabaseClient } from '@supabase/supabase-js'

interface Txn {
  id: string; account_id: string; amount: number; direction: string
  posted_date: string | null; transaction_date: string | null; merchant_normalized: string | null
}

function dateOf(t: Txn): number {
  const d = t.posted_date ?? t.transaction_date
  return d ? new Date(d).getTime() : 0
}

function guessFrequency(avgIntervalDays: number): { frequency: string; nextOffsetDays: number } | null {
  if (avgIntervalDays >= 5 && avgIntervalDays <= 9) return { frequency: 'weekly', nextOffsetDays: 7 }
  if (avgIntervalDays >= 12 && avgIntervalDays <= 16) return { frequency: 'biweekly', nextOffsetDays: 14 }
  if (avgIntervalDays >= 25 && avgIntervalDays <= 35) return { frequency: 'monthly', nextOffsetDays: 30 }
  if (avgIntervalDays >= 85 && avgIntervalDays <= 97) return { frequency: 'quarterly', nextOffsetDays: 91 }
  if (avgIntervalDays >= 355 && avgIntervalDays <= 375) return { frequency: 'annual', nextOffsetDays: 365 }
  return null
}

// Detects recurring charges by grouping outflow transactions by normalized
// merchant, then looking at the spacing between charges. 2 occurrences at a
// plausible cadence -> possible_recurring. 3+ consistent occurrences ->
// recurring, and gets a subscriptions row (status left alone if she's
// already reviewed it — only the observed facts get refreshed).
export async function detectRecurring(db: SupabaseClient, userId: string) {
  const { data } = await db.from('transactions')
    .select('id, account_id, amount, direction, posted_date, transaction_date, merchant_normalized')
    .eq('user_id', userId)
    .eq('direction', 'outflow')
    .not('merchant_normalized', 'is', null)
  const txns = (data ?? []) as Txn[]

  const byMerchant = new Map<string, Txn[]>()
  for (const t of txns) {
    const key = t.merchant_normalized!
    if (!byMerchant.has(key)) byMerchant.set(key, [])
    byMerchant.get(key)!.push(t)
  }

  let recurringCount = 0
  let possibleCount = 0
  let subscriptionsUpserted = 0

  for (const [merchant, group] of byMerchant) {
    if (group.length < 2) continue
    const sorted = [...group].sort((a, b) => dateOf(a) - dateOf(b))
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((dateOf(sorted[i]) - dateOf(sorted[i - 1])) / 86_400_000)
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length
    const freqInfo = guessFrequency(avgInterval)

    if (!freqInfo) continue

    const status = sorted.length >= 3 ? 'recurring' : 'possible_recurring'
    if (status === 'recurring') recurringCount += sorted.length
    else possibleCount += sorted.length

    await db.from('transactions')
      .update({ recurring_status: status })
      .in('id', sorted.map(t => t.id))

    const latest = sorted[sorted.length - 1]
    const amounts = sorted.map(t => t.amount)
    const modalAmount = amounts.sort((a, b) =>
      amounts.filter(v => v === b).length - amounts.filter(v => v === a).length
    )[0]

    const { data: existing } = await db.from('subscriptions')
      .select('id, status').eq('user_id', userId).eq('merchant_normalized', merchant).maybeSingle()

    const nextExpected = new Date(dateOf(latest) + freqInfo.nextOffsetDays * 86_400_000).toISOString().split('T')[0]
    const lastChargeDate = (latest.posted_date ?? latest.transaction_date) ?? undefined

    if (existing) {
      await db.from('subscriptions').update({
        account_id: latest.account_id,
        expected_amount: modalAmount,
        billing_frequency: freqInfo.frequency,
        last_charge_date: lastChargeDate,
        next_expected_date: nextExpected,
      }).eq('id', existing.id)
    } else {
      await db.from('subscriptions').insert({
        user_id: userId,
        account_id: latest.account_id,
        merchant_normalized: merchant,
        display_name: merchant,
        expected_amount: modalAmount,
        billing_frequency: freqInfo.frequency,
        last_charge_date: lastChargeDate,
        next_expected_date: nextExpected,
        status: 'review',
      })
    }
    subscriptionsUpserted++
  }

  return { recurringCount, possibleCount, subscriptionsUpserted }
}
