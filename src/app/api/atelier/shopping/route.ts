import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — list wishlist items
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('shopping_wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('Shopping GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

// POST — add an item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list, text } = await request.json()
    if (!text?.trim()) return NextResponse.json({ error: 'Item text required' }, { status: 400 })

    const { data, error } = await supabase
      .from('shopping_wishlist_items')
      .insert({ user_id: user.id, list: list ?? 'Buy', text: text.trim() })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('Shopping POST error:', err)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}

// DELETE — remove an item (checking an item off removes it, same as the old mock behavior)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 })

    const { error } = await supabase
      .from('shopping_wishlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Shopping DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}
