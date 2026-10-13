import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { localHour, localDateKey } from '@/lib/luna/dailyCache'
import { planningDateKey, planningWeekMondayKey } from '@/lib/luna/planningCycle'
import { buildLunaContext } from '@/lib/luna/context'
import { ZOE_GYM_BY_DAY, ZOE_LIFESTYLE_PROFILE, ZOE_BUSINESS_FOCUS_BY_DAY, ZOE_WEEKDAY_BUSINESS_FOCUS_PROSE } from '@/lib/luna/zoeLifestyleProfile'
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar'
import { getAllValidGmailTokens, listGmailMessages } from '@/lib/gmail'
import { getOpenTasks, getClientRoster, type DryphubTask } from '@/lib/dryp-crm'
import { classifyMeetingLocation, estimateTravelBuffer, type MeetingLocationType } from '@/lib/luna/meetingLocation'
import { deriveOutfitOccasion, OCCASION_PREP_MINUTES, OCCASION_LABEL } from '@/lib/luna/outfitOccasion'
import { movementLabel, type MovementChoice } from '@/lib/luna/movementAlternatives'
import { calculatePriorityScore } from '@/lib/priority'
import type { Task } from '@/types'

const ZOE_USER_ID = OWNER_USER_ID
const STUCK_THRESHOLD_DAYS = 14

// DRYP's `priority` field is free text, not a fixed union — same loose
// mapping the Sunday Weekly Reset finalize route uses so DRYP tasks get a
// real score instead of being skipped by the scorer entirely.
function drypPriorityToUrgency(priority?: string): Task['urgency_level'] {
  const p = (priority ?? '').toLowerCase()
  if (p.includes('urgent') || p.includes('critical')) return 'critical'
  if (p.includes('high')) return 'high'
  if (p.includes('low')) return 'low'
  return 'medium'
}

interface ClassifiedEvent {
  title: string
  time: string
  locationType: MeetingLocationType
  rawLocation: string
  attendeeEmails: string[]
  travelBuffer: ReturnType<typeof estimateTravelBuffer>
}

function flagTask(t: DryphubTask, tz: string) {
  const now = new Date()
  const updated = new Date(t.updated_at)
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / 86_400_000
  // due_date is a calendar date, not an instant — comparing it against a
  // raw UTC "now" made a task due "today" in her real timezone look
  // overdue from the evening before. Compare calendar-date keys instead.
  const todayKey = localDateKey(now, tz)
  const dueKey = t.due_date ? t.due_date.slice(0, 10) : null
  const sevenDaysOutKey = localDateKey(new Date(now.getTime() + 7 * 86_400_000), tz)
  return {
    ...t,
    isOverdue: !!dueKey && dueKey < todayKey,
    isDueSoon: !!dueKey && dueKey >= todayKey && dueKey <= sevenDaysOutKey,
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
- Every meeting/call/event block in the schedule must be a real event that actually appears in the calendar/event data given to you below — copy its real title, time, and location. NEVER invent a meeting, call, or event that isn't in that real data, even if it sounds plausible given her business context (a "networking event," a client catch-up, anything tied to a real name like a teammate or client). If there are no real meetings today, don't add one. Work blocks, errands, and self-care suggestions are your own creative proposals and may be invented; meetings are a factual claim about her actual calendar and must never be.
- Generate a complete timed schedule from wake-up through sleep.
- Her standard morning sequence is wake, shower (the trigger — never default to tea or journaling before it), skincare/SPF, curly hair up with bangs down, gym clothes, tea + breakfast, a short calming journal moment, movement, protein, refresh, then makeup/hair/work outfit before business.
- Rank the business day in this order: fixed meetings/deadlines, revenue and urgent clients, overdue/stuck DRYP work, promised deliverables, project work, follow-ups/approvals, then lower-priority admin — but follow today's specific weekday business focus theme above for what to actually emphasize.
- Include the correct named gym focus for the weekday and list the workout under the gym block, UNLESS a movement choice other than gym was given — in that case use that choice's label instead of a gym workout block.
- Protect work from 10:00 AM to 6:00 PM every day unless a real fixed event says otherwise.
- Breakfast, lunch, and dinner are mandatory anchors. Never omit them or schedule over them.
- Include a "Get ready" block sized to the given prep-time-minutes budget for today's outfit occasion, positioned before any meeting it applies to.
- Outfit direction: easy, classy, sexy, fashionable — professional when the occasion actually calls for it, never defaulting to overly formal. Avoid generic corporate/stiff styling language.
- Do not punish a changed or low-energy day. Scale optional tasks and keep anchors.
- Weave real open tasks into the work blocks with realistic estimates.
- When a calendar event lists a real in-person trip with a drive/buffer estimate, add real "leave by" and "drive back" blocks using those exact minutes — don't just show the meeting time floating with no travel around it.

Return ONLY valid JSON:
{
  "day_energy": "1-2 sentence read of the day",
  "ai_message": "warm practical note from Luna",
  "gym_focus": "the correct weekday workout focus, or the movement choice label if not gym",
  "top_3": [{ "title": "...", "reason": "short reason this matters today" }],
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
      wakeTime?: string; gymTime?: string; location?: 'home' | 'office' | 'split' | 'auto'
      morningPlans?: string; workPlans?: string; workEndTime?: string
      hairWashDay?: boolean; eveningPlans?: string; movementChoice?: MovementChoice; tz?: string
      saturdayType?: string | null
    }
    const body = await req.json().catch(() => ({})) as PlanBody
    const {
      wakeTime = '5:00 AM',
      gymTime = '5:45 AM',
      location: locationInput = 'home',
      morningPlans = '',
      workPlans = '',
      workEndTime = '6:00 PM',
      hairWashDay = false,
      eveningPlans = '',
      movementChoice = 'gym',
      saturdayType = null,
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

    // This week's already-decided plan for today, from the Weekly Reset —
    // a starting point to confirm/adjust against real-time data below, not
    // something to regenerate from scratch when it already exists.
    const weeklyPlanForToday = await (async () => {
      try {
        const db = createAdminClient()
        const weekKey = planningWeekMondayKey(todayDate, tz)
        const { data } = await db
          .from('daily_generation_cache')
          .select('payload')
          .eq('user_id', ZOE_USER_ID)
          .eq('date_key', weekKey)
          .eq('generation_type', 'weekly_reset_final')
          .maybeSingle()
        const days = (data?.payload as { days?: Record<string, unknown> } | undefined)?.days
        return days?.[weekday] ?? null
      } catch { return null }
    })()

    // Gather real Calendar + Gmail + DRYP CRM — same pattern as the Sunday
    // Weekly Reset gather step, scoped to today instead of the week ahead.
    const [events, gmailTokens, drypTasksRaw, clientRoster] = await Promise.all([
      getTodayEvents().catch(() => [] as CalendarEvent[]),
      getAllValidGmailTokens().catch(() => []),
      getOpenTasks(30).catch(() => [] as DryphubTask[]),
      getClientRoster().catch(() => []),
    ])

    const classifiedEvents: ClassifiedEvent[] = events.map(ev => {
      const eventInput = { location: ev.location, description: ev.description, hangoutLink: ev.hangoutLink, conferenceData: ev.conferenceData, attendeeEmails: ev.attendeeEmails, title: ev.title }
      return {
        title: ev.title,
        time: ev.startTime,
        locationType: classifyMeetingLocation(eventInput, clientRoster),
        rawLocation: ev.location ?? '',
        attendeeEmails: ev.attendeeEmails ?? [],
        travelBuffer: estimateTravelBuffer(eventInput, clientRoster),
      }
    })

    // "Let Luna choose" resolves off today's real calendar, not a guess —
    // an in-person commitment means office, otherwise home.
    const hasInPersonToday = classifiedEvents.some(e => e.locationType === 'in_person_office' || e.locationType === 'in_person_client')
    const location: 'home' | 'office' | 'split' = locationInput === 'auto'
      ? (hasInPersonToday ? 'office' : 'home')
      : locationInput

    const drypTasks = drypTasksRaw.map(t => flagTask(t, tz))
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
    interface OwnTaskRow { title: string; category?: string; project?: string; due_date?: string; urgency_level?: Task['urgency_level']; money_impact?: number }
    const ownTasks: OwnTaskRow[] = await (async () => {
      try {
        const db = createAdminClient()
        const { data } = await db
          .from('tasks')
          .select('title, category, project, due_date, urgency_level, money_impact, status')
          .eq('user_id', ZOE_USER_ID)
          .not('status', 'in', '("done","cancelled")')
          .order('priority_score', { ascending: false })
          .limit(20)
        return (data ?? []) as OwnTaskRow[]
      } catch (dbError) {
        console.warn('[plan-my-day] own tasks unavailable:', dbError instanceof Error ? dbError.message : String(dbError))
        return []
      }
    })()
    const ownTaskList = ownTasks.map(task =>
      `• ${task.title}${task.category ? ` (${task.category})` : ''}${task.urgency_level ? ` [${task.urgency_level}]` : ''}${task.due_date ? ` — due ${task.due_date}` : ''}`
    ).join('\n')
    if (ownTaskList) taskList += `Her own tasks:\n${ownTaskList}\n\n`
    if (drypTasks.length) {
      taskList += `DRYP CRM open tasks (${overdue.length} overdue, ${dueSoon.length} due soon, ${stuck.length} stuck):\n` +
        drypTasks.map(t => `• ${t.title}${t.account_name ? ` (${t.account_name})` : ''}${t.priority ? ` [${t.priority}]` : ''}${t.due_date ? ` — due ${t.due_date.slice(0, 10)}` : ''}${t.isOverdue ? ' [OVERDUE]' : ''}${t.isStuck ? ' [STUCK]' : ''}`).join('\n')
    }
    if (!taskList.trim()) taskList = 'No open tasks were pulled. Build a calm, focused workday using her normal anchors.'

    // Objective ranking first, same as the Sunday Weekly Reset finalize
    // route — the AI phrases the top candidates, it doesn't invent the
    // ranking, and every weekday plan gets a real Top 3, not just Sunday's.
    const scoredLocal = ownTasks.map(t => ({
      title: t.title,
      score: calculatePriorityScore({ urgency_level: t.urgency_level, due_date: t.due_date, money_impact: t.money_impact, project: t.project, category: t.category }),
      source: 'local' as const,
    }))
    const scoredDryp = drypTasks.map(t => ({
      // A blocked task is deterministically re-labeled as a follow-up, not
      // fresh startable work — the AI is told "isStuck" in prose elsewhere,
      // but this makes the distinction real in the candidate list itself,
      // so it can't quietly get rescheduled as if it were actionable.
      title: (t.isStuck ? 'Follow up on blocked: ' : '') + t.title + (t.account_name ? ` (${t.account_name})` : ''),
      score: calculatePriorityScore({ urgency_level: drypPriorityToUrgency(t.priority), due_date: t.due_date }),
      source: 'dryp' as const,
    }))

    // A bill due today or overdue is a real financial urgency, not a task
    // she's manually entered — feed it through the same objective scorer
    // as everything else instead of leaving bills invisible to planning.
    const scoredBills = await (async () => {
      try {
        const db = createAdminClient()
        const { data } = await db
          .from('bills')
          .select('name, due_date, expected_amount')
          .eq('user_id', ZOE_USER_ID)
          .in('status', ['upcoming', 'needs_review'])
          .lte('due_date', localDateKey(new Date(new Date().getTime() + 7 * 86_400_000), tz))
        return ((data ?? []) as { name: string; due_date: string; expected_amount: number | null }[]).map(b => ({
          title: `Pay ${b.name}${b.expected_amount ? ` ($${b.expected_amount.toFixed(0)})` : ''}`,
          score: calculatePriorityScore({ urgency_level: b.due_date <= localDateKey(new Date(), tz) ? 'critical' : 'high', due_date: b.due_date }),
          source: 'money' as const,
        }))
      } catch { return [] }
    })()

    const scoredInvoices = await (async () => {
      try {
        const db = createAdminClient()
        const today = localDateKey(new Date(), tz)
        const { data } = await db
          .from('dryp_invoices')
          .select('client_name, amount, due_date, status')
          .eq('user_id', ZOE_USER_ID)
          .in('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
        return ((data ?? []) as { client_name: string; amount: number; due_date: string | null; status: string }[])
          .filter(inv => inv.due_date && inv.due_date <= today)
          .map(inv => ({
            title: `${inv.client_name} invoice is overdue ($${inv.amount.toFixed(0)})`,
            score: calculatePriorityScore({ urgency_level: 'critical', due_date: inv.due_date ?? undefined, category: 'Money / Invoices' }),
            source: 'money' as const,
          }))
      } catch { return [] }
    })()

    const topCandidates = [...scoredLocal, ...scoredDryp, ...scoredBills, ...scoredInvoices].sort((a, b) => b.score - a.score).slice(0, 6)

    // Friday business money closeout — real DRYP financial data, not just
    // the "Invoice & Close Loops" theme prose that used to be all Friday got.
    const fridayMoneyCloseout = weekday === 'Friday' ? await (async () => {
      try {
        const db = createAdminClient()
        const monday = new Date(); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
        const weekStart = localDateKey(monday, tz)
        const { data } = await db
          .from('dryp_invoices')
          .select('client_name, amount, status, paid_date')
          .eq('user_id', ZOE_USER_ID)
        const invoices = (data ?? []) as { client_name: string; amount: number; status: string; paid_date: string | null }[]
        const needToSend = invoices.filter(i => ['draft', 'ready_to_invoice'].includes(i.status))
        const outstanding = invoices.filter(i => ['sent', 'viewed', 'partially_paid', 'overdue'].includes(i.status))
        const paidThisWeek = invoices.filter(i => i.paid_date && i.paid_date >= weekStart)
        return {
          needToSendCount: needToSend.length,
          needToSendNames: needToSend.map(i => i.client_name),
          outstandingTotal: outstanding.reduce((s, i) => s + i.amount, 0),
          revenueClosedThisWeek: paidThisWeek.reduce((s, i) => s + i.amount, 0),
        }
      } catch { return null }
    })() : null

    // Completion memory: if she already logged today's movement (gym or
    // otherwise), the planner should know rather than blindly suggesting it
    // again — the log exists precisely so this can be read back.
    const alreadyMovedToday = await (async () => {
      try {
        const db = createAdminClient()
        const todayKey = localDateKey(todayDate, tz)
        const { data } = await db.from('workout_logs').select('activity_type').eq('user_id', ZOE_USER_ID).eq('date_key', todayKey).limit(1)
        return data?.[0]?.activity_type ?? (data?.length ? 'gym' : null)
      } catch { return null }
    })()

    const movementLine = alreadyMovedToday
      ? `Movement today: already completed and logged (${movementLabel(alreadyMovedToday as MovementChoice)}) — do not schedule another movement/gym block, just acknowledge it's done.`
      : movementChoice === 'gym'
        ? `Movement today: gym (${gymFocus})`
        : `Movement today: ${movementLabel(movementChoice)} — NOT the gym, do not schedule a gym block, schedule this instead.`

    const userPrompt = `Today: ${today} (${timeContext})
${weeklyPlanForToday ? `ALREADY DECIDED IN THIS WEEK'S RESET FOR TODAY — use these as the real starting point, only depart from them where the calendar/DRYP/bill data below has genuinely changed since Sunday: ${JSON.stringify(weeklyPlanForToday)}` : ''}
${businessFocus ? `Today's business focus theme: ${businessFocus.theme} — ${businessFocus.note}` : ''}
${fridayMoneyCloseout ? `FRIDAY MONEY CLOSEOUT — real DRYP financial data: ${fridayMoneyCloseout.needToSendCount} invoice(s) need to be created/sent${fridayMoneyCloseout.needToSendNames.length ? ` (${fridayMoneyCloseout.needToSendNames.join(', ')})` : ''}. $${fridayMoneyCloseout.outstandingTotal.toFixed(0)} outstanding across open invoices. $${fridayMoneyCloseout.revenueClosedThisWeek.toFixed(0)} in revenue closed (paid) this week. Weave the real, non-zero items from this into today's work blocks or follow-ups — don't invent generic "invoicing" busywork if these are already zero.` : ''}
${movementLine}

${routineContext}

Wake time: ${wakeTime}
${movementChoice === 'gym' ? `Gym arrival: ${gymTime || '5:45 AM'}` : ''}
Location: ${location === 'home' ? 'Working from home' : location === 'office' ? 'Going into the DRYP office' : 'A split day — partly home, partly office. Build in a real transition block between the two, not just a location label.'}
${weekday === 'Saturday' ? `SATURDAY TYPE: ${saturdayType ?? 'not specified'} — keep today deliberately light. Only include truly necessary unfinished work (if any), movement, and dinner as real anchors. Cleaning and errands are optional, lightly suggested, never forced. Do not schedule a protected work block or business-focus theme unless she explicitly gave work plans below — no unnecessary work pressure on Saturday.` : ''}
${morningPlans ? `Morning plans: ${morningPlans}` : ''}
Protected work window: 10:00 AM to ${workEndTime || '6:00 PM'}
${workPlans ? `Work plans: ${workPlans}` : ''}
Hair today: ${hairWashDay ? 'Wash day, add 20 minutes for perm care' : 'Refresh day, add about 5 minutes'}
${eveningPlans ? `Evening plans: ${eveningPlans}` : 'No fixed evening plans'}

TODAY'S REAL CALENDAR EVENTS:
${classifiedEvents.length ? classifiedEvents.map(e => `• ${e.time} — ${e.title} [${e.locationType}]${e.travelBuffer ? ` — real in-person trip: ~${e.travelBuffer.driveMinutes} min drive to ${e.travelBuffer.locationLabel}, budget ${e.travelBuffer.bufferBeforeMinutes} min before (drive + park) and ${e.travelBuffer.bufferAfterMinutes} min after` : ''}`).join('\n') : 'No events on the calendar today.'}
${classifiedEvents.filter(e => e.travelBuffer).length >= 2 ? 'Multiple in-person trips today — check whether any of them are close enough in time/place to combine, or far enough apart that going home in between and back out again would waste more time than staying out. Do not default to a home round-trip between them without checking this.' : ''}

OUTFIT OCCASION TODAY: ${OCCASION_LABEL[occasion]} — budget ${prepMinutes} minutes for getting ready (hair, makeup, jewelry, outfit) as an explicit schedule block${prepMinutes === 0 ? ' (gym day — curly hair up, bangs down, no outfit decision needed)' : ''}.

RECENT EMAIL (last 24h, flag anything urgent):
${emailSummary || 'No email data available.'}

${taskList}

TOP-SCORED CANDIDATE TASKS (pre-ranked by an objective scorer — pick today's top_3 from these, don't invent new ones; break ties using today's business focus theme):
${topCandidates.map(c => `• [${c.source}] ${c.title} (score ${c.score})`).join('\n') || 'None available — use today\'s business focus theme to name the top priority instead.'}

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
      resolved_location: location,
      // The exact CRM tasks/deliverables considered for today — previously
      // only used server-side to build the prompt, never actually shown to
      // her as its own "Work" section distinct from the flowing schedule.
      work_items: topCandidates.slice(0, 5).map(c => ({ title: c.title, source: c.source })),
    }

    try {
      const db = createAdminClient()
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        // Plan My Day rolls over at 4am local, not midnight — she's often
        // still up past midnight and "today's plan" shouldn't flip while
        // she's still awake in the previous day. This is the one date_key
        // in this route that means "which day is this plan for" — the
        // other localDateKey() calls above are real calendar-date lookups
        // (bill due dates, today's logged workout) and stay midnight-based.
        date_key: planningDateKey(todayDate, tz),
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
