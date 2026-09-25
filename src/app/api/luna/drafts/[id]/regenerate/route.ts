import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { regenerateDraftVariant, type RegenerateInstruction } from '@/lib/luna/text-messaging'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const VALID_INSTRUCTIONS: RegenerateInstruction[] = ['shorter', 'warmer', 'more_direct', 'more_like_me']

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: { instruction?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.instruction || !VALID_INSTRUCTIONS.includes(body.instruction as RegenerateInstruction)) {
    return NextResponse.json({ error: `instruction must be one of: ${VALID_INSTRUCTIONS.join(', ')}` }, { status: 400 })
  }
  const instruction = body.instruction as RegenerateInstruction

  const db = createAdminClient()

  try {
    const { data: draft, error: fetchError } = await db
      .from('luna_text_drafts')
      .select('id, message_id, variant, current_text, regenerate_count')
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const { data: message } = await db
      .from('luna_text_messages')
      .select('summary, request, tone, urgency, past_context')
      .eq('id', draft.message_id)
      .maybeSingle()

    const originalAnalysisContext = [
      message?.summary ? `Summary: ${message.summary}` : null,
      message?.request ? `They're asking: ${message.request}` : null,
      message?.tone ? `Tone: ${message.tone}` : null,
      message?.urgency ? `Urgency: ${message.urgency}` : null,
      message?.past_context ? `Past context: ${message.past_context}` : null,
    ].filter(Boolean).join('\n') || 'No additional context available.'

    const newText = await regenerateDraftVariant({
      originalAnalysisContext,
      currentDraftText: draft.current_text,
      variant: draft.variant,
      instruction,
    })

    const { data: updated, error: updateError } = await db
      .from('luna_text_drafts')
      .update({
        current_text: newText,
        regenerate_count: (draft.regenerate_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (updateError) throw updateError

    return NextResponse.json({ draft: updated })
  } catch (err) {
    console.error('[luna/drafts/[id]/regenerate] error:', err)
    return NextResponse.json({ error: 'Failed to regenerate draft' }, { status: 500 })
  }
}
