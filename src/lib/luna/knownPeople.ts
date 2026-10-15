// Details Zoe has told Luna about people in her life, so they can be applied to a saved
// person in one tap instead of retyped. Birth times are local clock times at the birth place.
import type { SavedPerson } from '@/lib/luna/savedPeople'

export const KALEB_KNOWN: Omit<SavedPerson, 'id'> = {
  name: 'Kaleb',
  relationship: 'Romantic',
  birthDate: '2000-09-16',
  // Zoe's window is 3:05–4:30 PM. The Moon enters Taurus at 3:06 PM EDT, so the window
  // is effectively 3:06–4:30 PM; the midpoint is used for calculations.
  birthTime: '15:48',
  birthTimeRange: '3:06–4:30 PM',
  birthLocation: 'Long Island, NY',
  birthTimezone: 'America/New_York',
  knownMoonSign: 'Taurus',
  timeAccuracy: 'approximate',
}
