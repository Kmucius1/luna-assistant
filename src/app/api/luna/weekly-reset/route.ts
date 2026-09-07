import { NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWeekEvents, type CalendarEvent } from '@/lib/calendar'
import { getAllValidGmailTokens, listGmailMessages } from '@/lib/gmail'
import { getOpenTasks, getSummaryStats, getAccounts, getClientRoster, type DryphubTask } from '@/lib/dryp-crm'
import { classifyMeetingLocation, type MeetingLocationType } from '@/lib/luna/meetingLocation'
import { ZOE_LIFESTYLE_PROFILE, ZOE_WORK_LOCATION_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const STUCK_THRESHOLD_DAYS = 14

function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

interface ClassifiedEvent {
  title: string
  day: string
  time: string
  locationType: MeetingLocationType
  rawLocation: string
}

interface DrypTaskFlags extends DryphubTask {
  isOverdue: boolean
  isDueSoon: boolean
  isStuck: boolean
}

function flagDrypTask(t: DryphubTask): DrypTaskFlags {
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

const SYSTEM = `You are LUNA, Zoe's personal planner. She wants you to behave like a planner that already knows her life from real data and proposes the week — not a chatbot that asks what to do.

${ZOE_LIFESTYLE_PROFILE}

Zoe's default work-location pattern by weekday (she can override this in the questionnaire that follows): ${JSON.stringify(ZOE_WORK_LOCATION_BY_DAY)}

You are given her real calendar events for the coming week (already classified by location type), her real open DRYP CRM tasks (already flagged overdue/due-soon/stuck), account pipeline stages, and recent email subject lines/snippets. Synthesize this into a clear picture of what the week actually holds — do not invent commitments that aren't in the data.

Return ONLY valid JSON:
{
  "week_summary": "2-3 sentence honest read of what this week actually holds",
  "flagged_deadlines": ["short description of each real deadline/urgent item found in email or DRYP, with its source"],
  "meeting_notes": ["one line per meeting worth flagging — heavy days, back-to-back conflicts, unclear-location events to confirm"],
  "dryp_load_summary": "1-2 sentences on her real task load this week — overdue count, due-soon count, anything stuck",
  "pipeline_note": "one line on accounts in proposal/prospect stage, or empty string if none",
  "days_skeleton": {
    "Monday": { "work_location": "home", "notes": "" },
    "Tuesday": { "work_location": "office", "notes": "" },
    "Wednesday": { "work_location": "home", "notes": "" },
    "Thursday": { "work_location": "office", "notes": "" },
    "Friday": { "work_location": "office", "notes": "" },
    "Saturday": { "work_location": "home", "notes": "" },
    "Sunday": { "work_location": "home", "notes": "" }
  }
}`

export async function POST() {
  try {
    const now = new Date()
    const dateKey = mondayOf(now)

    const [events, gmailTokens, drypTasksRaw, drypStats, drypAccounts, clientRoster] = await Promise.all([
      getWeekEvents().catch(() => [] as CalendarEvent[]),
      getAllValidGmailTokens().catch(() => []),
      getOpenTasks(30).catch(() => [] as DryphubTask[]),
      getSummaryStats().catch(() => null),
      getAccounts().catch(() => []),
      getClientRoster().catch(() => []),
    ])

    const classifiedEvents: ClassifiedEvent[] = events.map(ev => ({
      title: ev.title,
      day: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/New_York' }).format(new Date(ev.start)),
      time: ev.startTime,
      locationType: classifyMeetingLocation(
        { location: ev.location, description: ev.description, hangoutLink: ev.hangoutLink, conferenceData: ev.conferenceData, attendeeEmails: ev.attendeeEmails, title: ev.title },
        clientRoster,
      ),
      rawLocation: ev.location ?? '',
    }))

    const drypTasks = drypTasksRaw.map(flagDrypTask)
    const overdue = drypTasks.filter(t => t.isOverdue)
    const dueSoon = drypTasks.filter(t => t.isDueSoon)
    const stuck = drypTasks.filter(t => t.isStuck)
    const pipelineAccounts = drypAccounts.filter(a => ['proposal', 'prospect'].includes(a.client_pipeline_stage ?? ''))

    let emailSummary = ''
    try {
      const allMessages = (await Promise.all(
        gmailTokens.map(t => listGmailMessages(t.access_token, 'newer_than:7d in:inbox', 15, 'metadata').catch(() => []))
      )).flat()
      emailSummary = allMessages
        .slice(0, 40)
        .map(m => `• ${m.subject} — from ${m.from}${m.snippet ? `: ${m.snippet.slice(0, 100)}` : ''}`)
        .join('\n')
    } catch { /* Gmail unavailable — proceed without it */ }

    const userPrompt = `THIS WEEK'S CALENDAR EVENTS:
${classifiedEvents.length ? classifiedEvents.map(e => `• ${e.day} ${e.time} — ${e.title} [${e.locationType}]${e.rawLocation ? ` (${e.rawLocation})` : ''}`).join('\n') : 'No events found this week.'}

DRYP CRM — OPEN TASKS (${drypTasks.length} total, ${overdue.length} overdue, ${dueSoon.length} due soon, ${stuck.length} stuck):
${drypTasks.length ? drypTasks.map(t => `• ${t.title}${t.account_name ? ` (${t.account_name})` : ''}${t.due_date ? ` — due ${t.due_date.slice(0, 10)}` : ''}${t.isOverdue ? ' [OVERDUE]' : ''}${t.isStuck ? ' [STUCK]' : ''}`).join('\n') : 'No open DRYP tasks.'}

DRYP SUMMARY STATS: ${drypStats ? JSON.stringify(drypStats) : 'unavailable'}

ACCOUNTS IN PIPELINE (proposal/prospect stage): ${pipelineAccounts.length ? pipelineAccounts.map(a => a.business_name).join(', ') : 'none'}

RECENT EMAIL (last 7 days, subject lines + snippets — flag anything reading like a real deadline, invoice, proposal, or approval request):
${emailSummary || 'No email data available.'}

Build the week's synthesis now.`

    const raw = await callAI(SYSTEM, userPrompt, 3000)
    const parsed = parseAIJson<Record<string, unknown>>(raw)

    const payload = {
      ...parsed,
      week_of: dateKey,
      events: classifiedEvents,
      dryp_tasks: drypTasks,
      pipeline_accounts: pipelineAccounts.map(a => ({ name: a.business_name, stage: a.client_pipeline_stage })),
    }

    try {
      const db = createAdminClient()
      await db.from('daily_generation_cache').upsert({
        user_id: ZOE_USER_ID,
        date_key: dateKey,
        timezone: 'America/New_York',
        generation_type: 'weekly_reset_gather',
        payload,
        source: 'ai',
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id,date_key,generation_type' })
    } catch (saveError) {
      console.error('[luna/weekly-reset] failed to persist gather payload:', saveError instanceof Error ? saveError.message : saveError)
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[luna/weekly-reset] POST error:', message)
    return NextResponse.json({ error: 'Could not gather your week.', detail: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const dateKey = mondayOf(new Date())
    const db = createAdminClient()
    const [{ data: gather }, { data: final }] = await Promise.all([
      db.from('daily_generation_cache').select('payload').eq('user_id', ZOE_USER_ID).eq('date_key', dateKey).eq('generation_type', 'weekly_reset_gather').maybeSingle(),
      db.from('daily_generation_cache').select('payload').eq('user_id', ZOE_USER_ID).eq('date_key', dateKey).eq('generation_type', 'weekly_reset_final').maybeSingle(),
    ])
    return NextResponse.json({ gather: gather?.payload ?? null, final: final?.payload ?? null })
  } catch (error) {
    console.error('[luna/weekly-reset] GET error:', error)
    return NextResponse.json({ gather: null, final: null })
  }
}
