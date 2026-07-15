import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createClient } from '@supabase/supabase-js'
import { localHour } from '@/lib/luna/dailyCache'

const ZOE_IDS = [
  '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb',
  'dc25215f-cda4-4e91-84ee-c9fe49678b6b',
]

function dryhubAdmin() {
  const url = process.env.DRYP_SUPABASE_URL ?? 'https://hyuxgfzjjzatvfjcfftm.supabase.co'
  const key = (process.env.DRYP_SUPABASE_SERVICE_KEY ?? process.env.DRYPHUB_SERVICE_ROLE_KEY)!
  return createClient(url, key, { auth: { persistSession: false } })
}

const SYSTEM = `You are LUNA — Zoe's personal life scheduler and day planner. You know everything about her:
- Birth chart: Scorpio Sun/Mercury, Cancer Moon/Rising/North Node, Gemini Rising, Virgo Midheaven, Venus Sagittarius, Mars Libra, Saturn Taurus
- Human Design: Self-Projected Projector 4/6 — max 6 hours real focused work, needs rest before she burns out, energy is precious
- Morning routine: 7:30 wake → 7:45 quiet coffee → 8:00 journal/spiritual → 8:15 shower+hair → 8:45 get ready → 9:10 breakfast → 9:30 plan → 9:45 home reset → 10:00 work
- Hair: she has a perm — on wash days (Mon/Thu) add 20 extra mins to hair block; on refresh days just 5 extra mins
- Breakfasts she eats: waffles, bagels, pancakes, oatmeal, french toast — never eggs
- She does NOT have a dog. Never mention walking a dog.
- She works from home or from the DRYP office (Tampa area)
- Bed prep should start ~9 PM, lights out ~10:30-11 PM
- She functions best with structured but flexible blocks, not back-to-back task marathons
- As a Projector: schedule 20-30 min buffers between intense blocks. No more than 90 min focused work without a break.

Generate a COMPLETE timed daily schedule from wake to sleep. Include every anchor: wake up, out the door (if office), at work/desk, lunch, leave work, dinner, evening wind-down, bed prep, lights out.

Weave her actual DRYP CRM tasks into the work blocks — give each task a realistic time slot based on estimated effort.

Return ONLY valid JSON:
{
  "day_energy": "1-2 sentence energy read — what kind of day is this based on her tasks and schedule context",
  "ai_message": "personal warm note from LUNA to open the plan — 2-3 sentences, grounded in what's actually on her plate today",
  "key_anchors": {
    "wake": "7:30 AM",
    "out_door": "9:45 AM or null if WFH",
    "at_work": "10:00 AM",
    "lunch": "12:30 PM",
    "leave_work": "6:00 PM",
    "wind_down": "9:00 PM",
    "lights_out": "10:30 PM"
  },
  "schedule": [
    {
      "time": "7:30 AM",
      "label": "Wake up",
      "detail": "Water. No phone yet. Open the blinds.",
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
      wakeTime      = '7:30 AM',
      location      = 'home',
      workEndTime   = '6:00 PM',
      hairWashDay   = false,
      eveningPlans  = '',
      tz            = 'America/New_York',
    } = body

    // Pull open tasks from DRYP CRM — only if the key is available
    let taskList = 'No tasks pulled from DRYP CRM — build a focused general day plan based on her typical work.'
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

        const list = (tasks ?? []).map(t =>
          `• ${t.title}${t.account_name ? ` (${t.account_name})` : ''}${t.priority ? ` [${t.priority}]` : ''}${t.due_date ? ` — due ${t.due_date.slice(0, 10)}` : ''}`
        ).join('\n')
        if (list) taskList = list
      } catch (dbErr) {
        console.warn('[plan-my-day] Supabase unavailable:', dbErr instanceof Error ? dbErr.message : String(dbErr))
      }
    }

    const today = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date())
    const hour  = localHour(new Date(), tz)
    const timeContext = hour < 10 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : 'evening'

    const userPrompt = `Today: ${today} (${timeContext})
Wake time: ${wakeTime}
Location: ${location === 'home' ? 'Working from home' : 'Going into the DRYP office'}
Work end target: ${workEndTime}
Hair today: ${hairWashDay ? 'WASH DAY — add 20 extra mins to shower/hair block for perm care' : 'Refresh day — 5 extra mins for curl refresh'}
${eveningPlans ? `Evening plans: ${eveningPlans}` : 'No specific evening plans — free evening'}

DRYP CRM open tasks to schedule:
${taskList}

Build her complete day from wake to sleep. Time-block her morning routine first, then slot her real work tasks into the 10 AM–${workEndTime} window, then build her evening down to lights out. Be realistic — Projector energy, max 6 focused work hours, 20-30 min buffers built in.`

    const raw    = await callAI(SYSTEM, userPrompt, 3000)
    const parsed = parseAIJson(raw)

    return NextResponse.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[plan-my-day]', msg)
    return NextResponse.json({ error: 'Could not generate your plan.', detail: msg }, { status: 500 })
  }
}
