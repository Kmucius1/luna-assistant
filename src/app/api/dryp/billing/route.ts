import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('dryp_client_billing')
      .select('*')
      .eq('user_id', user.id)
      .order('client_name', { ascending: true })
    if (error) throw error

    return NextResponse.json({ profiles: data ?? [] })
  } catch (error) {
    console.error('[dryp/billing] GET error:', error)
    return NextResponse.json({ profiles: [] })
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
      billing_type: ['retainer', 'one_time', 'mixed'].includes(body.billing_type) ? body.billing_type : 'one_time',
      retainer_amount: typeof body.retainer_amount === 'number' ? body.retainer_amount : null,
      recurring_billing_day: typeof body.recurring_billing_day === 'number' ? body.recurring_billing_day : null,
      payment_method: body.payment_method || null,
      notes: body.notes || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('dryp_client_billing')
      .upsert(row, { onConflict: 'user_id,dryp_account_id' })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ profile: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/billing] POST error:', message)
    return NextResponse.json({ error: 'Could not save billing profile', detail: message }, { status: 500 })
  }
}
