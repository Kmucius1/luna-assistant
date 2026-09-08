import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.potential_value === 'number') updates.potential_value = body.potential_value
    if (typeof body.probability_pct === 'number') updates.probability_pct = body.probability_pct
    if (typeof body.deal_stage === 'string') updates.deal_stage = body.deal_stage
    if (typeof body.expected_close_date === 'string') updates.expected_close_date = body.expected_close_date
    if (typeof body.expected_payment_schedule === 'string') updates.expected_payment_schedule = body.expected_payment_schedule
    if (typeof body.next_action === 'string') updates.next_action = body.next_action
    if (['open', 'won', 'lost'].includes(body.status)) updates.status = body.status

    const { data, error } = await supabase
      .from('dryp_opportunities')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ opportunity: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/opportunities/[id]] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update that opportunity', detail: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('dryp_opportunities').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/opportunities/[id]] DELETE error:', message)
    return NextResponse.json({ error: 'Could not remove that opportunity', detail: message }, { status: 500 })
  }
}
