import { createAdminClient } from '@/lib/supabase/admin'
import { analyzeIncomingText } from '@/lib/luna/text-messaging'

type AdminClient = ReturnType<typeof createAdminClient>

interface RunAnalysisResult {
  status: 'done' | 'failed'
  error?: string
}

// Fetches contact + thread context for a stored message, calls the AI analysis,
// and persists the result (or the failure) — shared by the incoming webhook and the retry route.
export async function runAnalysisForMessage(db: AdminClient, messageId: string): Promise<RunAnalysisResult> {
  const { data: messageRow, error: fetchError } = await db
    .from('luna_text_messages')
    .select('id, user_id, thread_id, contact_id, sender_name, message_text')
    .eq('id', messageId)
    .single()
  if (fetchError || !messageRow) {
    return { status: 'failed', error: fetchError?.message ?? 'Message not found' }
  }

  const { data: contact } = await db
    .from('luna_text_contacts')
    .select('id, name, relationship, tone_notes, voice_profile')
    .eq('id', messageRow.contact_id)
    .single()

  const { data: recentMessages } = await db
    .from('luna_text_messages')
    .select('sender_name, message_text, received_at')
    .eq('thread_id', messageRow.thread_id)
    .neq('id', messageId)
    .order('received_at', { ascending: false })
    .limit(5)

  try {
    const analysis = await analyzeIncomingText({
      messageText: messageRow.message_text,
      senderName: messageRow.sender_name,
      contact: {
        name: contact?.name ?? messageRow.sender_name,
        relationship: contact?.relationship,
        toneNotes: contact?.tone_notes,
        voiceProfile: contact?.voice_profile,
      },
      recentThreadMessages: (recentMessages ?? []).map((m: { sender_name: string; message_text: string; received_at: string }) => ({
        sender: m.sender_name,
        text: m.message_text,
        receivedAt: m.received_at,
      })),
    })

    await db.from('luna_text_messages').update({
      processing_status: 'done',
      processing_error: null,
      analyzed_at: new Date().toISOString(),
      summary: analysis.summary,
      request: analysis.request,
      urgency: analysis.urgency,
      urgency_reason: analysis.urgencyReason,
      tone: analysis.tone,
      past_context: analysis.pastContext,
      missing_info: analysis.missingInfo,
      voice_mode: analysis.voiceMode,
      confidence: analysis.confidence,
    }).eq('id', messageId)

    // Clear any drafts left over from a prior failed/retried attempt before inserting fresh ones.
    await db.from('luna_text_drafts').delete().eq('message_id', messageId)

    const draftRows = (['quick', 'friendly', 'detailed'] as const).map(variant => ({
      user_id: messageRow.user_id,
      message_id: messageId,
      variant,
      ai_original_text: analysis.drafts[variant],
      current_text: analysis.drafts[variant],
    }))
    await db.from('luna_text_drafts').insert(draftRows)

    return { status: 'done' }
  } catch (analysisErr) {
    const errMessage = analysisErr instanceof Error ? analysisErr.message : 'Unknown analysis error'
    await db.from('luna_text_messages').update({
      processing_status: 'failed',
      processing_error: errMessage,
    }).eq('id', messageId)

    return { status: 'failed', error: errMessage }
  }
}
