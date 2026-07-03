import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_TIMEZONE = 'America/New_York'

/** 'YYYY-MM-DD' in the given IANA timezone, using native Intl (no date-fns-tz dependency). */
export function localDateKey(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

export interface DailyContentResult<T> {
  payload: T
  source: string
  cached: boolean
}

/**
 * Real, Supabase-backed daily content cache. Stable within a local day,
 * regenerates after local midnight in the given timezone. Replaces the
 * in-memory Map pattern previously used by /api/astrology/daily-guidance.
 *
 * Requires supabase/daily_generation_cache.sql to have been run — until
 * then, reads/writes to the table will error and this falls straight
 * through to `generate()` on every call (no crash, just no persistence).
 */
export async function getOrCreateDailyContent<T>(params: {
  userId: string
  generationType: string
  timezone?: string
  dateKey?: string
  /** Skip the cache read (still writes the fresh result) — for an explicit user-triggered "Regenerate" */
  forceRegenerate?: boolean
  generate: () => Promise<{ payload: T; source: 'ai' | 'fallback' }>
}): Promise<DailyContentResult<T>> {
  const { userId, generationType } = params
  const timezone = params.timezone ?? DEFAULT_TIMEZONE
  const dateKey = params.dateKey ?? localDateKey(new Date(), timezone)
  const db = createAdminClient()

  if (!params.forceRegenerate) {
    try {
      const { data: existing } = await db
        .from('daily_generation_cache')
        .select('payload, source')
        .eq('user_id', userId)
        .eq('date_key', dateKey)
        .eq('generation_type', generationType)
        .maybeSingle()

      if (existing) {
        return { payload: existing.payload as T, source: existing.source as string, cached: true }
      }
    } catch {
      // Table likely doesn't exist yet (migration not run) — fall through to generate-only mode.
    }
  }

  const { payload, source } = await params.generate()

  try {
    await db.from('daily_generation_cache').upsert({
      user_id: userId,
      date_key: dateKey,
      timezone,
      generation_type: generationType,
      payload,
      source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date_key,generation_type' })
  } catch {
    // Persist best-effort — content still returns to the caller even if the write fails.
  }

  return { payload, source, cached: false }
}
