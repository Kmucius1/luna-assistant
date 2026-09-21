import { getMoonSign } from '@/lib/astrology'
import { localDateKey, localDayBoundsUTC } from './dailyCache'

/**
 * If the Moon changes sign during the local day containing `date`, a line stating
 * both signs and the exact time — otherwise ''. One Moon sign for the whole day
 * is wrong for part of it, so every daily astrology prompt includes this.
 */
export function moonSignChangeNote(date: Date, timezone: string): string {
  const { start, end } = localDayBoundsUTC(localDateKey(date, timezone), timezone)
  const startMoon = getMoonSign(start)
  if (!startMoon.nextSignDate || startMoon.nextSignDate >= end) return ''
  const newSign = getMoonSign(new Date(startMoon.nextSignDate.getTime() + 60_000)).sign
  const at = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(startMoon.nextSignDate)
  return `\nMoon sign change today: ${startMoon.sign} until ${at}, then ${newSign}. State both signs and the time.`
}
