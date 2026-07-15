import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDayBoundsUTC } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const ZOE_TIMEZONE = 'America/New_York'

// Everything Zoe told LUNA/the app on a given local day — the complete raw
// record, not a curated summary. Backs the Memory page's "Full record" view
// so she can reflect on the actual content, not just LUNA's take on it.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dateKey = searchParams.get('date')
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json({ error: 'date=YYYY-MM-DD required' }, { status: 400 })
    }

    const db = createAdminClient()
    const { start, end } = localDayBoundsUTC(dateKey, ZOE_TIMEZONE)
    const startISO = start.toISOString()
    const endISO = end.toISOString()

    const [chatR, brainDumpsR, tasksR, journalR, intentionsR] = await Promise.allSettled([
      db.from('luna_messages')
        .select('id, role, content, created_at')
        .eq('user_id', ZOE_USER_ID)
        .eq('session_id', dateKey)
        .order('created_at', { ascending: true }),
      db.from('brain_dumps')
        .select('id, raw_text, ai_summary, created_tasks, created_at')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO)
        .order('created_at', { ascending: true }),
      db.from('tasks')
        .select('id, title, category, priority_score, source, created_at')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO)
        .order('created_at', { ascending: true }),
      db.from('journal_page_entries')
        .select('id, entry_type, mood, content, created_at')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO)
        .order('created_at', { ascending: true }),
      db.from('intentions')
        .select('id, text, done, created_at')
        .eq('user_id', ZOE_USER_ID)
        .gte('created_at', startISO).lt('created_at', endISO)
        .order('created_at', { ascending: true }),
    ])

    const settled = <T,>(r: PromiseSettledResult<{ data: T[] | null }>): T[] =>
      r.status === 'fulfilled' ? (r.value.data ?? []) : []

    return NextResponse.json({
      date_key: dateKey,
      chat: settled(chatR),
      brainDumps: settled(brainDumpsR),
      tasks: settled(tasksR),
      journal: settled(journalR),
      intentions: settled(intentionsR),
    })
  } catch (err) {
    console.error('[luna/day-archive] error:', err)
    return NextResponse.json({ error: 'Failed to load day archive' }, { status: 500 })
  }
}
