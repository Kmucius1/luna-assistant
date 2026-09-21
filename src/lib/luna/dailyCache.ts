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

/**
 * Hour (0-23) in the given IANA timezone. Vercel's serverless runtime has no
 * TZ set, so plain `new Date().getHours()` returns UTC hour on the server —
 * several hours off from the user's actual local time. Always use this for
 * any server-side "what time of day is it for her" logic.
 */
export function localHour(date: Date, timezone: string = DEFAULT_TIMEZONE): number {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date).find(p => p.type === 'hour')?.value
  return hourPart ? parseInt(hourPart, 10) : date.getHours()
}

function wallTimeToUTC(y: number, m: number, d: number, timezone: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(guess)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  const asIfLocalWereUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  const offset = asIfLocalWereUTC - guess.getTime()
  return new Date(guess.getTime() - offset)
}

/**
 * UTC instant range [start, end) covering one local calendar day for the
 * given IANA timezone — for filtering plain `created_at timestamptz`
 * columns (tables with no date-keyed session_id of their own) down to
 * "everything from this local day."
 */
export function localDayBoundsUTC(dateKey: string, timezone: string = DEFAULT_TIMEZONE): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split('-').map(Number)
  return {
    start: wallTimeToUTC(y, m, d, timezone),
    end: wallTimeToUTC(y, m, d + 1, timezone), // JS Date normalizes day overflow correctly
  }
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
    const { error } = await db.from('daily_generation_cache').upsert({
      user_id: userId,
      date_key: dateKey,
      timezone,
      generation_type: generationType,
      payload,
      source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date_key,generation_type' })
    // Returned, not thrown — without this a failed write was invisible and the
    // content silently regenerated on every request.
    if (error) console.error(`[dailyCache] failed to persist ${generationType} for ${dateKey}:`, error.message)
  } catch (e) {
    console.error(`[dailyCache] failed to persist ${generationType} for ${dateKey}:`, e instanceof Error ? e.message : e)
    // Best-effort — content still returns to the caller even if the write fails.
  }

  return { payload, source, cached: false }
}
