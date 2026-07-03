import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('money_alerts')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[alerts] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ alerts: data ?? [], count: (data ?? []).length })
  } catch (error) {
    console.error('[alerts] error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json() as { id: string; action?: 'dismiss' | 'read' }
    const { id, action = 'dismiss' } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing alert id' }, { status: 400 })
    }

    const status = action === 'dismiss' ? 'dismissed' : 'read'

    const { data, error } = await db
      .from('money_alerts')
      .update({ status })
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .select()
      .single()

    if (error) {
      console.error('[alerts] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('[alerts] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}
