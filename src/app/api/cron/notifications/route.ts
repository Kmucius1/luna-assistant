import { isCronAuthorized } from '@/lib/cronAuth'
import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { localDateKey, localHour } from '@/lib/luna/dailyCache'
import { sendPushToUser, alreadySentToday, markSentToday } from '@/lib/luna/pushNotifications'
import { mondayKeyOf, todayKey } from '@/lib/luna/today'
import { NUDGE_HOURS, nudgeFor, type NudgeContext } from '@/lib/luna/thirtyNudges'

const ZOE_USER_ID = OWNER_USER_ID
const ZOE_TIMEZONE = 'America/New_York'

interface Slot {
  key: string
  hour: number
  build: (db: ReturnType<typeof createAdminClient>, weekday: string) => Promise<{ title: string; body: string; url: string } | null>
}

const SLOTS: Slot[] = [
  {
    key: 'morning_briefing',
    hour: 7,
    build: async () => ({
      title: 'Good morning, Zoe',
      body: "Let's make today count. Tap to see your full day.",
      url: '/today',
    }),
  },
  {
    key: 'astrology_ready',
    hour: 8,
    build: async (db) => {
      const dateKey = localDateKey(new Date(), ZOE_TIMEZONE)
      const { data } = await db.from('daily_generation_cache')
        .select('payload').eq('user_id', ZOE_USER_ID).eq('date_key', dateKey).eq('generation_type', 'daily_guidance').maybeSingle()
      const horoscope = (data?.payload as { horoscope?: string } | undefined)?.horoscope
      if (!horoscope) return null
      return {
        title: 'Your daily reading is ready',
        body: horoscope.length > 130 ? `${horoscope.slice(0, 127)}…` : horoscope,
        url: '/astrology',
      }
    },
  },
  {
    key: 'work_start',
    hour: 10,
    build: async (db) => {
      const { data: tasks } = await db.from('tasks').select('title')
        .eq('user_id', ZOE_USER_ID).not('status', 'in', '("done","cancelled")')
        .order('priority_score', { ascending: false }).limit(1)
      const count = await db.from('tasks').select('id', { count: 'exact', head: true })
        .eq('user_id', ZOE_USER_ID).not('status', 'in', '("done","cancelled")')
      const top = tasks?.[0]?.title
      const total = count.count ?? 0
      if (total === 0) return { title: 'Work block starting', body: "Your list is clear — pick one thing and go.", url: '/work' }
      return {
        title: 'Work block starting',
        body: top ? `Top priority: ${top}${total > 1 ? ` (+${total - 1} more)` : ''}` : `${total} open task${total === 1 ? '' : 's'} today.`,
        url: '/work/tasks',
      }
    },
  },
  {
    key: 'evening_wind_down',
    hour: 18,
    build: async (db, weekday) => {
      const monday = mondayKeyOf()
      const { data: plan } = await db.from('food_weekly_plans')
        .select('plan_json').eq('user_id', ZOE_USER_ID).eq('week_start', monday).maybeSingle()
      const dinners = (plan?.plan_json as { dinners?: { day: string; meal: string }[] } | undefined)?.dinners
      const dinner = dinners?.find(d => d.day === weekday)?.meal
      return {
        title: 'Winding down',
        body: dinner ? `Dinner tonight: ${dinner}. Give yourself some grace, baby girl.` : 'Time to reset — dinner, and let the day go.',
        url: '/today',
      }
    },
  },
]

// 30-day program nudges: work check-ins, focus-on-me reminders, affirmations and
// astrology lines, from the same schedule the in-app pop-up uses. They only
// exist while the program is active; the older slots above are untouched.
const THIRTY_SLOTS: Slot[] = NUDGE_HOURS.map(hour => ({
  key: `thirty_h${hour}`,
  hour,
  build: async (db) => {
    const dateKey = todayKey()
    const { data } = await db.from('daily_generation_cache')
      .select('payload').eq('user_id', ZOE_USER_ID).eq('date_key', dateKey).eq('generation_type', 'daily_guidance').maybeSingle()
    const n = nudgeFor(hour, { dateKey, guidance: (data?.payload as NudgeContext['guidance']) ?? null })
    return n ? { title: n.title, body: n.body, url: n.url } : null
  },
}))

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date()
  const hour = localHour(now, ZOE_TIMEZONE)
  const dateKey = localDateKey(now, ZOE_TIMEZONE)
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: ZOE_TIMEZONE, weekday: 'long' }).format(now)

  const results: Record<string, string> = {}

  for (const slot of [...SLOTS, ...THIRTY_SLOTS]) {
    if (slot.hour !== hour) continue
    if (await alreadySentToday(ZOE_USER_ID, slot.key, dateKey)) { results[slot.key] = 'already sent'; continue }

    const notification = await slot.build(db, weekday)
    if (!notification) { results[slot.key] = 'no content, skipped'; continue }

    const { sent, pruned } = await sendPushToUser(ZOE_USER_ID, { ...notification, tag: slot.key })
    await markSentToday(ZOE_USER_ID, slot.key, dateKey)
    results[slot.key] = `sent to ${sent} device(s), pruned ${pruned}`
  }

  return NextResponse.json({ ok: true, hour, results })
}

export { handle as GET, handle as POST }
