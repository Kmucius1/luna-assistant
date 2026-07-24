import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('saved_places').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ places: data ?? [] })
  } catch (error) {
    console.error('[travel/saved-places] GET error:', error)
    return NextResponse.json({ places: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const { data, error } = await supabase.from('saved_places').insert({
      user_id: user.id,
      external_place_id: body.external_place_id ?? null,
      name: body.name.trim(),
      city: body.city ?? null,
      country: body.country ?? null,
      category: body.category ?? 'city',
      list_name: body.list_name ?? 'must_visit',
      reason_saved: body.reason_saved ?? null,
      tags: body.tags ?? [],
      image_url: body.image_url ?? null,
      source: body.source ?? 'manual',
    }).select().single()
    if (error) throw error
    return NextResponse.json({ place: data })
  } catch (error) {
    console.error('[travel/saved-places] POST error:', error)
    return NextResponse.json({ error: 'Failed to save place' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('saved_places').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[travel/saved-places] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove place' }, { status: 500 })
  }
}
