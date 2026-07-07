import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDailyReading } from '@/lib/luna/readingGenerator'
import { getReadingWindow, upsertReading, type StoredReading } from '@/lib/luna/dailyReadingStore'
import { getSixDayWindow, dateFromKey } from '@/lib/luna/dateWindow'

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
  for (const dateKey of dateKeys) {
    const cached = existing.get(dateKey)
    // A reading that only made it to the real-data fallback (e.g. the AI call
    // failed at generation time) isn't actually done — retry it automatically
    // on the next load instead of leaving template text stuck until someone
    // clicks Regenerate or the hourly cron happens to catch it.
    const lastSource = cached?.source_log_json?.[cached.source_log_json.length - 1] as { source?: string } | undefined
    const isUpgradeable = cached?.status === 'ready' && lastSource?.source === 'fallback'
    const needsGeneration = !cached || (refresh && dateKey === dateKeys[0]) || isUpgradeable

    if (!needsGeneration && cached) {
      readings.push(cached)
      continue
    }

    const generated = await generateDailyReading(dateFromKey(dateKey), timezone)
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
      source_log_json: [{ source: generated.source, generated_at: now.toISOString() }],
      status: 'ready',
    }

    await upsertReading(userId, row)
    readings.push(row)
  }

  return NextResponse.json({
    readings,
    updatedAt: readings[0]?.generated_at ?? new Date().toISOString(),
  })
}
