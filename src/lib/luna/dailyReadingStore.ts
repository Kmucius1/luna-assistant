// Persistence layer for the `daily_readings` and `reading_generation_runs`
// tables. Modeled on dailyCache.ts's defensive philosophy — every Supabase
// call is wrapped so a missing/unmigrated table or a transient error never
// throws up to the caller; the caller just gets `null` / a no-op and falls
// through to generating fresh, unpersisted content.
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReadingJSON } from './readingGenerator'

export interface StoredReading {
  reading_date: string
  timezone: string
  sun_sign: string | null
  moon_sign: string | null
  moon_phase: string | null
  numerology_personal_day: number | null
  chinese_day_energy: string | null
  major_transits_json: unknown[]
  natal_transits_json: unknown[]
  reading_json: ReadingJSON
  luna_message: string | null
  generated_at: string
  expires_at: string | null
  source_log_json: unknown[]
  status: 'pending' | 'ready' | 'stale' | 'error'
}

export async function getReading(
  userId: string,
  readingDate: string,
  timezone: string,
): Promise<StoredReading | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('daily_readings')
      .select('*')
      .eq('user_id', userId)
      .eq('reading_date', readingDate)
      .eq('timezone', timezone)
      .maybeSingle()
    return (data as StoredReading | null) ?? null
  } catch {
    return null
  }
}

export async function getReadingWindow(
  userId: string,
  dateKeys: string[],
  timezone: string,
): Promise<Map<string, StoredReading>> {
  const result = new Map<string, StoredReading>()
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('daily_readings')
      .select('*')
      .eq('user_id', userId)
      .eq('timezone', timezone)
      .in('reading_date', dateKeys)
    for (const row of (data ?? []) as StoredReading[]) {
      result.set(row.reading_date, row)
    }
  } catch {
    // Table not migrated yet, or a transient error — caller treats every
    // date as missing and generates fresh.
  }
  return result
}

/** Every reading through and including `throughDateKey`, newest first — the
    full saved/past archive, not the forward-looking window used by the
    daily-readings route. */
export async function getReadingHistory(
  userId: string,
  timezone: string,
  throughDateKey: string,
): Promise<StoredReading[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('daily_readings')
      .select('*')
      .eq('user_id', userId)
      .eq('timezone', timezone)
      .lte('reading_date', throughDateKey)
      .order('reading_date', { ascending: false })
    return (data as StoredReading[] | null) ?? []
  } catch {
    return []
  }
}

export async function upsertReading(userId: string, row: StoredReading): Promise<void> {
  try {
    const db = createAdminClient()
    const { error } = await db.from('daily_readings').upsert(
      {
        user_id: userId,
        reading_date: row.reading_date,
        timezone: row.timezone,
        sun_sign: row.sun_sign,
        moon_sign: row.moon_sign,
        moon_phase: row.moon_phase,
        numerology_personal_day: row.numerology_personal_day,
        chinese_day_energy: row.chinese_day_energy,
        major_transits_json: row.major_transits_json,
        natal_transits_json: row.natal_transits_json,
        reading_json: row.reading_json,
        luna_message: row.luna_message,
        generated_at: row.generated_at,
        expires_at: row.expires_at,
        source_log_json: row.source_log_json,
        status: row.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,reading_date,timezone' },
    )
    // supabase-js returns the error instead of throwing — without this a failed
    // save was invisible and the hourly job kept regenerating the same reading.
    if (error) console.error(`[dailyReadingStore] failed to save reading ${row.reading_date}:`, error.message)
  } catch (e) {
    console.error(`[dailyReadingStore] failed to save reading ${row.reading_date}:`, e instanceof Error ? e.message : e)
    // Best-effort — the reading still returns to the caller even if the write fails.
  }
}

export async function startRun(
  runType: 'cron' | 'manual' | 'backfill',
  timezone: string,
): Promise<string | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('reading_generation_runs')
      .insert({ run_type: runType, timezone, status: 'running' })
      .select('id')
      .single()
    return (data as { id: string } | null)?.id ?? null
  } catch {
    return null
  }
}

export async function finishRun(
  runId: string | null,
  result: {
    usersProcessed: number
    readingsCreated: number
    readingsUpdated: number
    errors: string[]
    status: 'success' | 'partial' | 'error'
  },
): Promise<void> {
  if (!runId) return
  try {
    const db = createAdminClient()
    await db
      .from('reading_generation_runs')
      .update({
        finished_at: new Date().toISOString(),
        users_processed: result.usersProcessed,
        readings_created: result.readingsCreated,
        readings_updated: result.readingsUpdated,
        errors_json: result.errors,
        status: result.status,
      })
      .eq('id', runId)
  } catch {
    // Audit log write failure shouldn't fail the actual generation run.
  }
}
