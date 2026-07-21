import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { localHour, localDateKey } from '@/lib/luna/dailyCache'
import { buildLunaContext } from '@/lib/luna/context'
import { ZOE_GYM_BY_DAY, ZOE_LIFESTYLE_PROFILE } from '@/lib/luna/zoeLifestyleProfile'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const ZOE_IDS = [
  '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb',
  'dc25215f-cda4-4e91-84ee-c9fe49678b6b',
]

function dryhubAdmin() {
  const url = process.env.DRYP_SUPABASE_URL ?? 'https://hyuxgfzjjzatvfjcfftm.supabase.co'
  const key = (process.env.DRYP_SUPABASE_SERVICE_KEY ?? process.env.DRYPHUB_SERVICE_ROLE_KEY)!
  return createClient(url, key, { auth: { persistSession: false } })
}

const SYSTEM = `You are LUNA, Zoe's personal life scheduler and day planner.

${ZOE_LIFESTYLE_PROFILE}

OTHER CONTEXT
- Hair: Zoe has a perm. On wash days add 20 extra minutes to hair time; on refresh days add about 5 minutes.
- She does not have a dog. Never mention walking a dog.
- She works from home or from the DRYP office in the Tampa area.
- Bed preparation should begin around 9:00 PM, with lights out around 10:30 PM to support her 5:00 AM wake-up.
- She does best with structured but flexible blocks, not back-to-back task marathons.
- Build 20 to 30 minute buffers between intense blocks. Avoid more than 90 minutes of focused work without a break.

PLANNING RULES
- Generate a complete timed schedule from wake-up through sleep.
- Her standard morning sequence is wake at 5:00 AM, shower, gym clothes, oatmeal, hot tea, leave by 5:35 AM, gym by 5:45 AM.
- Include the correct named gym focus for the weekday and list the workout under the gym block.
- Protect work from 10:30 AM to 5:30 PM every day unless a real fixed event says otherwise.
- Breakfast, lunch, and dinner are mandatory anchors. Never omit them or schedule over them.
- Include one personal, creative, outdoor, beauty, social, or restorative action when realistic.
- Do not punish a changed or low-energy day. Scale optional tasks and keep anchors.
- Weave real open tasks into the work blocks with realistic estimates.

Return ONLY valid JSON:
{
  "day_energy": "1-2 sentence read of the day",
  "ai_message": "warm practical note from Luna",
  "gym_focus": "the correct weekday workout focus",
  "key_anchors": {
    "wake": "5:00 AM",
    "breakfast": "5:20 AM",
    "gym": "5:45 AM",
    "at_work": "10:30 AM",
    "lunch": "12:30 PM",
    "leave_work": "5:30 PM",
    "dinner": "6:00 PM",
    "wind_down": "9:00 PM",
    "lights_out": "10:30 PM"
  },
  "schedule": [
    {
      "time": "5:00 AM",
      "label": "Wake up",
      "detail": "Water, shower, and get dressed in gym clothes.",
      "type": "morning",
      "anchor": true,
      "emoji": "☀️"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      wakeTime = '5:00 AM',
      gymTime = '5:45 AM',
      location = 'home',
      morningPlans = '',
      workPlans = '',
      workEndTime = '5:30 PM',
      hairWashDay = false,
      eveningPlans = '',
      tz = 'America/New_York',
    } = body

    const lunaContext = await buildLunaContext(ZOE_USER_ID)
    const routineContext = [
      lunaContext.assistantProfile?.dailyRoutine && `Her saved daily routine: ${lunaContext.assistantProfile.dailyRoutine}`,
      lunaContext.assistantProfile?.personalGoals && `Her saved personal goals: ${lunaContext.assistantProfile.personalGoals}`,
    ].filter(Boolean).join('\n') || 'Use the current lifestyle profile as the source of truth.'

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
      console.warn('[plan-my-day] own tasks unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
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
        console.warn('[plan-my-day] DRYP CRM unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
      }
    }

    if (!taskList.trim()) {
      taskList = 'No open tasks were pulled. Build a calm, focused workday using her normal anchors.'
    }

    const todayDate = new Date()
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(todayDate)
    const today = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(todayDate)
    const hour = localHour(todayDate, tz)
    const timeContext = hour < 10 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : 'evening'
    const gymFocus = ZOE_GYM_BY_DAY[weekday] ?? 'Use the weekly split from Zoe’s lifestyle profile'

    const userPrompt = `Today: ${today} (${timeContext})
Weekday gym focus: ${gymFocus}

${routineContext}

Wake time: ${wakeTime}
Gym arrival: ${gymTime || '5:45 AM'}
Location: ${location === 'home' ? 'Working from home' : 'Going into the DRYP office'}
${morningPlans ? `Morning plans: ${morningPlans}` : ''}
Protected work window: 10:30 AM to ${workEndTime || '5:30 PM'}
${workPlans ? `Work plans: ${workPlans}` : ''}
Hair today: ${hairWashDay ? 'Wash day, add 20 minutes for perm care' : 'Refresh day, add about 5 minutes'}
${eveningPlans ? `Evening plans: ${eveningPlans}` : 'No fixed evening plans'}

${taskList}

Build the full day. Include the exact weekday gym focus and exercises under the gym block. Protect breakfast, lunch, and dinner. Protect the 10:30 AM to 5:30 PM workday. Keep the plan flexible, include buffers, and add one happiness or restoration block when realistic.`

    const raw = await callAI(SYSTEM, userPrompt, 3200)
    const parsed = parseAIJson(raw)

    try {
      const db = createAdminClient()
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        date_key: localDateKey(todayDate, tz),
        timezone: tz,
        generation_type: 'day_plan',
        payload: parsed,
        source: 'ai',
        updated_at: todayDate.toISOString(),
      }, { onConflict: 'user_id,date_key,generation_type' })
    } catch (saveError) {
      console.error('[plan-my-day] failed to persist plan:', saveError instanceof Error ? saveError.message : saveError)
    }

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[plan-my-day]', message)
    return NextResponse.json({ error: 'Could not generate your plan.', detail: message }, { status: 500 })
  }
}
