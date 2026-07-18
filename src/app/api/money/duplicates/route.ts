import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('duplicate_charge_alerts')
      .select('*, transaction_a:transaction_a_id(id, merchant_normalized, amount, posted_date, transaction_date, account_id), transaction_b:transaction_b_id(id, merchant_normalized, amount, posted_date, transaction_date, account_id)')
      .eq('user_id', userId).eq('status', 'open')
      .order('severity', { ascending: false }).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ alerts: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[money/duplicates] error:', error)
    return NextResponse.json({ alerts: [] })
  }
}

// Controls: mark expected, duplicate, dispute later, or ignore.
export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json() as { id: string; status: 'expected' | 'duplicate' | 'dispute_later' | 'ignored' | 'resolved' }
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('duplicate_charge_alerts')
      .update({ status, resolved_at: ['resolved', 'expected', 'ignored'].includes(status) ? new Date().toISOString() : null })
      .eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('[money/duplicates] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
