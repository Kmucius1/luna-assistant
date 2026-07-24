import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

    const { data, error } = await supabase.from('trip_activities').insert({
      trip_id: id,
      trip_day_id: body.trip_day_id ?? null,
      user_id: user.id,
      title: body.title.trim(),
      description: body.description ?? null,
      time_of_day: body.time_of_day ?? 'flexible',
      status: body.status ?? 'would_love',
      category: body.category ?? null,
      cost: body.cost ?? null,
      notes: body.notes ?? null,
      sort_order: body.sort_order ?? 0,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ activity: data })
  } catch (error) {
    console.error('[travel/trips/:id/activities] POST error:', error)
    return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { activityId, ...updates } = await req.json()
    if (!activityId) return NextResponse.json({ error: 'activityId required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('trip_activities').update(updates).eq('id', activityId).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json({ activity: data })
  } catch (error) {
    console.error('[travel/trips/:id/activities] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { activityId } = await req.json()
    if (!activityId) return NextResponse.json({ error: 'activityId required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('trip_activities').delete().eq('id', activityId).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[travel/trips/:id/activities] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove activity' }, { status: 500 })
  }
}
