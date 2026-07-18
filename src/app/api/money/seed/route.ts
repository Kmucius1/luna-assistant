import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'
import initialCharges from '@/data/money/initial_recurring_charges.json'

const SEED_ACCOUNTS = [
  { nickname: 'Bank of America SafeBalance', institution_name: 'Bank of America', account_type: 'checking', last_four: '6200', ownership_type: 'personal' },
  { nickname: 'Chase Total Checking', institution_name: 'Chase', account_type: 'checking', last_four: '8619', ownership_type: 'personal' },
  { nickname: 'Credit One Visa', institution_name: 'Credit One', account_type: 'credit_card', last_four: '0372', ownership_type: 'personal' },
]

interface InitialCharge {
  merchant: string
  normalized_merchant: string
  status: string
  expected_amount?: number
  observed_amounts?: number[]
  frequency: string
  ownership: string
  reason: string
}

export async function POST() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()

    const { data: existingAccounts } = await db.from('financial_accounts').select('last_four').eq('user_id', userId)
    const existingLastFours = new Set(((existingAccounts ?? []) as { last_four: string | null }[]).map(a => a.last_four))
    const accountsToInsert = SEED_ACCOUNTS.filter(a => !existingLastFours.has(a.last_four))
    let accountsCreated = 0
    if (accountsToInsert.length) {
      const { error } = await db.from('financial_accounts').insert(accountsToInsert.map(a => ({ ...a, user_id: userId })))
      if (!error) accountsCreated = accountsToInsert.length
    }

    const charges = initialCharges as InitialCharge[]
    let subscriptionsCreated = 0
    let subscriptionsSkipped = 0
    for (const charge of charges) {
      const { data: existing } = await db.from('subscriptions')
        .select('id').eq('user_id', userId).eq('merchant_normalized', charge.normalized_merchant).maybeSingle()
      if (existing) { subscriptionsSkipped++; continue }

      const amount = charge.expected_amount ?? (charge.observed_amounts?.length
        ? charge.observed_amounts.reduce((s, v) => s + v, 0) / charge.observed_amounts.length
        : null)

      const status = ['cancel', 'review', 'keep', 'business', 'unknown'].includes(charge.status) ? charge.status : 'review'
      const ownership = charge.ownership === 'business' ? 'business' : charge.ownership === 'unknown' ? 'personal' : 'personal'

      const { error } = await db.from('subscriptions').insert({
        user_id: userId,
        merchant_normalized: charge.normalized_merchant,
        display_name: charge.merchant,
        expected_amount: amount,
        billing_frequency: charge.frequency === 'unknown' ? null : charge.frequency,
        status,
        ownership_type: ownership,
        login_note: charge.reason,
      })
      if (!error) subscriptionsCreated++
    }

    return NextResponse.json({ accountsCreated, subscriptionsCreated, subscriptionsSkipped })
  } catch (error) {
    console.error('[money/seed] error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
