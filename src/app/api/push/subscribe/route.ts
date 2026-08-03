import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { endpoint, keys } = body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }, { onConflict: 'endpoint' })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[push/subscribe]', message)
    return NextResponse.json({ error: 'Failed to save subscription', detail: message }, { status: 500 })
  }
}
