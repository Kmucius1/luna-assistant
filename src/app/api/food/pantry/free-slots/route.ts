import { NextResponse } from 'next/server'
import { getWeekEvents } from '@/lib/calendar'
import { findFreeSlots } from '@/lib/luna/calendarGaps'

// No per-user auth here — matches /api/calendar/upcoming: calendar tokens
// are stored globally (single-tenant app), not scoped per Supabase user.
export async function GET() {
  try {
    const events = await getWeekEvents()
    const groceryTimeSlots = findFreeSlots(events, {
      minDurationMinutes: 60, windowStartHour: 6, windowEndHour: 21, excludeWorkHours: true, daysAhead: 7, maxResults: 6,
    })
    const prepTimeSlots = findFreeSlots(events, {
      minDurationMinutes: 45, windowStartHour: 17, windowEndHour: 21, excludeWorkHours: true, daysAhead: 7, maxResults: 6,
    })
    return NextResponse.json({ groceryTimeSlots, prepTimeSlots })
  } catch (error) {
    console.error('[food/pantry/free-slots]', error)
    return NextResponse.json({ groceryTimeSlots: [], prepTimeSlots: [] })
  }
}
