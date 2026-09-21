import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyReading, READING_VERSION, recentTextsFromReading, type RecentTexts } from '@/lib/luna/readingGenerator'
import { getReadingWindow, getReadingHistory, upsertReading, type StoredReading } from '@/lib/luna/dailyReadingStore'
import { getSixDayWindow, dateFromKey, localDateKeyFromDate, localNoonFromKey } from '@/lib/luna/dateWindow'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const timezone = searchParams.get('tz') || 'America/New_York'
  const refresh = searchParams.get('refresh') === '1'

  const userId = await resolveUserId()
  const dateKeys = getSixDayWindow(timezone)
  const existing = await getReadingWindow(userId, dateKeys, timezone)

  const readings: StoredReading[] = []
  // Recent readings, so newly generated ones don't reuse their wording.
  const past = await getReadingHistory(userId, timezone, dateKeys[0])
  const recent: RecentTexts[] = past.filter(r => r.reading_date < dateKeys[0]).slice(0, 8).map(recentTextsFromReading)
  for (const dateKey of dateKeys) {
    const cached = existing.get(dateKey)
    // A reading that only made it to the real-data fallback (e.g. the AI call
    // failed at generation time) isn't actually done — retry it automatically
    // on the next load instead of leaving template text stuck until someone
    // clicks Regenerate or the hourly cron happens to catch it.
    const lastSource = cached?.source_log_json?.[cached.source_log_json.length - 1] as { source?: string } | undefined
    const isUpgradeable = cached?.status === 'ready' && lastSource?.source === 'fallback'
    // "Today's" reading is often first created a few days early as part of an
    // earlier window fetch (it was "coming up" then). Once that date actually
    // becomes today, treat it as needing a fresh generation rather than
    // reusing a reading whose generated_at is stuck days in the past — this
    // is what caused "Generated Jul 24" to show while viewing Jul 26.
    const isTodaySlot = dateKey === dateKeys[0]
    const wasPregenerated = isTodaySlot && !!cached && localDateKeyFromDate(new Date(cached.generated_at), timezone) !== dateKey
    const lastLog = cached?.source_log_json?.[cached.source_log_json.length - 1] as { v?: number } | undefined
    const isOutdated = !!cached && lastLog?.v !== READING_VERSION
    const needsGeneration = !cached || (refresh && isTodaySlot) || isUpgradeable || wasPregenerated || isOutdated

    if (!needsGeneration && cached) {
      readings.push(cached)
      continue
    }

    const generated = await generateDailyReading(localNoonFromKey(dateKey, timezone), timezone, recent)
    const now = new Date()
    const expiresAt = new Date(dateFromKey(dateKey))
    expiresAt.setDate(expiresAt.getDate() + 1)

    const row: StoredReading = {
      reading_date: dateKey,
      timezone,
      sun_sign: generated.facts.sunSign,
      moon_sign: generated.facts.moonSign,
      moon_phase: generated.facts.moonPhase,
      numerology_personal_day: generated.facts.personalDay,
      chinese_day_energy: generated.facts.chineseDayEnergy,
      major_transits_json: generated.facts.majorTransits,
      natal_transits_json: generated.facts.natalTransits,
      reading_json: generated.payload,
      luna_message: generated.payload.luna_message,
      generated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      source_log_json: [{ source: generated.source, generated_at: now.toISOString(), v: READING_VERSION }],
      status: 'ready',
    }

    await upsertReading(userId, row)
    recent.unshift(recentTextsFromReading({ reading_json: generated.payload, luna_message: generated.payload.luna_message }))
    readings.push(row)
  }

  return NextResponse.json({
    readings,
    updatedAt: readings[0]?.generated_at ?? new Date().toISOString(),
  })
}
