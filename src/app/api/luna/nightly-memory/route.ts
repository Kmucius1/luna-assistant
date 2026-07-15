import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from '@/lib/ai'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const ZOE_TIMEZONE = 'America/New_York'

const MEMORY_SYSTEM = `You are LUNA's memory system. You read one day of Zoe's chat messages and
check-ins and extract what is actually worth remembering long-term — not a
transcript recap, but durable facts: patterns, preferences, commitments,
struggles, wins, relationships, and anything she'd want LUNA to still know
weeks from now. Be specific and concrete, in third person, 3-6 sentences.
Skip small talk with no lasting content. If truly nothing memorable happened,
say so in one sentence.`

// Vercel Cron always invokes via GET — both GET and POST share this handler.
async function handle(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  // Runs shortly after local midnight — the day that "just ended" is
  // yesterday relative to right now.
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateKey = localDateKey(yesterday, ZOE_TIMEZONE)

  try {
    const { data: existing } = await db
      .from('luna_memory')
      .select('id')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: 'already_done', date_key: dateKey })
    }

    const [{ data: messages }, { data: checkIns }] = await Promise.all([
      db.from('luna_messages')
        .select('role, content, created_at')
        .eq('user_id', ZOE_USER_ID)
        .eq('session_id', dateKey)
        .order('created_at', { ascending: true }),
      db.from('check_ins')
        .select('type, feeling, on_mind, support_need, pride_goal, mood_rating, energy_rating, sleep_rating')
        .eq('user_id', ZOE_USER_ID)
        .eq('date', dateKey),
    ])

    if (!messages?.length && !checkIns?.length) {
      return NextResponse.json({ status: 'nothing_to_summarize', date_key: dateKey })
    }

    const chatTranscript = (messages ?? [])
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Zoe' : 'LUNA'}: ${m.content}`)
      .join('\n')

    interface CheckInRow {
      type: string; feeling?: string; on_mind?: string; support_need?: string; pride_goal?: string
      mood_rating?: number; energy_rating?: number; sleep_rating?: number
    }
    const checkInSummary = (checkIns ?? [])
      .map((c: CheckInRow) => `[${c.type} check-in] mood ${c.mood_rating ?? '—'}/10, energy ${c.energy_rating ?? '—'}/10, sleep ${c.sleep_rating ?? '—'}/10.${c.feeling ? ` Feeling: ${c.feeling}.` : ''}${c.on_mind ? ` On her mind: ${c.on_mind}.` : ''}${c.support_need ? ` Needed: ${c.support_need}.` : ''}${c.pride_goal ? ` Wanted to be proud of: ${c.pride_goal}.` : ''}`)
      .join('\n')

    const userPrompt = `DATE: ${dateKey}

CHAT MESSAGES THAT DAY:
${chatTranscript || '(no chat messages)'}

CHECK-INS THAT DAY:
${checkInSummary || '(no check-ins logged)'}

Extract what LUNA should remember long-term from this day.`

    let summary: string
    let source: 'ai' | 'fallback'
    try {
      summary = (await callAI(MEMORY_SYSTEM, userPrompt, 350)).trim()
      source = 'ai'
    } catch (aiErr) {
      console.error('[nightly-memory] AI call failed:', aiErr instanceof Error ? aiErr.message : aiErr)
      summary = `${dateKey}: ${messages?.length ?? 0} chat message(s) and ${checkIns?.length ?? 0} check-in(s) logged — summary generation failed, raw activity preserved in luna_messages/check_ins.`
      source = 'fallback'
    }

    await db.from('luna_memory').upsert({
      user_id: ZOE_USER_ID,
      date_key: dateKey,
      summary,
      source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date_key' })

    return NextResponse.json({ status: 'ok', date_key: dateKey, source })
  } catch (err) {
    console.error('[nightly-memory] error:', err)
    return NextResponse.json({ error: 'Failed to build nightly memory' }, { status: 500 })
  }
}

export { handle as GET, handle as POST }
