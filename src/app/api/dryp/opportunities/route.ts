import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('dryp_opportunities')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('expected_close_date', { ascending: true, nullsFirst: false })
    if (error) throw error

    return NextResponse.json({ opportunities: data ?? [] })
  } catch (error) {
    console.error('[dryp/opportunities] GET error:', error)
    return NextResponse.json({ opportunities: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const dryp_account_id: string = body.dryp_account_id
    const client_name: string = body.client_name
    if (!dryp_account_id || !client_name) return NextResponse.json({ error: 'dryp_account_id and client_name are required' }, { status: 400 })

    const row = {
      user_id: user.id,
      dryp_account_id,
      client_name,
      potential_value: typeof body.potential_value === 'number' ? body.potential_value : null,
      probability_pct: typeof body.probability_pct === 'number' ? body.probability_pct : null,
      deal_stage: body.deal_stage || null,
      expected_close_date: body.expected_close_date || null,
      expected_payment_schedule: body.expected_payment_schedule || null,
      next_action: body.next_action || null,
    }

    const { data, error } = await supabase.from('dryp_opportunities').insert(row).select().single()
    if (error) throw error

    return NextResponse.json({ opportunity: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/opportunities] POST error:', message)
    return NextResponse.json({ error: 'Could not save that opportunity', detail: message }, { status: 500 })
  }
}
