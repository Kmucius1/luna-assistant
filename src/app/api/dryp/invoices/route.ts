import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayKey } from '@/lib/luna/today'

const OUTSTANDING_STATUSES = ['ready_to_invoice', 'sent', 'viewed', 'partially_paid', 'overdue']

interface InvoiceRow {
  id: string
  dryp_account_id: string
  client_name: string
  invoice_number: string | null
  amount: number
  deposit_required: number | null
  deposit_paid: number | null
  invoice_date: string | null
  due_date: string | null
  paid_date: string | null
  payment_method: string | null
  status: string
  last_follow_up: string | null
  next_follow_up: string | null
  notes: string | null
}


export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('dryp_invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false })
    if (error) throw error

    const today = todayKey()
    const invoices = ((data ?? []) as InvoiceRow[]).map(inv => {
      // A due-but-unpaid invoice is overdue by real date math, whether or
      // not anyone remembered to flip its status — same "compute, don't
      // trust a stale field" pattern the rest of the app already uses for
      // task/bill overdue detection.
      const isOverdue = !!inv.due_date && inv.due_date < today && !['paid', 'cancelled', 'disputed'].includes(inv.status)
      const remainingBalance = inv.amount - (inv.deposit_paid ?? 0)
      const daysOutstanding = inv.invoice_date ? Math.floor((Date.now() - new Date(inv.invoice_date).getTime()) / 86_400_000) : null
      return { ...inv, isOverdue, remainingBalance, daysOutstanding, status: isOverdue && inv.status !== 'partially_paid' ? 'overdue' : inv.status }
    })

    const accountsReceivable = invoices
      .filter(inv => OUTSTANDING_STATUSES.includes(inv.status) || inv.isOverdue)
      .sort((a, b) => (b.remainingBalance - a.remainingBalance) || ((b.daysOutstanding ?? 0) - (a.daysOutstanding ?? 0)))

    return NextResponse.json({ invoices, accountsReceivable })
  } catch (error) {
    console.error('[dryp/invoices] GET error:', error)
    return NextResponse.json({ invoices: [], accountsReceivable: [] })
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
    const amount: number = Number(body.amount)
    if (!dryp_account_id || !client_name || !amount) return NextResponse.json({ error: 'dryp_account_id, client_name, and amount are required' }, { status: 400 })

    const row = {
      user_id: user.id,
      dryp_account_id,
      client_name,
      invoice_number: body.invoice_number || null,
      amount,
      deposit_required: typeof body.deposit_required === 'number' ? body.deposit_required : null,
      deposit_paid: typeof body.deposit_paid === 'number' ? body.deposit_paid : null,
      invoice_date: body.invoice_date || todayKey(),
      due_date: body.due_date || null,
      payment_method: body.payment_method || null,
      status: body.status || 'draft',
      notes: body.notes || null,
    }

    const { data, error } = await supabase.from('dryp_invoices').insert(row).select().single()
    if (error) throw error

    return NextResponse.json({ invoice: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[dryp/invoices] POST error:', message)
    return NextResponse.json({ error: 'Could not create invoice', detail: message }, { status: 500 })
  }
}
