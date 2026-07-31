import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAnalysisForMessage } from '@/lib/luna/text-messaging-pipeline'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  try {
    const { data: message, error: fetchError } = await db
      .from('luna_text_messages')
      .select('id, processing_status')
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const result = await runAnalysisForMessage(db, id)

    const [{ data: updatedMessage }, { data: drafts }] = await Promise.all([
      db.from('luna_text_messages').select('*').eq('id', id).single(),
      db.from('luna_text_drafts').select('*').eq('message_id', id),
    ])

    return NextResponse.json({ ok: true, analysis_status: result.status, message: updatedMessage, drafts: drafts ?? [] })
  } catch (err) {
    console.error('[luna/messages/[id]/retry] error:', err)
    return NextResponse.json({ error: 'Failed to retry analysis' }, { status: 500 })
  }
}
