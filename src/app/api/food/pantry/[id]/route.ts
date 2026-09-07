import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if (typeof body.quantity === 'string') updates.quantity = body.quantity.trim() || null
    if (typeof body.expires_on === 'string') updates.expires_on = body.expires_on
    if (body.storage === 'fridge' || body.storage === 'freezer' || body.storage === 'pantry') updates.storage = body.storage
    if (body.mark_consumed === true) updates.consumed_at = new Date().toISOString()
    if (body.mark_consumed === false) updates.consumed_at = null
    if (body.status === 'in_stock' || body.status === 'low' || body.status === 'empty') updates.status = body.status

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { data, error } = await supabase
      .from('food_pantry_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/[id]] PATCH error:', message)
    return NextResponse.json({ error: 'Failed to update item', detail: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('food_pantry_items').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/pantry/[id]] DELETE error:', message)
    return NextResponse.json({ error: 'Failed to delete item', detail: message }, { status: 500 })
  }
}
