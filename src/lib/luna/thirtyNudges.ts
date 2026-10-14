// Daily nudge schedule for the 30-day program. One source of truth, used by the
// hourly cron (push notifications) and by the in-app pop-up, so both always say
// the same thing. Astrology lines come from the real cached daily reading when
// it exists; nothing is invented when it doesn't.

import { WORK_CHECKINS, dayNumber, themeFor, weekdayOf } from '@/lib/luna/thirtyDay'

export interface Nudge { key: string; hour: number; title: string; body: string; url: string }

export interface NudgeContext {
  dateKey: string
  guidance?: { horoscope?: string; energy?: string; main_focus?: string; self_reflection?: string; affirmation?: string; highest_self?: string } | null
}

const AFFIRMATIONS = [
  'I am building Zoe. Her life is not up for anyone’s approval.',
  'I can care about people and still stay in my own life.',
  'My day belongs to me. I decide what it holds.',
  'I do not have to chase what is already mine.',
  'I am becoming more myself every single day.',
  'Rest is part of the plan. So is following through.',
  'I do what is next. That is all that is asked of me.',
  'My taste, my style, my pace. All of it is mine.',
  'I do not abandon my plan because someone else changed theirs.',
  'I am allowed to take up space in my own life.',
]

const FOCUS_ME = [
  'Water. Shoulders down. One slow breath. What does Zoe need right now?',
  'Check in with your body before your phone. Eat something real.',
  'Is this thing for you, or for someone’s opinion of you? Do the one that is for you.',
  'Stand up, stretch for one minute, then pick the next small thing.',
  'You are allowed to want things. Name one thing you want today.',
  'Back to your life. What is Zoe doing next?',
  'Put your phone down for ten minutes and do one thing with your hands.',
]

function pick<T>(arr: T[], n: number): T { return arr[((n % arr.length) + arr.length) % arr.length] }

function sentences(text?: string | null): string[] {
  if (!text) return []
  return text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 220)
}
function short(s: string, max = 150): string { return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s }

export const NUDGE_HOURS = [6, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

export function nudgeFor(hour: number, ctx: NudgeContext): Nudge | null {
  const n = dayNumber(ctx.dateKey)
  if (n < 1 || n > 30) return null
  const dow = weekdayOf(ctx.dateKey)
  const weekday = dow >= 1 && dow <= 5
  const g = ctx.guidance ?? null
  const theme = themeFor(ctx.dateKey)
  const aff = pick(AFFIRMATIONS, n + hour)
  const url = '/thirty'
  const mk = (title: string, body: string): Nudge => ({ key: `thirty_h${hour}`, hour, title, body, url })

  const work = WORK_CHECKINS.find(c => c.hour === hour)
  if (work && weekday && hour !== 17) return mk(work.title, work.body)

  switch (hour) {
    case 6:
      return mk('Day ' + n + ' of 30', `Today is for you. ${g?.affirmation ? short(g.affirmation) : aff}`)
    case 9:
      return mk(weekday ? 'Start' : `${theme.name} day`, weekday
        ? 'What are your Top 3? Start Priority #1 before reacting to everybody else.'
        : `Your day is yours. Today’s theme: ${theme.block}.`)
    case 11:
      return mk('Focus on you', pick(FOCUS_ME, n))
    case 12: {
      const line = sentences(g?.energy)[0] ?? sentences(g?.horoscope)[1]
      return mk('The sky today', line ? short(line) : pick(FOCUS_ME, n + 2))
    }
    case 13:
      return mk('Lunch reset', 'Eat. Hydrate. Get away from the screen briefly. What still matters today?')
    case 14:
      return mk('A moment for Zoe', `${pick(FOCUS_ME, n + 3)} Aim for one private win today.`)
    case 15:
      return mk(weekday ? 'Afternoon focus' : 'Check in', weekday ? 'Do not scatter. What ONE thing needs to be finished?' : pick(FOCUS_ME, n + 4))
    case 16:
      return mk('Affirmation', g?.highest_self ? short(sentences(g.highest_self)[0] ?? aff) : aff)
    case 17:
      return mk('Do not rush', weekday
        ? 'Your schedule belongs to you. Finish based on YOUR work, not when somebody else leaves.'
        : pick(AFFIRMATIONS, n + 5))
    case 18:
      return mk(`Tonight: ${theme.block}`, `Your evening has a purpose. DONE means: ${theme.done}`)
    case 19: {
      const line = sentences(g?.self_reflection)[0] ?? sentences(g?.main_focus)[0]
      return mk('Tonight’s reflection', line ? short(line) : 'What did you do today that belonged to you?')
    }
    case 20:
      return mk('Capture it', 'A few clips from tonight: dinner, outfit, sunset, your space. Not everything has to be posted.')
    case 21:
      return mk('Close the day', 'Gym tomorrow? Outfit, bag, Top 3. Then journal and rest.')
    case 22:
      return mk('Wind down', `${aff} You did enough today.`)
    default:
      return null
  }
}

/** The nudge for the current hour, or the most recent one earlier today. */
export function currentNudge(hour: number, ctx: NudgeContext): Nudge | null {
  for (let h = hour; h >= 6; h--) {
    if (!NUDGE_HOURS.includes(h)) continue
    const nu = nudgeFor(h, ctx)
    if (nu) return nu
  }
  return null
}
