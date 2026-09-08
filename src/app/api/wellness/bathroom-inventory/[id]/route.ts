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
    if (body.status === 'in_stock' || body.status === 'low' || body.status === 'empty') updates.status = body.status
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim()
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { data, error } = await supabase
      .from('bathroom_inventory_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ item: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[wellness/bathroom-inventory/[id]] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update that item', detail: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('bathroom_inventory_items').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[wellness/bathroom-inventory/[id]] DELETE error:', message)
    return NextResponse.json({ error: 'Could not remove that item', detail: message }, { status: 500 })
  }
}
