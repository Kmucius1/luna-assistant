import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.booking_type) return NextResponse.json({ error: 'booking_type required' }, { status: 400 })

    const { data, error } = await supabase.from('trip_bookings').insert({
      trip_id: id, user_id: user.id, booking_type: body.booking_type, provider: body.provider ?? null,
      confirmation_number: body.confirmation_number ?? null, start_at: body.start_at ?? null, end_at: body.end_at ?? null,
      amount: body.amount ?? null, status: body.status ?? 'confirmed', notes: body.notes ?? null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ booking: data })
  } catch (error) {
    console.error('[travel/trips/:id/bookings] POST error:', error)
    return NextResponse.json({ error: 'Failed to add booking' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('trip_bookings').delete().eq('id', bookingId).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[travel/trips/:id/bookings] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove booking' }, { status: 500 })
  }
}
