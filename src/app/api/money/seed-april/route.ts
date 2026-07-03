import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST() {
  try {
    const db = createAdminClient()

    const subscriptions = [
      { merchant_name: 'ChatGPT',            amount_estimate: 20.00,  frequency: 'monthly', category: 'AI/Business',   status: 'active', notes: 'business' },
      { merchant_name: 'Claude',              amount_estimate: 20.00,  frequency: 'monthly', category: 'AI/Business',   status: 'active', notes: 'business' },
      { merchant_name: 'AutoDS',              amount_estimate: 36.80,  frequency: 'monthly', category: 'Business Tool', status: 'active', notes: 'business' },
      { merchant_name: 'SiteSeeker',          amount_estimate: 20.00,  frequency: 'monthly', category: 'Business Tool', status: 'active', notes: 'business' },
      { merchant_name: 'Opus Clip',           amount_estimate: 15.00,  frequency: 'monthly', category: 'Business Tool', status: 'active', notes: 'business' },
      { merchant_name: 'Spotify',             amount_estimate: 14.00,  frequency: 'monthly', category: 'Entertainment', status: 'active', notes: 'personal' },
      { merchant_name: 'Hulu',                amount_estimate: 5.65,   frequency: 'monthly', category: 'Entertainment', status: 'active', notes: 'personal' },
      { merchant_name: 'Apple Music',         amount_estimate: 10.99,  frequency: 'monthly', category: 'Apple',         status: 'active', notes: 'personal' },
      { merchant_name: 'iCloud+',             amount_estimate: 9.99,   frequency: 'monthly', category: 'Apple',         status: 'active', notes: 'personal' },
      { merchant_name: 'CapCut Teams',        amount_estimate: 24.99,  frequency: 'monthly', category: 'Apple',         status: 'active', notes: 'personal' },
      { merchant_name: 'Gmail Storage',       amount_estimate: 2.99,   frequency: 'monthly', category: 'Apple',         status: 'active', notes: 'personal' },
      { merchant_name: 'Astro Future',        amount_estimate: 3.99,   frequency: 'monthly', category: 'Apple',         status: 'active', notes: 'personal' },
      { merchant_name: 'Crunch Fitness',      amount_estimate: 41.50,  frequency: 'monthly', category: 'Membership',    status: 'active', notes: 'personal' },
      { merchant_name: 'South Beach Tanning', amount_estimate: 32.99,  frequency: 'monthly', category: 'Membership',    status: 'active', notes: 'personal' },
      { merchant_name: 'Car Wash',            amount_estimate: 42.38,  frequency: 'monthly', category: 'Membership',    status: 'active', notes: 'personal' },
      { merchant_name: 'Rocket Money',        amount_estimate: 10.00,  frequency: 'monthly', category: 'Finance',       status: 'active', notes: 'personal' },
      { merchant_name: 'eDreams',             amount_estimate: 9.99,   frequency: 'monthly', category: 'Travel',        status: 'active', notes: 'personal' },
    ]

    const bills = [
      {
        name: 'AT&T',
        merchant_name: 'AT&T',
        amount_estimate: 340.00,
        due_day: 18,
        frequency: 'monthly',
        category: 'Bills',
        status: 'active',
      },
      {
        name: 'Spectrum',
        merchant_name: 'Spectrum',
        amount_estimate: 40.00,
        due_day: 27,
        frequency: 'monthly',
        category: 'Bills',
        status: 'active',
      },
    ]

    const subsWithUser = subscriptions.map(s => ({ ...s, user_id: ZOE_USER_ID }))
    const billsWithUser = bills.map(b => ({ ...b, user_id: ZOE_USER_ID }))

    // Delete existing seed data first so this is idempotent
    await db.from('money_subscriptions').delete().eq('user_id', ZOE_USER_ID)
    await db.from('money_bills').delete().eq('user_id', ZOE_USER_ID)

    const { error: subsError } = await db
      .from('money_subscriptions')
      .insert(subsWithUser)

    if (subsError) {
      console.error('[seed-april] subscriptions error:', subsError)
      return NextResponse.json({ error: subsError.message }, { status: 500 })
    }

    const { error: billsError } = await db
      .from('money_bills')
      .insert(billsWithUser)

    if (billsError) {
      console.error('[seed-april] bills error:', billsError)
      return NextResponse.json({ error: billsError.message }, { status: 500 })
    }

    return NextResponse.json({
      seeded: true,
      count: 19,
      bills: 2,
      subscriptions: 17,
    })
  } catch (error) {
    console.error('[seed-april] error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
