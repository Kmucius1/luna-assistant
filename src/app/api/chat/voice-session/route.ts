import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { callAI } from '@/lib/ai'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

const SUMMARY_SYSTEM = `Summarize a spoken back-and-forth conversation between Zoe and LUNA (her AI assistant) in 1-2 sentences, for a note she can reference later. Capture what was actually discussed, felt, or decided — third person, past tense, e.g. "Zoe talked through..." No preamble, no quotes, just the summary.`

interface VoiceTurn { role: 'user' | 'assistant'; text: string }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { turns?: VoiceTurn[] }
    const turns = (body.turns ?? []).filter(t => t.text?.trim())
    // A single exchange (greeting + one reply) isn't worth a permanent note —
    // only save once there's an actual back-and-forth.
    if (turns.length < 2) {
      return NextResponse.json({ saved: false })
    }

    const transcript = turns.map(t => `${t.role === 'user' ? 'Zoe' : 'LUNA'}: ${t.text}`).join('\n')

    let summary: string | null = null
    try {
      summary = (await callAI(SUMMARY_SYSTEM, transcript, 200)).trim()
    } catch (err) {
      console.error('[chat/voice-session] summary generation failed:', err)
    }

    const userId = await resolveUserId()
    const db = createAdminClient()
    const { error } = await db.from('brain_dump_entries').insert({
      user_id: userId,
      raw_content: transcript,
      entry_type: 'voice',
      category: 'thoughts',
      title: 'Voice conversation with LUNA',
      transcript,
      transcription_status: 'done',
      ai_summary: summary,
      ai_analysis_enabled: false,
      analysis_status: summary ? 'done' : 'skipped',
      status: 'kept',
    })
    if (error) throw error

    return NextResponse.json({ saved: true })
  } catch (err) {
    console.error('[chat/voice-session] error:', err)
    return NextResponse.json({ saved: false, error: 'Failed to save conversation' }, { status: 500 })
  }
}
