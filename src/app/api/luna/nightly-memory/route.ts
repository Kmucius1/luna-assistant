import { isCronAuthorized } from '@/lib/cronAuth'
import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from '@/lib/ai'
import { localDateKey, localDayBoundsUTC } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = OWNER_USER_ID
const ZOE_TIMEZONE = 'America/New_York'

const MEMORY_SYSTEM = `You are LUNA's memory system. You read one full day of Zoe's activity across
the app — chat messages, check-ins, brain dumps, journal entries, tasks she
created, and intentions she set — and extract what is actually worth
remembering long-term — not a transcript recap, but durable facts: patterns,
preferences, commitments, struggles, wins, relationships, and anything she'd
want LUNA to still know weeks from now. Be specific and concrete, in third
person, 3-6 sentences. Skip small talk with no lasting content. If truly
nothing memorable happened, say so in one sentence. This is a supplementary
reflection, not the only record — the complete raw content is preserved and
reviewable separately, so it's fine to be selective here.`

// Vercel Cron always invokes via GET — both GET and POST share this handler.
async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) {
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

    const { start, end } = localDayBoundsUTC(dateKey, ZOE_TIMEZONE)
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const [{ data: messages }, { data: checkIns }, { data: brainDumps }, { data: journalEntries }, { data: tasksCreated }, { data: intentionsSet }, { data: mealsLogged }, { data: workoutsLogged }] = await Promise.all([
      db.from('luna_messages')
        .select('role, content, created_at')
        .eq('user_id', ZOE_USER_ID)
        .eq('session_id', dateKey)
        .order('created_at', { ascending: true }),
      db.from('check_ins')
        .select('type, feeling, on_mind, support_need, pride_goal, mood_rating, energy_rating, sleep_rating')
        .eq('user_id', ZOE_USER_ID)
        .eq('date', dateKey),
      db.from('brain_dumps')
        .select('raw_text')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO),
      db.from('journal_page_entries')
        .select('entry_type, content')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO),
      db.from('tasks')
        .select('title')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO),
      db.from('intentions')
        .select('text')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO),
      // Most real days she's in the app through Food/Fitness rather than
      // chatting with LUNA directly or journaling — without these, memory
      // silently skipped nearly every day she actually used LUNA.
      db.from('food_log_entries')
        .select('meal_type, title')
        .eq('user_id', ZOE_USER_ID)
        .eq('date_key', dateKey),
      db.from('workout_logs')
        .select('activity_type, focus')
        .eq('user_id', ZOE_USER_ID)
        .eq('date_key', dateKey),
    ])

    const hasAnyActivity = [messages, checkIns, brainDumps, journalEntries, tasksCreated, intentionsSet, mealsLogged, workoutsLogged]
      .some(rows => (rows?.length ?? 0) > 0)

    if (!hasAnyActivity) {
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

    const brainDumpText = (brainDumps ?? []).map((b: { raw_text: string }) => b.raw_text).join('\n---\n')
    const journalText = (journalEntries ?? [])
      .map((j: { entry_type: string; content: string }) => `[${j.entry_type}] ${j.content}`)
      .join('\n---\n')
    const tasksText = (tasksCreated ?? []).map((t: { title: string }) => `- ${t.title}`).join('\n')
    const intentionsText = (intentionsSet ?? []).map((i: { text: string }) => `- ${i.text}`).join('\n')
    const mealsText = (mealsLogged ?? []).map((m: { meal_type: string; title: string }) => `- ${m.meal_type}: ${m.title}`).join('\n')
    const workoutsText = (workoutsLogged ?? []).map((w: { activity_type: string | null; focus: string | null }) => `- ${w.activity_type ?? 'gym'}${w.focus ? ` (${w.focus})` : ''}`).join('\n')

    const userPrompt = `DATE: ${dateKey}

CHAT MESSAGES THAT DAY:
${chatTranscript || '(no chat messages)'}

CHECK-INS THAT DAY:
${checkInSummary || '(no check-ins logged)'}

BRAIN DUMPS THAT DAY:
${brainDumpText || '(none)'}

JOURNAL ENTRIES THAT DAY:
${journalText || '(none)'}

TASKS SHE CREATED THAT DAY:
${tasksText || '(none)'}

INTENTIONS SHE SET THAT DAY:
${intentionsText || '(none)'}

MEALS SHE LOGGED THAT DAY:
${mealsText || '(none)'}

WORKOUTS SHE LOGGED THAT DAY:
${workoutsText || '(none)'}

Extract what LUNA should remember long-term from this day.`

    let summary: string
    let source: 'ai' | 'fallback'
    try {
      summary = (await callAI(MEMORY_SYSTEM, userPrompt, 350)).trim()
      source = 'ai'
    } catch (aiErr) {
      console.error('[nightly-memory] AI call failed:', aiErr instanceof Error ? aiErr.message : aiErr)
      const counts = [
        (messages?.length ?? 0) && `${messages!.length} chat message(s)`,
        (checkIns?.length ?? 0) && `${checkIns!.length} check-in(s)`,
        (brainDumps?.length ?? 0) && `${brainDumps!.length} brain dump(s)`,
        (journalEntries?.length ?? 0) && `${journalEntries!.length} journal entr${journalEntries!.length === 1 ? 'y' : 'ies'}`,
        (tasksCreated?.length ?? 0) && `${tasksCreated!.length} task(s)`,
        (intentionsSet?.length ?? 0) && `${intentionsSet!.length} intention(s)`,
        (mealsLogged?.length ?? 0) && `${mealsLogged!.length} meal(s) logged`,
        (workoutsLogged?.length ?? 0) && `${workoutsLogged!.length} workout(s) logged`,
      ].filter(Boolean).join(', ')
      summary = `${dateKey}: ${counts} logged — summary generation failed, raw activity preserved and reviewable in the Full Record.`
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
