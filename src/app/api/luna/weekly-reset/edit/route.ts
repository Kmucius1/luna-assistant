import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const EDITABLE_FIELDS = ['work_location', 'gym_focus', 'outfit_type'] as const
const EDITABLE_MEAL_FIELDS = ['breakfast', 'lunch', 'dinner'] as const

function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// A real patch, not a regenerate — updates exactly the one field on the one
// day she changed, in the stored payload, and touches nothing else. Fixes
// the "any change means rerunning the entire wizard" gap directly.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { day, field, mealField, value } = body as { day?: string; field?: string; mealField?: string; value?: string }

    if (!day || !WEEKDAYS.includes(day)) return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    if (field && !EDITABLE_FIELDS.includes(field as typeof EDITABLE_FIELDS[number])) {
      return NextResponse.json({ error: 'That field cannot be edited' }, { status: 400 })
    }
    if (mealField && !EDITABLE_MEAL_FIELDS.includes(mealField as typeof EDITABLE_MEAL_FIELDS[number])) {
      return NextResponse.json({ error: 'Invalid meal field' }, { status: 400 })
    }
    if (!field && !mealField) return NextResponse.json({ error: 'field or mealField is required' }, { status: 400 })

    const db = createAdminClient()
    const dateKey = mondayOf(new Date())

    const { data: row, error: fetchError } = await db
      .from('daily_generation_cache')
      .select('payload')
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', 'weekly_reset_final')
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!row?.payload) return NextResponse.json({ error: 'No generated week found to edit' }, { status: 404 })

    const payload = row.payload as { days?: Record<string, Record<string, unknown>> }
    if (!payload.days?.[day]) return NextResponse.json({ error: `No plan found for ${day}` }, { status: 404 })

    if (mealField) {
      const meals = (payload.days[day].meals as Record<string, unknown>) ?? {}
      meals[mealField] = value
      payload.days[day].meals = meals
    } else if (field) {
      payload.days[day][field] = value
    }

    const { error: updateError } = await db
      .from('daily_generation_cache')
      .update({ payload, updated_at: new Date().toISOString() })
      .eq('user_id', ZOE_USER_ID)
      .eq('date_key', dateKey)
      .eq('generation_type', 'weekly_reset_final')
    if (updateError) throw updateError

    return NextResponse.json({ ok: true, payload })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[luna/weekly-reset/edit] PATCH error:', message)
    return NextResponse.json({ error: 'Could not save that edit', detail: message }, { status: 500 })
  }
}
