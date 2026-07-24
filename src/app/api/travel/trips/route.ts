import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = supabase.from('trips').select('*').eq('user_id', user.id)
    if (status) query = query.eq('status', status)
    else query = query.neq('status', 'archived')
    query = query.order('start_date', { ascending: true, nullsFirst: false })

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ trips: data ?? [] })
  } catch (error) {
    console.error('[travel/trips] GET error:', error)
    return NextResponse.json({ trips: [] })
  }
}

// Never creates a "booked" trip from a suggestion — new trips always start
// as idea/draft unless the user explicitly set a later status.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.title?.trim() || !body.destination_name?.trim()) {
      return NextResponse.json({ error: 'title and destination_name required' }, { status: 400 })
    }

    const { data, error } = await supabase.from('trips').insert({
      user_id: user.id,
      title: body.title.trim(),
      destination_name: body.destination_name.trim(),
      destination_id: body.destination_id ?? null,
      status: body.status ?? 'draft',
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      date_flexibility: body.date_flexibility ?? 'not_sure',
      trip_type: body.trip_type ?? null,
      travelers: body.travelers ?? 'solo',
      budget_amount: body.budget_amount ?? null,
      capture_mode: body.capture_mode ?? 'maybe',
      notes: body.notes ?? null,
      cover_image_path: body.cover_image_path ?? null,
      source: body.source ?? 'manual',
      source_entry_id: body.source_entry_id ?? null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ trip: data })
  } catch (error) {
    console.error('[travel/trips] POST error:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
