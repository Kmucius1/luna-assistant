// Self-care routine tracking and recovery suggestions for the Wellness room.
// No Supabase table exists for beauty routines yet (confirmed via audit), so
// "last done" / "next due" is tracked in localStorage — genuinely functional,
// just not synced across devices. Recovery suggestions are derived from the
// real, static ZOE_GYM_BY_DAY schedule (yesterday's scheduled focus), not
// fabricated workout history, since no workout-completion log exists either.

export interface SelfCareItem {
  id: string
  label: string
  image: string
  intervalDays: number
}

export const SELF_CARE_ITEMS: SelfCareItem[] = [
  { id: 'self_tan', label: 'Self Tan', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 7 },
  { id: 'hair_wash', label: 'Hair Wash', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 3 },
  { id: 'hair_mask', label: 'Hair Mask', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 7 },
  { id: 'face_mask', label: 'Face Mask', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 3 },
  { id: 'skincare', label: 'Skincare', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 1 },
  { id: 'nails', label: 'Nails', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 14 },
  { id: 'wax', label: 'Wax', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 28 },
  { id: 'eyebrows', label: 'Eyebrows', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 21 },
  { id: 'teeth_whitening', label: 'Teeth Whitening', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 30 },
  { id: 'shave', label: 'Shave', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 4 },
  { id: 'body_scrub', label: 'Body Scrub', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 7 },
  { id: 'lashes', label: 'Lashes', image: '/images/rooms/wellness-selfcare.jpg', intervalDays: 21 },
]

const STORAGE_KEY = 'luna_selfcare_v1'

function loadLog(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch { return {} }
}

function saveLog(log: Record<string, number>): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(log)) } catch {}
}

export function markSelfCareDoneToday(id: string): void {
  const log = loadLog()
  log[id] = Date.now()
  saveLog(log)
}

export function getSelfCareStatus(item: SelfCareItem): { lastDoneTs: number | null; dueLabel: string; overdue: boolean } {
  const log = loadLog()
  const lastDoneTs = log[item.id] ?? null
  if (lastDoneTs == null) return { lastDoneTs: null, dueLabel: 'Not logged yet', overdue: false }

  const dueTs = lastDoneTs + item.intervalDays * 86_400_000
  const daysUntil = Math.round((dueTs - Date.now()) / 86_400_000)

  if (daysUntil <= 0) return { lastDoneTs, dueLabel: 'Due now', overdue: true }
  if (daysUntil === 1) return { lastDoneTs, dueLabel: 'Tomorrow', overdue: false }
  return { lastDoneTs, dueLabel: `In ${daysUntil} days`, overdue: false }
}

// Recovery suggestions for TODAY, keyed by YESTERDAY's scheduled focus —
// derived from the real gym schedule in zoeLifestyleProfile.ts, not a fake
// workout-history log (none exists).
export const RECOVERY_AFTER: Record<string, string[]> = {
  Monday: ['Glute and hip soreness likely', 'Foam roll glutes and hamstrings', 'Stretch hip flexors', 'Walk 20 minutes', 'Protein target 160g'],
  Tuesday: ['Upper body and lat soreness likely', 'Foam roll upper back', 'Stretch shoulders and triceps', 'Walk 20 minutes', 'Protein target 160g'],
  Wednesday: ['Light glute fatigue', 'Stretch hips and core', 'Easy walk or mobility flow', 'Protein target 160g'],
  Thursday: ['Shoulder and arm soreness likely', 'Stretch shoulders and forearms', 'Foam roll upper back', 'Walk 20 minutes', 'Protein target 160g'],
  Friday: ['Glute and hip soreness likely', 'Foam roll glutes and hamstrings', 'Stretch hip flexors', 'Walk 20 minutes', 'Protein target 160g'],
  Saturday: ['Full-body fatigue likely', 'Foam roll legs and back', 'Full-body stretch', 'Gentle walk', 'Protein target 160g'],
  Sunday: ['Rest day yesterday — low fatigue', 'Light stretch or mobility flow', 'Stay hydrated', 'Protein target 160g'],
}
