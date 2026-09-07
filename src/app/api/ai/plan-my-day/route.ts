import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { localHour, localDateKey } from '@/lib/luna/dailyCache'
import { buildLunaContext } from '@/lib/luna/context'
import { ZOE_GYM_BY_DAY, ZOE_LIFESTYLE_PROFILE, ZOE_BUSINESS_FOCUS_BY_DAY, ZOE_WEEKDAY_BUSINESS_FOCUS_PROSE } from '@/lib/luna/zoeLifestyleProfile'
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar'
import { getAllValidGmailTokens, listGmailMessages } from '@/lib/gmail'
import { getOpenTasks, getClientRoster, type DryphubTask } from '@/lib/dryp-crm'
import { classifyMeetingLocation, type MeetingLocationType } from '@/lib/luna/meetingLocation'
import { deriveOutfitOccasion, OCCASION_PREP_MINUTES, OCCASION_LABEL } from '@/lib/luna/outfitOccasion'
import { movementLabel, type MovementChoice } from '@/lib/luna/movementAlternatives'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const STUCK_THRESHOLD_DAYS = 14

interface ClassifiedEvent {
  title: string
  time: string
  locationType: MeetingLocationType
  rawLocation: string
  attendeeEmails: string[]
}

function flagTask(t: DryphubTask) {
  const now = new Date()
  const due = t.due_date ? new Date(t.due_date) : null
  const updated = new Date(t.updated_at)
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / 86_400_000
  return {
    ...t,
    isOverdue: !!due && due < now,
    isDueSoon: !!due && due >= now && due.getTime() - now.getTime() <= 7 * 86_400_000,
    isStuck: daysSinceUpdate > STUCK_THRESHOLD_DAYS && !['waiting_client'].includes(t.status),
  }
}

const SYSTEM = `You are LUNA, Zoe's personal life scheduler and day planner. Zoe wants you to behave like a planner that already knows her life and proposes the day, not a chatbot that asks what to do.

${ZOE_LIFESTYLE_PROFILE}

${ZOE_WEEKDAY_BUSINESS_FOCUS_PROSE}

OTHER CONTEXT
- Hair: Zoe has a perm. On wash days add 20 extra minutes to hair time; on refresh days add about 5 minutes.
- She does not have a dog. Never mention walking a dog.
- She works from home or from the DRYP office in the Tampa area.
- Bed preparation should begin around 9:00 PM, with lights out around 10:30 PM to support her 5:00 AM wake-up.
- She does best with structured but flexible blocks, not back-to-back task marathons.
- Build 20 to 30 minute buffers between intense blocks. Avoid more than 90 minutes of focused work without a break.

PLANNING RULES
- Generate a complete timed schedule from wake-up through sleep.
- Her standard morning sequence is wake, shower (the trigger — never default to tea or journaling before it), skincare/SPF, curly hair up with bangs down, gym clothes, tea + breakfast, a short calming journal moment, movement, protein, refresh, then makeup/hair/work outfit before business.
- Rank the business day in this order: fixed meetings/deadlines, revenue and urgent clients, overdue/stuck DRYP work, promised deliverables, project work, follow-ups/approvals, then lower-priority admin — but follow today's specific weekday business focus theme above for what to actually emphasize.
- Include the correct named gym focus for the weekday and list the workout under the gym block, UNLESS a movement choice other than gym was given — in that case use that choice's label instead of a gym workout block.
- Protect work from 10:00 AM to 6:00 PM every day unless a real fixed event says otherwise.
- Breakfast, lunch, and dinner are mandatory anchors. Never omit them or schedule over them.
- Include a "Get ready" block sized to the given prep-time-minutes budget for today's outfit occasion, positioned before any meeting it applies to.
- Do not punish a changed or low-energy day. Scale optional tasks and keep anchors.
- Weave real open tasks into the work blocks with realistic estimates.

Return ONLY valid JSON:
{
  "day_energy": "1-2 sentence read of the day",
  "ai_message": "warm practical note from Luna",
  "gym_focus": "the correct weekday workout focus, or the movement choice label if not gym",
  "key_anchors": {
    "wake": "5:00 AM",
    "gym": "5:45 AM or null",
    "at_work": "10:00 AM",
    "lunch": "12:30 PM",
    "leave_work": "6:00 PM",
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
    interface PlanBody {
      wakeTime?: string; gymTime?: string; location?: 'home' | 'office'
      morningPlans?: string; workPlans?: string; workEndTime?: string
      hairWashDay?: boolean; eveningPlans?: string; movementChoice?: MovementChoice; tz?: string
    }
    const body = await req.json().catch(() => ({})) as PlanBody
    const {
      wakeTime = '5:00 AM',
      gymTime = '5:45 AM',
      location = 'home',
      morningPlans = '',
      workPlans = '',
      workEndTime = '6:00 PM',
      hairWashDay = false,
      eveningPlans = '',
      movementChoice = 'gym',
      tz = 'America/New_York',
    } = body

    const todayDate = new Date()
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' }).format(todayDate)
    const today = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(todayDate)
    const hour = localHour(todayDate, tz)
    const timeContext = hour < 10 ? 'morning' : hour < 14 ? 'midday' : hour < 18 ? 'afternoon' : 'evening'
    const gymFocus = ZOE_GYM_BY_DAY[weekday] ?? 'Use the weekly split from Zoe’s lifestyle profile'
    const businessFocus = ZOE_BUSINESS_FOCUS_BY_DAY[weekday] ?? null

    const lunaContext = await buildLunaContext(ZOE_USER_ID)
    const routineContext = [
      lunaContext.assistantProfile?.dailyRoutine && `Her saved daily routine: ${lunaContext.assistantProfile.dailyRoutine}`,
      lunaContext.assistantProfile?.personalGoals && `Her saved personal goals: ${lunaContext.assistantProfile.personalGoals}`,
    ].filter(Boolean).join('\n') || 'Use the current lifestyle profile as the source of truth.'

    // Gather real Calendar + Gmail + DRYP CRM — same pattern as the Sunday
    // Weekly Reset gather step, scoped to today instead of the week ahead.
    const [events, gmailTokens, drypTasksRaw, clientRoster] = await Promise.all([
      getTodayEvents().catch(() => [] as CalendarEvent[]),
      getAllValidGmailTokens().catch(() => []),
      getOpenTasks(30).catch(() => [] as DryphubTask[]),
      getClientRoster().catch(() => []),
    ])

    const classifiedEvents: ClassifiedEvent[] = events.map(ev => ({
      title: ev.title,
      time: ev.startTime,
      locationType: classifyMeetingLocation(
        { location: ev.location, description: ev.description, hangoutLink: ev.hangoutLink, conferenceData: ev.conferenceData, attendeeEmails: ev.attendeeEmails, title: ev.title },
        clientRoster,
      ),
      rawLocation: ev.location ?? '',
      attendeeEmails: ev.attendeeEmails ?? [],
    }))

    const drypTasks = drypTasksRaw.map(flagTask)
    const overdue = drypTasks.filter(t => t.isOverdue)
    const dueSoon = drypTasks.filter(t => t.isDueSoon)
    const stuck = drypTasks.filter(t => t.isStuck)

    let emailSummary = ''
    let commsCounts = { urgent: 0, needsReview: 0, drypClient: 0, meetings: 0, topAction: '' }
    try {
      const db = createAdminClient()
      const { data: classifications } = await db
        .from('email_classifications')
        .select('category, is_urgent, needs_review, is_meeting, action')
        .limit(100)
      const rows = (classifications ?? []) as { category: string; is_urgent: boolean; needs_review: boolean; is_meeting: boolean; action?: string }[]
      commsCounts = {
        urgent: rows.filter(r => r.is_urgent).length,
        needsReview: rows.filter(r => r.needs_review).length,
        drypClient: rows.filter(r => r.category === 'dryp_client').length,
        meetings: rows.filter(r => r.is_meeting).length,
        topAction: rows.find(r => r.is_urgent && r.action)?.action ?? '',
      }
    } catch { /* comms summary unavailable — proceed without it */ }

    try {
      const allMessages = (await Promise.all(
        gmailTokens.map(t => listGmailMessages(t.access_token, 'newer_than:1d in:inbox', 10, 'metadata').catch(() => []))
      )).flat()
      emailSummary = allMessages.slice(0, 15).map(m => `• ${m.subject} — from ${m.from}`).join('\n')
    } catch { /* Gmail unavailable */ }

    // Outfit occasion + prep-time budget, derived from today's real events —
    // not a second AI call, pure code.
    const isSaturdayLight = weekday === 'Saturday' && classifiedEvents.length === 0
    const clientEmailSet = new Set(clientRoster.map(r => r.email))
    const { occasion } = deriveOutfitOccasion({
      events: classifiedEvents,
      workLocationDefault: businessFocus?.workLocationDefault ?? 'home',
      isSaturdayWithNothingScheduled: isSaturdayLight,
      eveningPlansText: eveningPlans,
      clientEmails: clientEmailSet,
    })
    const prepMinutes = OCCASION_PREP_MINUTES[occasion]

    let taskList = ''
    const ownTaskList = await (async () => {
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
        return (ownTasks ?? []).map((task: OwnTaskRow) =>
          `• ${task.title}${task.category ? ` (${task.category})` : ''}${task.urgency_level ? ` [${task.urgency_level}]` : ''}${task.due_date ? ` — due ${task.due_date}` : ''}`
        ).join('\n')
      } catch (dbError) {
        console.warn('[plan-my-day] own tasks unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
        return ''
      }
    })()
    if (ownTaskList) taskList += `Her own tasks:\n${ownTaskList}\n\n`
    if (drypTasks.length) {
      taskList += `DRYP CRM open tasks (${overdue.length} overdue, ${dueSoon.length} due soon, ${stuck.length} stuck):\n` +
        drypTasks.map(t => `• ${t.title}${t.account_name ? ` (${t.account_name})` : ''}${t.priority ? ` [${t.priority}]` : ''}${t.due_date ? ` — due ${t.due_date.slice(0, 10)}` : ''}${t.isOverdue ? ' [OVERDUE]' : ''}${t.isStuck ? ' [STUCK]' : ''}`).join('\n')
    }
    if (!taskList.trim()) taskList = 'No open tasks were pulled. Build a calm, focused workday using her normal anchors.'

    const movementLine = movementChoice === 'gym'
      ? `Movement today: gym (${gymFocus})`
      : `Movement today: ${movementLabel(movementChoice)} — NOT the gym, do not schedule a gym block, schedule this instead.`

    const userPrompt = `Today: ${today} (${timeContext})
${businessFocus ? `Today's business focus theme: ${businessFocus.theme} — ${businessFocus.note}` : ''}
${movementLine}

${routineContext}

Wake time: ${wakeTime}
${movementChoice === 'gym' ? `Gym arrival: ${gymTime || '5:45 AM'}` : ''}
Location: ${location === 'home' ? 'Working from home' : 'Going into the DRYP office'}
${morningPlans ? `Morning plans: ${morningPlans}` : ''}
Protected work window: 10:00 AM to ${workEndTime || '6:00 PM'}
${workPlans ? `Work plans: ${workPlans}` : ''}
Hair today: ${hairWashDay ? 'Wash day, add 20 minutes for perm care' : 'Refresh day, add about 5 minutes'}
${eveningPlans ? `Evening plans: ${eveningPlans}` : 'No fixed evening plans'}

TODAY'S REAL CALENDAR EVENTS:
${classifiedEvents.length ? classifiedEvents.map(e => `• ${e.time} — ${e.title} [${e.locationType}]`).join('\n') : 'No events on the calendar today.'}

OUTFIT OCCASION TODAY: ${OCCASION_LABEL[occasion]} — budget ${prepMinutes} minutes for getting ready (hair, makeup, jewelry, outfit) as an explicit schedule block${prepMinutes === 0 ? ' (gym day — curly hair up, bangs down, no outfit decision needed)' : ''}.

RECENT EMAIL (last 24h, flag anything urgent):
${emailSummary || 'No email data available.'}

${taskList}

Build the full day. Include the exact weekday gym focus and exercises under the gym block only if today's movement is gym. Protect breakfast, lunch, and dinner. Protect the 10:00 AM to ${workEndTime || '6:00 PM'} workday. Rank the business portion by today's focus theme. Keep the plan flexible, include buffers, and add one happiness or restoration block when realistic.`

    // A full day schedule (7+ blocks, each with time/label/detail/type/
    // anchor/emoji) is complex enough that the model occasionally returns
    // truncated or malformed JSON — same failure class hit and fixed in
    // the Weekly Reset finalize route. Same fix: bump output headroom and
    // give it up to 2 self-repair passes before giving up.
    let raw = await callAI(SYSTEM, userPrompt, 4500)
    let parsed: Record<string, unknown> | null = null
    let parseFailureReason = ''
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        parsed = parseAIJson<Record<string, unknown>>(raw)
        parseFailureReason = ''
        break
      } catch (e) {
        parsed = null
        parseFailureReason = e instanceof Error ? e.message : 'invalid JSON'
      }
      if (attempt < 2) {
        const repairPrompt = `Your previous JSON response had a problem: ${parseFailureReason}. Here is what you returned:\n${raw}\n\nReturn the corrected, complete, VALID JSON in the exact same shape. Double-check every string value is properly escaped and every array/object is properly closed.`
        raw = await callAI(SYSTEM, repairPrompt, 4500)
      }
    }
    if (!parsed) throw new Error(`AI could not produce valid JSON after retries: ${parseFailureReason}`)

    const payload = {
      ...parsed,
      occasion,
      movement_choice: movementChoice,
      business_focus: businessFocus?.theme ?? null,
      comms_summary: commsCounts,
    }

    try {
      const db = createAdminClient()
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        date_key: localDateKey(todayDate, tz),
        timezone: tz,
        generation_type: 'day_plan',
        payload,
        source: 'ai',
        updated_at: todayDate.toISOString(),
      }, { onConflict: 'user_id,date_key,generation_type' })
    } catch (saveError) {
      console.error('[plan-my-day] failed to persist plan:', saveError instanceof Error ? saveError.message : saveError)
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[plan-my-day]', message)
    return NextResponse.json({ error: 'Could not generate your plan.', detail: message }, { status: 500 })
  }
}
