import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.category) return NextResponse.json({ error: 'category required' }, { status: 400 })

    const { data, error } = await supabase.from('trip_budget_items').insert({
      trip_id: id, user_id: user.id, category: body.category, description: body.description ?? null,
      planned_amount: body.planned_amount ?? null, actual_amount: body.actual_amount ?? null,
      status: body.status ?? 'planned', payment_date: body.payment_date ?? null,
    }).select().single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('[travel/trips/:id/budget] POST error:', error)
    return NextResponse.json({ error: 'Failed to add budget item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, ...updates } = await req.json()
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('trip_budget_items').update(updates).eq('id', itemId).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('[travel/trips/:id/budget] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update budget item' }, { status: 500 })
  }
}
