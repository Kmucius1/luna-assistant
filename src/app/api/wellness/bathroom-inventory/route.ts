import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ZOE_BATHROOM_STAPLES } from '@/lib/luna/bathroomInventory'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('bathroom_inventory_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) throw error

    if (!data || data.length === 0) {
      const seedRows = ZOE_BATHROOM_STAPLES.map(name => ({ user_id: user.id, name, status: 'in_stock' }))
      const { data: inserted, error: seedError } = await supabase.from('bathroom_inventory_items').insert(seedRows).select()
      if (seedError) throw seedError
      return NextResponse.json({ items: inserted ?? [] })
    }

    return NextResponse.json({ items: data })
  } catch (error) {
    console.error('[wellness/bathroom-inventory] GET error:', error)
    return NextResponse.json({ items: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const name: string = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('bathroom_inventory_items')
      .insert({ user_id: user.id, name, status: 'in_stock' })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ item: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[wellness/bathroom-inventory] POST error:', message)
    return NextResponse.json({ error: 'Could not add that item', detail: message }, { status: 500 })
  }
}
