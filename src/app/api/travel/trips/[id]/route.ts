import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: trip, error }, { data: days }, { data: activities }, { data: bookings }, { data: budgetItems }, { data: packing }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('trip_days').select('*').eq('trip_id', id).eq('user_id', user.id).order('sort_order'),
      supabase.from('trip_activities').select('*').eq('trip_id', id).eq('user_id', user.id).order('sort_order'),
      supabase.from('trip_bookings').select('*').eq('trip_id', id).eq('user_id', user.id).order('start_at'),
      supabase.from('trip_budget_items').select('*').eq('trip_id', id).eq('user_id', user.id),
      supabase.from('trip_packing_items').select('*').eq('trip_id', id).eq('user_id', user.id).order('sort_order'),
    ])
    if (error) throw error

    return NextResponse.json({ trip, days: days ?? [], activities: activities ?? [], bookings: bookings ?? [], budgetItems: budgetItems ?? [], packing: packing ?? [] })
  } catch (error) {
    console.error('[travel/trips/:id] GET error:', error)
    return NextResponse.json({ error: 'Luna could not load this trip right now' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const updates = { ...(await req.json()), updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('trips').update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json({ trip: data })
  } catch (error) {
    console.error('[travel/trips/:id] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('trips').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[travel/trips/:id] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
