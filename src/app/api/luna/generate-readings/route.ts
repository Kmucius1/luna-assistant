import { NextRequest, NextResponse } from 'next/server'
import { generateDailyReading, READING_VERSION } from '@/lib/luna/readingGenerator'
import { getReadingWindow, upsertReading, startRun, finishRun, type StoredReading } from '@/lib/luna/dailyReadingStore'
import { getSixDayWindow, dateFromKey, localNoonFromKey } from '@/lib/luna/dateWindow'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'
const ZOE_TIMEZONE = 'America/New_York'

// Vercel Cron always invokes via GET — both GET and POST share this handler
// so the route also works if triggered manually with a body later.
async function handle(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        const generated = await generateDailyReading(localNoonFromKey(dateKey, timezone), timezone)
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
