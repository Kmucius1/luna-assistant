import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { endpoint } = body as { endpoint?: string }
    if (!endpoint) return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })

    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[push/unsubscribe]', message)
    return NextResponse.json({ error: 'Failed to remove subscription', detail: message }, { status: 500 })
  }
}
