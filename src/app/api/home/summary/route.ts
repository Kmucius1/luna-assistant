import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTodayEvents } from '@/lib/calendar'
import { getGmailTokens, getGmailInboxCounts } from '@/lib/gmail'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  const db = adminDb()

  // Fetch all data in parallel
  const [calendarResult, emailResult, tasksResult, gmailStatusResult] = await Promise.allSettled([
    // Today's calendar events
    getTodayEvents(),

    // Recent email counts (no per-message fetches — just resultSizeEstimate)
    (async () => {
      const tokens = await getGmailTokens()
      if (!tokens) return null
      return getGmailInboxCounts(tokens.access_token)
    })(),

    // Top open tasks
    db.from('tasks')
      .select('id, title, priority_score, urgency_level, status, project, category, estimated_minutes')
      .not('status', 'in', '("done","cancelled")')
      .order('priority_score', { ascending: false })
      .limit(5),

    // Gmail connection status
    db.from('gmail_tokens').select('email, connected_at').order('connected_at', { ascending: true }),
  ])

  // Calendar
  const calendarEvents = calendarResult.status === 'fulfilled' ? calendarResult.value : []
  const todayEvents    = calendarEvents.filter(e => e.isToday)

  // Email
  const emailCounts = emailResult.status === 'fulfilled' ? emailResult.value : null
  const unreadCount  = emailCounts?.unreadCount ?? null
  const starredCount = emailCounts?.starredCount ?? null
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
      connected:    calendarEvents.length > 0 || calendarResult.status === 'fulfilled',
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
  })
}
