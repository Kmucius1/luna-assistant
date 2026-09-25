import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const VARIANT_ORDER: Record<string, number> = { quick: 0, friendly: 1, detailed: 2 }

export async function GET() {
  const db = createAdminClient()

  try {
    const { data: message, error: messageError } = await db
      .from('luna_text_messages')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (messageError) throw messageError
    if (!message) return NextResponse.json({ message: null, contact: null, drafts: [] })

    const [{ data: contact }, { data: drafts }] = await Promise.all([
      db.from('luna_text_contacts').select('*').eq('id', message.contact_id).maybeSingle(),
      db.from('luna_text_drafts').select('*').eq('message_id', message.id),
    ])

    const sortedDrafts = (drafts ?? []).slice().sort(
      (a: { variant: string }, b: { variant: string }) => (VARIANT_ORDER[a.variant] ?? 99) - (VARIANT_ORDER[b.variant] ?? 99),
    )

    return NextResponse.json({ message, contact: contact ?? null, drafts: sortedDrafts })
  } catch (err) {
    console.error('[luna/messages/latest] error:', err)
    return NextResponse.json({ error: 'Failed to load latest message' }, { status: 500 })
  }
}
