import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const STATUSES = ['draft', 'ready_to_invoice', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (STATUSES.includes(body.status)) {
      updates.status = body.status
      if (body.status === 'paid' && !body.paid_date) updates.paid_date = new Date().toISOString().split('T')[0]
    }
    if (typeof body.amount === 'number') updates.amount = body.amount
    if (typeof body.deposit_paid === 'number') updates.deposit_paid = body.deposit_paid
    if (typeof body.deposit_required === 'number') updates.deposit_required = body.deposit_required
    if (typeof body.invoice_number === 'string') updates.invoice_number = body.invoice_number
    if (typeof body.due_date === 'string') updates.due_date = body.due_date
    if (typeof body.paid_date === 'string') updates.paid_date = body.paid_date
    if (typeof body.payment_method === 'string') updates.payment_method = body.payment_method
    if (typeof body.last_follow_up === 'string') updates.last_follow_up = body.last_follow_up
    if (typeof body.next_follow_up === 'string') updates.next_follow_up = body.next_follow_up
    if (typeof body.notes === 'string') updates.notes = body.notes

    const { data, error } = await supabase
      .from('dryp_invoices')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ invoice: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/invoices/[id]] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update invoice', detail: message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('dryp_invoices').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/invoices/[id]] DELETE error:', message)
    return NextResponse.json({ error: 'Could not delete invoice', detail: message }, { status: 500 })
  }
}
