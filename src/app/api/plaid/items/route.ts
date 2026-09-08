import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUnauthorizedError, resolveMoneyUserId } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db
      .from('plaid_items')
      .select('id, institution_name, status, last_synced_at')
      .eq('user_id', userId)
    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    if (isUnauthorizedError(err)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('[plaid/items] GET error:', err)
    return NextResponse.json({ items: [] })
  }
}

// Removes the stored credential and unlinks (not deletes) any accounts it
// created, so past transaction history stays intact — only the live bank
// connection itself goes away.
export async function DELETE(req: NextRequest) {
  try {
    const userId = await resolveMoneyUserId()
    const { id } = await req.json().catch(() => ({})) as { id?: string }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const db = createAdminClient()
    await db.from('financial_accounts').update({ plaid_item_id: null }).eq('plaid_item_id', id).eq('user_id', userId)
    const { error } = await db.from('plaid_items').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (isUnauthorizedError(err)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    console.error('[plaid/items] DELETE error:', err)
    return NextResponse.json({ error: 'Could not remove that connection' }, { status: 500 })
  }
}
