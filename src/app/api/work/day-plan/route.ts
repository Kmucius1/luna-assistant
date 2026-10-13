import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callAI, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = OWNER_USER_ID
const ZOE_IDS = [
  '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb',
  'dc25215f-cda4-4e91-84ee-c9fe49678b6b',
]
const GENERATION_TYPE = 'work_day_plan'

function dryhubAdmin() {
  const url = process.env.DRYP_SUPABASE_URL ?? 'https://hyuxgfzjjzatvfjcfftm.supabase.co'
  const key = (process.env.DRYP_SUPABASE_SERVICE_KEY ?? process.env.DRYPHUB_SERVICE_ROLE_KEY)!
  return createClient(url, key, { auth: { persistSession: false } })
}

const SYSTEM = `You are LUNA, Zoe's work-day scheduler. Build ONLY her work-hours schedule — nothing about waking up, the gym, meals outside work, or her evening. A separate part of the app already handles the rest of her day; this schedule is purely about her workday.

Zoe runs DRYP Digital (primary agency), DRYP Studio, DRYPHub (CRM), and EHM Strategies. Active clients include Babe Coffee Lounge, Flanagan's Irish Pub, Villa Residential, Hoover Digital, and Linked Up. She's also in school at USF while running these businesses.

PLANNING RULES
- Build a schedule from 10:00 AM to 6:00 PM ONLY. Never include anything before 10:00 AM or after 6:00 PM — no wake-up, gym, breakfast, dinner, or evening wind-down.
- Include a lunch break around 12:30 PM.
- Weave in her real open tasks below into specific, named time blocks — never generic "work" blocks.
- Include short buffers between intense blocks. Avoid more than 90 minutes of focused work without a break.
- Keep it realistic and grounded in the actual tasks/clients given, not invented busywork.

Return ONLY valid JSON:
{
  "day_focus": "1-2 sentence read of today's work day",
  "ai_message": "short encouraging note from Luna, work-focused",
  "schedule": [
    { "time": "10:00 AM", "label": "short label", "detail": "specific detail", "emoji": "💻" }
  ]
}`

async function buildTaskList(): Promise<string> {
  let taskList = ''
  try {
    const db = createAdminClient()
    const { data: ownTasks } = await db
      .from('tasks')
      .select('title, category, due_date, urgency_level, status')
      .eq('user_id', ZOE_USER_ID)
      .not('status', 'in', '("done","cancelled")')
      .order('priority_score', { ascending: false })
      .limit(20)

    interface OwnTaskRow { title: string; category?: string; due_date?: string; urgency_level?: string }
    const ownList = (ownTasks ?? []).map((task: OwnTaskRow) =>
      `• ${task.title}${task.category ? ` (${task.category})` : ''}${task.urgency_level ? ` [${task.urgency_level}]` : ''}${task.due_date ? ` — due ${task.due_date}` : ''}`
    ).join('\n')
    if (ownList) taskList += `Her own tasks:\n${ownList}\n\n`
  } catch (dbError) {
    console.warn('[work/day-plan] own tasks unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
  }

  if (process.env.DRYP_SUPABASE_SERVICE_KEY ?? process.env.DRYPHUB_SERVICE_ROLE_KEY) {
    try {
      const db = dryhubAdmin()
      const { data: tasks } = await db
        .from('tasks')
        .select('title, priority, due_date, status, account_name, description')
        .in('assigned_to', ZOE_IDS)
        .not('status', 'in', '("completed","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20)

      const list = (tasks ?? []).map(task =>
        `• ${task.title}${task.account_name ? ` (${task.account_name})` : ''}${task.priority ? ` [${task.priority}]` : ''}${task.due_date ? ` — due ${task.due_date.slice(0, 10)}` : ''}`
      ).join('\n')
      if (list) taskList += `DRYP CRM open tasks:\n${list}`
    } catch (dbError) {
      console.warn('[work/day-plan] DRYP CRM unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
    }
  }

  return taskList.trim() || 'No open tasks were pulled. Build a calm, focused workday with general strategy/admin blocks.'
}

export async function GET(req: NextRequest) {
  try {
    const tz = req.nextUrl.searchParams.get('tz') || 'America/New_York'
    const dateKey = localDateKey(new Date(), tz)
    const db = createAdminClient()
    const { data } = await db
      .from('daily_generation_cache')
      .select('payload')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', GENERATION_TYPE)
      .maybeSingle()

    return NextResponse.json({ plan: data?.payload ?? null })
  } catch (err) {
    console.error('[work/day-plan] GET error:', err)
    return NextResponse.json({ plan: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { workLocation = 'home', tz = 'America/New_York' } = body

    const taskList = await buildTaskList()
    const todayDate = new Date()
    const today = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }).format(todayDate)

    const userPrompt = `Today: ${today}
Location: ${workLocation === 'home' ? 'Working from home' : 'Going into the DRYP office'}

${taskList}

Build her 10:00 AM to 6:00 PM workday only, using the real tasks above.`

    const raw = await callAI(SYSTEM, userPrompt, 2400)
    const parsed = parseAIJson(raw)

    try {
      const db = createAdminClient()
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        date_key: localDateKey(todayDate, tz),
        timezone: tz,
        generation_type: GENERATION_TYPE,
        payload: parsed,
        source: 'ai',
        updated_at: todayDate.toISOString(),
      }, { onConflict: 'user_id,date_key,generation_type' })
    } catch (saveError) {
      console.error('[work/day-plan] failed to persist plan:', saveError instanceof Error ? saveError.message : saveError)
    }

    return NextResponse.json({ plan: parsed })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[work/day-plan] POST error:', message)
    return NextResponse.json({ error: 'Could not generate your work plan.', detail: message }, { status: 500 })
  }
}
