import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAnalysisForMessage } from '@/lib/luna/text-messaging-pipeline'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

interface IncomingBody {
  senderName?: string
  senderIdentifier?: string
  message?: string
  receivedAt?: string
  conversationId?: string
  source?: string
}

const REQUIRED_FIELDS: (keyof IncomingBody)[] = [
  'senderName', 'senderIdentifier', 'message', 'receivedAt', 'conversationId', 'source',
]

function dedupeKeyFor(conversationId: string, message: string, receivedAt: string): string {
  return createHash('sha256').update(`${conversationId}|${message}|${receivedAt}`).digest('hex')
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.LUNA_INCOMING_SECRET
  if (!configuredSecret) {
    console.error('[luna/messages/incoming] LUNA_INCOMING_SECRET is not set')
    return NextResponse.json({ error: 'Endpoint not configured' }, { status: 500 })
  }

  const providedSecret = request.headers.get('x-luna-secret')
  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: IncomingBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const missing = REQUIRED_FIELDS.filter(field => !body[field] || !String(body[field]).trim())
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
  }

  const { senderName, senderIdentifier, message, receivedAt, conversationId, source } = body as Required<IncomingBody>
  const db = createAdminClient()
  const dedupeKey = dedupeKeyFor(conversationId, message, receivedAt)

  try {
    const { data: existing } = await db
      .from('luna_text_messages')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({ ok: true, duplicate: true, message_id: existing.id })
    }

    // ── Resolve contact (by identifier, then by name, then create ad-hoc) ──
    let contact = (
      await db.from('luna_text_contacts')
        .select('id, name, relationship, tone_notes, voice_profile')
        .eq('user_id', ZOE_USER_ID)
        .eq('identifier', senderIdentifier)
        .maybeSingle()
    ).data

    if (!contact) {
      contact = (
        await db.from('luna_text_contacts')
          .select('id, name, relationship, tone_notes, voice_profile')
          .eq('user_id', ZOE_USER_ID)
          .ilike('name', senderName)
          .maybeSingle()
      ).data
    }

    if (!contact) {
      const { data: created, error: createContactError } = await db
        .from('luna_text_contacts')
        .insert({ user_id: ZOE_USER_ID, name: senderName, identifier: senderIdentifier })
        .select('id, name, relationship, tone_notes, voice_profile')
        .single()
      if (createContactError) throw createContactError
      contact = created
    }

    // ── Resolve thread ──
    const { data: thread, error: threadError } = await db
      .from('luna_text_threads')
      .upsert(
        { user_id: ZOE_USER_ID, contact_id: contact.id, conversation_id: conversationId, source },
        { onConflict: 'user_id,conversation_id' },
      )
      .select('id')
      .single()
    if (threadError) throw threadError

    // ── Insert the message row ──
    const { data: messageRow, error: insertError } = await db
      .from('luna_text_messages')
      .insert({
        user_id: ZOE_USER_ID,
        thread_id: thread.id,
        contact_id: contact.id,
        sender_name: senderName,
        sender_identifier: senderIdentifier,
        message_text: message,
        received_at: receivedAt,
        source,
        dedupe_key: dedupeKey,
        processing_status: 'pending',
      })
      .select('id')
      .single()
    if (insertError) throw insertError

    const messageId = messageRow.id
    const result = await runAnalysisForMessage(db, messageId)

    return NextResponse.json({ ok: true, message_id: messageId, analysis_status: result.status })
  } catch (err) {
    console.error('[luna/messages/incoming] error:', err)
    return NextResponse.json({ error: 'Failed to process incoming message' }, { status: 500 })
  }
}
