import { NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWeekEvents, type CalendarEvent } from '@/lib/calendar'
import { getAllValidGmailTokens, listGmailMessages, type GmailMessage } from '@/lib/gmail'
import { getOpenTasks, getSummaryStats, getAccounts, getClientRoster, type DryphubTask, type ClientRosterEntry } from '@/lib/dryp-crm'
import { classifyMeetingLocation, type MeetingLocationType } from '@/lib/luna/meetingLocation'
import { ZOE_LIFESTYLE_PROFILE, ZOE_WORK_LOCATION_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { planningWeekMondayKey } from '@/lib/luna/planningCycle'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const ZOE_TIMEZONE = 'America/New_York'
const STUCK_THRESHOLD_DAYS = 14

function mondayOf(date: Date): string {
  return planningWeekMondayKey(date, ZOE_TIMEZONE)
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
  const updated = new Date(t.updated_at)
  const daysSinceUpdate = (now.getTime() - updated.getTime()) / 86_400_000

  // due_date is a calendar date, not an instant — comparing it against a
  // raw UTC "now" made a task due "today" in her real ET timezone look
  // overdue from ~8pm ET the evening before. Compare calendar-date keys
  // instead (YYYY-MM-DD sorts correctly as a string).
  const todayKey = localDateKey(now, ZOE_TIMEZONE)
  const dueKey = t.due_date ? t.due_date.slice(0, 10) : null
  const sevenDaysOutKey = localDateKey(new Date(now.getTime() + 7 * 86_400_000), ZOE_TIMEZONE)

  return {
    ...t,
    isOverdue: !!dueKey && dueKey < todayKey,
    isDueSoon: !!dueKey && dueKey >= todayKey && dueKey <= sevenDaysOutKey,
    isStuck: daysSinceUpdate > STUCK_THRESHOLD_DAYS && !['waiting_client'].includes(t.status),
  }
}

const EMAIL_EXTRACTION_SYSTEM = `You extract concrete action items from a batch of real client emails — nothing invented.
For each email that contains a genuinely new deadline, deliverable, change request, approval ask, or proposal need, return one item.
Ignore newsletters, receipts, and anything with no real action attached. If nothing qualifies, return an empty array.
Return ONLY valid JSON: {"items": [{"client": "sender name or company", "action": "short description of what's actually needed", "when": "any date/timeframe mentioned, or empty string"}]}`

// A dedicated, focused extraction pass over emails already matched to a
// real DRYP client contact — not the same call that builds the whole
// week's narrative. Cross-checks each result against her real open DRYP
// tasks so an item already tracked there doesn't get duplicated.
async function extractClientEmailDeadlines(
  messages: GmailMessage[],
  clientRoster: ClientRosterEntry[],
  drypTasks: DrypTaskFlags[],
): Promise<string[]> {
  const rosterEmails = new Set(clientRoster.map(r => r.email.toLowerCase()))
  const clientMessages = messages.filter(m => rosterEmails.has(m.fromEmail?.toLowerCase()))
  if (clientMessages.length === 0) return []

  const prompt = clientMessages.slice(0, 20)
    .map(m => `From: ${m.from}\nSubject: ${m.subject}\n${m.snippet}`)
    .join('\n---\n')

  try {
    const raw = await callAI(EMAIL_EXTRACTION_SYSTEM, prompt, 800)
    const parsed = parseAIJson<{ items?: { client: string; action: string; when: string }[] }>(raw)
    const existingTaskText = drypTasks.map(t => `${t.title} ${t.account_name ?? ''}`.toLowerCase()).join(' | ')

    return (parsed.items ?? [])
      .filter(item => item.client && item.action)
      .map(item => {
        const alreadyTracked = existingTaskText.includes(item.action.toLowerCase().slice(0, 15))
        const tag = alreadyTracked ? '' : ' [NEW — not yet in DRYP]'
        return `${item.client} — ${item.action}${item.when ? ` (${item.when})` : ''}${tag}`
      })
  } catch {
    return []
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
      // All-day events are a bare 'YYYY-MM-DD' with no offset — parsing
      // that directly as a UTC instant lands on the evening before in
      // America/New_York, shifting the reported weekday back by one day.
      // Anchor to UTC noon instead, which is unambiguously still the
      // correct calendar day in any continental US timezone.
      day: new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'America/New_York' }).format(
        ev.allDay ? new Date(`${ev.start}T12:00:00Z`) : new Date(ev.start)
      ),
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
    let clientEmailDeadlines: string[] = []
    try {
      const allMessages = (await Promise.all(
        gmailTokens.map(t => listGmailMessages(t.access_token, 'newer_than:7d in:inbox', 15, 'metadata').catch(() => []))
      )).flat()
      emailSummary = allMessages
        .slice(0, 40)
        .map(m => `• ${m.subject} — from ${m.from}${m.snippet ? `: ${m.snippet.slice(0, 100)}` : ''}`)
        .join('\n')

      // A dedicated, verified extraction pass over real client emails —
      // not left to the main synthesis prompt's implicit judgment. Anything
      // extracted here that doesn't already match an open DRYP task is
      // deterministically tagged and guaranteed into flagged_deadlines,
      // rather than being one option among many the big prompt might skip.
      clientEmailDeadlines = await extractClientEmailDeadlines(allMessages, clientRoster, drypTasks)
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

    // Deterministic merge, not optional — a verified client-email deadline
    // is guaranteed to appear here even if the main synthesis pass didn't
    // independently surface it.
    const aiFlagged = Array.isArray(parsed.flagged_deadlines) ? parsed.flagged_deadlines as string[] : []
    const mergedDeadlines = [...clientEmailDeadlines, ...aiFlagged.filter(d => !clientEmailDeadlines.some(c => d.includes(c.split(' — ')[0])))]

    const payload = {
      ...parsed,
      flagged_deadlines: mergedDeadlines,
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
