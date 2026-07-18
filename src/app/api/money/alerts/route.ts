import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'

export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db
      .from('money_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'unread')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ alerts: data ?? [], count: (data ?? []).length })
  } catch (error) {
    console.error('[alerts] error:', error)
    return NextResponse.json({ alerts: [], count: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action = 'dismiss' } = await req.json() as { id: string; action?: 'dismiss' | 'read' | 'resolve' }
    if (!id) return NextResponse.json({ error: 'Missing alert id' }, { status: 400 })

    const status = action === 'dismiss' ? 'dismissed' : action === 'resolve' ? 'resolved' : 'read'
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('money_alerts').update({ status }).eq('id', id).eq('user_id', userId).select().single()
    if (error) throw error
    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('[alerts] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
