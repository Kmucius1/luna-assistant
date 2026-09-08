import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId, isUnauthorizedError } from '@/lib/money/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await resolveMoneyUserId()
    const body = await req.json().catch(() => ({}))

    const updates: Record<string, unknown> = {}
    if (typeof body.purchased === 'boolean') updates.purchased = body.purchased
    if (typeof body.expected_price === 'number') updates.expected_price = body.expected_price
    if (typeof body.category === 'string') updates.category = body.category
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const db = createAdminClient()
    const { data, error } = await db.from('wishlist_items').update(updates).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error

    return NextResponse.json({ item: data })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const message = error instanceof Error ? error.message : String(error)
    console.error('[money/wishlist/[id]] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update that item', detail: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { error } = await db.from('wishlist_items').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    const message = error instanceof Error ? error.message : String(error)
    console.error('[money/wishlist/[id]] DELETE error:', message)
    return NextResponse.json({ error: 'Could not remove that item', detail: message }, { status: 500 })
  }
}
