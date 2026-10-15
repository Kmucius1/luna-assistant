// Birth times are local clock times in the place someone was born. The planets
// are computed from a UTC instant, so the local time has to be converted using
// that place's time zone (including daylight saving as it was on that date).
// Treating a local time as UTC shifts the Moon by several degrees.

function offsetMinutes(at: Date, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const parts: Record<string, number> = {}
  for (const p of f.formatToParts(at)) if (p.type !== 'literal') parts[p.type] = Number(p.value)
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second)
  return Math.round((asUTC - at.getTime()) / 60000)
}

/** 'YYYY-MM-DD' + 'HH:MM' (local, in tz) -> the real UTC instant. Unknown time uses local noon. */
export function localBirthToUTC(date: string, time: string | undefined, tz: string = 'America/New_York'): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time && /^\d{1,2}:\d{2}$/.test(time) ? time : '12:00').split(':').map(Number)
  const naive = Date.UTC(y, m - 1, d, hh, mm)
  let utc = naive - offsetMinutes(new Date(naive), tz) * 60000
  // Re-check the offset at the resulting instant to settle daylight-saving boundaries.
  utc = naive - offsetMinutes(new Date(utc), tz) * 60000
  return new Date(utc)
}

export const BIRTH_ZONES: { id: string; label: string }[] = [
  { id: 'America/New_York', label: 'Eastern (NY, FL, PA)' },
  { id: 'America/Chicago', label: 'Central (TX, IL)' },
  { id: 'America/Denver', label: 'Mountain (CO, UT)' },
  { id: 'America/Phoenix', label: 'Arizona' },
  { id: 'America/Los_Angeles', label: 'Pacific (CA, WA)' },
  { id: 'America/Anchorage', label: 'Alaska' },
  { id: 'Pacific/Honolulu', label: 'Hawaii' },
  { id: 'Europe/London', label: 'UK / Ireland' },
  { id: 'Europe/Paris', label: 'Central Europe' },
  { id: 'Europe/Athens', label: 'Greece / Eastern Europe' },
  { id: 'UTC', label: 'UTC' },
]
