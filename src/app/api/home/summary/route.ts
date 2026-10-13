import { OWNER_USER_ID } from '@/lib/owner'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar'
import { getGmailTokens, getGmailInboxCounts } from '@/lib/gmail'
import { getOrCreateDailyContent } from '@/lib/luna/dailyCache'
import { isMickEvent } from '@/lib/calendarPeople'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ZOE_USER_ID = OWNER_USER_ID

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

interface ExternalSummary {
  events: CalendarEvent[]
  unreadCount: number | null
  starredCount: number | null
}

// Calendar + Gmail both hit external APIs across every connected account —
// this is the slow part on a cold serverless instance (no in-memory cache
// yet warmed up). A minute-bucketed Supabase cache gives a durable,
// cross-instance-safe result so a cold instance still gets a fast read
// instead of repeating the whole external fan-out.
async function getExternalSummary(): Promise<ExternalSummary> {
  const minuteBucket = String(Math.floor(Date.now() / 60_000))
  const { payload } = await getOrCreateDailyContent<ExternalSummary>({
    userId: ZOE_USER_ID,
    generationType: 'home_summary_external',
    dateKey: minuteBucket,
    generate: async () => {
      const [calendarResult, emailResult] = await Promise.allSettled([
        getTodayEvents(),
        (async () => {
          const tokens = await getGmailTokens()
          if (!tokens) return null
          return getGmailInboxCounts(tokens.access_token)
        })(),
      ])
      // Home is Zoe's own day at a glance — Mick's calendar (a secondary
      // calendar attached under the same connected account) never belongs
      // here, only on the full Calendar page where it can be toggled on.
      const events = calendarResult.status === 'fulfilled'
        ? calendarResult.value.filter(e => e.isToday && !isMickEvent(e))
        : []
      const counts = emailResult.status === 'fulfilled' ? emailResult.value : null
      return {
        payload: { events, unreadCount: counts?.unreadCount ?? null, starredCount: counts?.starredCount ?? null },
        source: 'ai' as const,
      }
    },
  })
  return payload
}

export async function GET() {
  const db = adminDb()

  const [externalResult, tasksResult, gmailStatusResult] = await Promise.allSettled([
    getExternalSummary(),

    // Top open tasks
    db.from('tasks')
      .select('id, title, priority_score, urgency_level, status, project, category, estimated_minutes')
      .not('status', 'in', '("done","cancelled")')
      .order('priority_score', { ascending: false })
      .limit(5),

    // Gmail connection status
    db.from('gmail_tokens').select('email, connected_at').order('connected_at', { ascending: true }),
  ])

  // Calendar + email
  const external    = externalResult.status === 'fulfilled' ? externalResult.value : null
  const todayEvents  = external?.events ?? []
  const unreadCount  = external?.unreadCount ?? null
  const starredCount = external?.starredCount ?? null
  // Unread inbox mail is a reasonable proxy for "needs a reply"
  const needsReply   = unreadCount

  // Tasks
  const tasks = tasksResult.status === 'fulfilled' ? (tasksResult.value.data ?? []) : []

  // Gmail accounts
  const gmailAccounts = gmailStatusResult.status === 'fulfilled'
    ? (gmailStatusResult.value.data ?? []).map((r: { email: string }) => r.email)
    : []

  return NextResponse.json({
    calendar: {
      today:        todayEvents,
      todayCount:   todayEvents.length,
      connected:    todayEvents.length > 0 || externalResult.status === 'fulfilled',
    },
    email: {
      connected:    gmailAccounts.length > 0,
      accounts:     gmailAccounts,
      unread:       unreadCount,
      starred:      starredCount,
      needsReply,
    },
    tasks: {
      top:        tasks,
      totalOpen:  tasks.length,
    },
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } })
}
