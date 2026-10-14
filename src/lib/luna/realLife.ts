// A short, factual snapshot of Zoe's real day (calendar, open tasks, her 30-day
// plan) that the astrology readings may cite. It exists so the advice can point
// at things that are actually on her plate instead of speaking in generalities.
// Every line is real data; if a source is unavailable it is simply left out.

import { createAdminClient } from '@/lib/supabase/admin'
import { getUpcomingEvents } from '@/lib/calendar'
import { isMickEvent } from '@/lib/calendarPeople'
import { localDateKey } from '@/lib/luna/dailyCache'
import { dayNumber, themeFor } from '@/lib/luna/thirtyDay'

const TZ = 'America/New_York'

export async function realLifeBlock(userId: string, dateKey: string): Promise<string> {
  const lines: string[] = []

  try {
    const events = await getUpcomingEvents(9)
    const todays = events
      .filter(e => !isMickEvent(e) && e.status !== 'cancelled' && localDateKey(new Date(e.start), TZ) === dateKey)
      .slice(0, 8)
    if (todays.length) {
      lines.push('Calendar that day:')
      for (const e of todays) lines.push(`- ${e.allDay ? 'All day' : e.startTime}: ${e.title}${e.location ? ` (${e.location})` : ''}`)
    }
  } catch { /* calendar not connected or unavailable */ }

  try {
    const db = createAdminClient()
    const { data: tasks } = await db.from('tasks')
      .select('title, project, urgency_level')
      .not('status', 'in', '("done","cancelled")')
      .order('priority_score', { ascending: false })
      .limit(6)
    if (tasks && tasks.length) {
      lines.push('Top open tasks:')
      for (const t of tasks as { title: string; project?: string | null; urgency_level?: string | null }[]) {
        lines.push(`- ${t.title}${t.project ? ` [${t.project}]` : ''}${t.urgency_level ? ` (${t.urgency_level})` : ''}`)
      }
    }

    const n = dayNumber(dateKey)
    if (n >= 1 && n <= 30) {
      const { data: day } = await db.from('luna_30d_days').select('energy, gym_today, top3').eq('user_id', userId).eq('date_key', dateKey).maybeSingle()
      const theme = themeFor(dateKey)
      lines.push(`Her 30-day plan: day ${n} of 30, evening theme "${theme.name}" (${theme.block}).`)
      if (day) {
        const top3 = ((day.top3 ?? []) as { text: string }[]).map(t => t.text).filter(Boolean)
        if (top3.length) lines.push(`Her own top 3 for the day: ${top3.join('; ')}.`)
        if (day.gym_today === true) lines.push('She planned a gym session that morning.')
        if (day.energy) lines.push(`She rated her energy: ${day.energy}.`)
      }
    }
  } catch { /* tables not available */ }

  return lines.join('\n')
}
