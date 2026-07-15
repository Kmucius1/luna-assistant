export interface DailyReminder {
  id: string
  time?: string
  label: string
}

export const MORNING_REMINDERS: DailyReminder[] = [
  { id: 'wake',    time: '6:00 AM',  label: 'Wake up' },
  { id: 'gym',     time: '6:30 AM',  label: 'Gym' },
  { id: 'journal', label: 'Journal — even a few lines' },
]

export const MIDDAY_REMINDERS: DailyReminder[] = [
  { id: 'water',     label: 'Hit 100 oz of water today' },
  { id: 'meal',      label: 'Eat a real, nourishing meal' },
  { id: 'groceries', label: 'Grocery run or meal prep if the fridge is empty' },
]

export const NIGHT_REMINDERS: DailyReminder[] = [
  { id: 'skincare', label: 'Skincare routine' },
  { id: 'water',    label: 'Final water check-in for the day' },
  { id: 'journal',  label: 'A few lines before bed' },
]
