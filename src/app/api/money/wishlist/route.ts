import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId, isUnauthorizedError } from '@/lib/money/auth'
import { computeSafeToSpend } from '@/lib/money/safeToSpend'

const CATEGORIES = ['need_now', 'makes_life_easier', 'feel_good_upgrade', 'can_wait'] as const

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()

    const [{ data: items }, safeToSpend] = await Promise.all([
      db.from('wishlist_items').select('*').eq('user_id', userId).eq('purchased', false).order('created_at', { ascending: true }),
      computeSafeToSpend(db, userId),
    ])

    // Purchase prioritization — realistic, not "everything is affordable
    // because money is in the account." Need Now first, then in order,
    // marking each item affordable only if it (plus everything already
    // marked affordable ahead of it) fits inside real safe-to-spend.
    const categoryOrder: Record<string, number> = { need_now: 0, makes_life_easier: 1, feel_good_upgrade: 2, can_wait: 3 }
    const sorted = [...(items ?? [])].sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category])
    let remaining = safeToSpend.safeToSpend
    const prioritized = sorted.map(item => {
      const price = item.expected_price ?? 0
      const affordable = price > 0 && price <= remaining
      if (affordable) remaining -= price
      return { ...item, affordableNow: affordable }
    })

    return NextResponse.json({ items: prioritized, safeToSpend: safeToSpend.safeToSpend, remainingAfterAffordable: remaining })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('[money/wishlist] GET error:', error)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveMoneyUserId()
    const body = await req.json().catch(() => ({}))
    const name: string = typeof body.name === 'string' ? body.name.trim() : ''
    const category: string = CATEGORIES.includes(body.category) ? body.category : 'can_wait'
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const db = createAdminClient()
    const { data, error } = await db.from('wishlist_items').insert({
      user_id: userId, name, category,
      expected_price: typeof body.expected_price === 'number' ? body.expected_price : null,
      why_wanted: body.why_wanted || null,
    }).select().single()
    if (error) throw error

    return NextResponse.json({ item: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const message = error instanceof Error ? error.message : String(error)
    console.error('[money/wishlist] POST error:', message)
    return NextResponse.json({ error: 'Could not save that item', detail: message }, { status: 500 })
  }
}
