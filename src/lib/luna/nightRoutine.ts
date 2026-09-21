// Night mode for the Home hero card: after the day winds down, the "Today's
// Focus" box shows her nighttime routine (most important step first) instead of
// the weekday focus. Client-safe — no server imports.

// Single source for the default routine; the Profile page seeds from this too.
export const NIGHT_ROUTINE_DEFAULT: string[] = [
  'Stop working by 9:30 PM — or earlier',
  'Skin care routine',
  'No new input (news, social, messages) after 10 PM',
  'Journal or dictate in LUNA',
  'Check tomorrow\'s calendar',
  'Lay out clothes if going out',
  'Gratitude — end on something good',
  'Breathe before sleep — in for 4, hold for 4, out for 6',
]

// Night mode starts at 8 PM and runs until the 4 AM planning-day rollover.
// If the gym (or other movement) is already logged today, it starts at 5 PM
// so she isn't shown a workout focus for something she's already done.
export const NIGHT_START_HOUR = 20
export const EVENING_START_HOUR = 17
export const NIGHT_END_HOUR = 4

export function isNightWindow(hour: number, movementDone: boolean): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR || (hour >= EVENING_START_HOUR && movementDone)
}

export const NIGHT_HERO = {
  emoji: '🌙',
  label: 'Tonight’s Routine',
  image: '/images/rooms/hero-wellness-focus.jpg',
  imagePosition: 'center 62%',
  href: '/night',
}

// Same storage the Profile page edits ("My Night Routine"), so what she sets
// there is what shows here. Falls back to the default if nothing usable is saved.
const PROFILE_KEY = 'luna_zoe_profile_v2'

export function loadNightRoutine(): string[] {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    const saved = raw ? (JSON.parse(raw) as { night_routine?: unknown }).night_routine : null
    if (Array.isArray(saved)) {
      const steps = saved.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map(s => s.trim())
      if (steps.length) return steps
    }
  } catch { /* localStorage unavailable or bad JSON — use the default */ }
  return NIGHT_ROUTINE_DEFAULT
}
