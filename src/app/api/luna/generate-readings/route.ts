import { isCronAuthorized } from '@/lib/cronAuth'
import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { generateDailyReading, READING_VERSION, recentTextsFromReading, type RecentTexts } from '@/lib/luna/readingGenerator'
import { getReadingWindow, getReadingHistory, upsertReading, startRun, finishRun, type StoredReading } from '@/lib/luna/dailyReadingStore'
import { getSixDayWindow, dateFromKey, localNoonFromKey } from '@/lib/luna/dateWindow'

const ZOE_USER_ID = OWNER_USER_ID
const ZOE_TIMEZONE = 'America/New_York'

// Vercel Cron always invokes via GET — both GET and POST share this handler
// so the route also works if triggered manually with a body later.
async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timezone = ZOE_TIMEZONE
  const runId = await startRun('cron', timezone)
  const errors: string[] = []
  let created = 0
  let updated = 0

  try {
    const dateKeys = getSixDayWindow(timezone)
    const existing = await getReadingWindow(ZOE_USER_ID, dateKeys, timezone)
    // The last week of readings, so each new one can be told not to repeat them.
    const past = await getReadingHistory(ZOE_USER_ID, timezone, dateKeys[0])
    const recent: RecentTexts[] = past.filter(r => r.reading_date < dateKeys[0]).slice(0, 8).map(recentTextsFromReading)

    for (const dateKey of dateKeys) {
      const cached = existing.get(dateKey)
      const isMissing = !cached
      // A reading that only made it to the real-data fallback (e.g. AI quota
      // was exhausted at generation time) isn't actually done — retry it so
      // the hourly cron can upgrade it to a real AI reading once the quota
      // frees up, instead of leaving template text stuck for the rest of
      // the day. Never a wasted attempt: generateDailyReading() always
      // falls back to the same real-data template on repeated failure.
      const lastSource = cached?.source_log_json?.[cached.source_log_json.length - 1] as { source?: string } | undefined
      const isUpgradeable = cached?.status === 'ready' && lastSource?.source === 'fallback'
      const isStale = !isMissing && cached?.status !== 'ready'
      // Readings stored before READING_VERSION 2 were built for the wrong instant
      // and carry the previous day's date — redo each one once.
      const isOutdated = !isMissing && (lastSource as { v?: number } | undefined)?.v !== READING_VERSION
      if (!isMissing && !isStale && !isUpgradeable && !isOutdated) continue

      try {
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
          source_log_json: [...(cached?.source_log_json ?? []), { source: generated.source, generated_at: now.toISOString(), v: READING_VERSION }],
          status: 'ready',
        }

        await upsertReading(ZOE_USER_ID, row)
        recent.unshift(recentTextsFromReading({ reading_json: generated.payload, luna_message: generated.payload.luna_message }))
        if (isMissing) created++
        else updated++
      } catch (e) {
        errors.push(`${dateKey}: ${(e as Error).message}`)
      }
    }
  } finally {
    await finishRun(runId, {
      usersProcessed: 1,
      readingsCreated: created,
      readingsUpdated: updated,
      errors,
      status: errors.length === 0 ? 'success' : (created + updated > 0 ? 'partial' : 'error'),
    })
  }

  return NextResponse.json({ ok: true, created, updated, errors })
}

export const GET = handle
export const POST = handle
