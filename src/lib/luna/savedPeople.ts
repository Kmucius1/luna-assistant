// Saved people for the Astrology Connections room — localStorage-backed
// (no Supabase table for this yet; see astrology room build report for the
// suggested astrology_profiles-style schema this could graduate to).
export interface SavedPerson {
  id: string
  name: string
  relationship: 'Romantic' | 'Friendship' | 'Family' | 'Business partner' | 'Creative collaborator' | 'Parent and child'
  birthDate: string
  birthTime?: string
  birthLocation?: string
  /** IANA zone the birth time was recorded in. Missing = Eastern, the app's assumption. */
  birthTimezone?: string
  /** Display only: the window she knows, e.g. '3:06–4:30 PM'. `birthTime` holds its midpoint. */
  birthTimeRange?: string
  /** A Moon sign she is sure of; used to confirm the calculated Moon instead of flagging it uncertain. */
  knownMoonSign?: string
  timeAccuracy: 'exact' | 'approximate' | 'unknown'
}

const KEY = 'luna_astrology_saved_people_v1'

export function getSavedPeople(): SavedPerson[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

export function addSavedPerson(person: Omit<SavedPerson, 'id'>): SavedPerson {
  const withId: SavedPerson = { ...person, id: Math.random().toString(36).slice(2) }
  const next = [...getSavedPeople(), withId]
  localStorage.setItem(KEY, JSON.stringify(next))
  return withId
}

export function updateSavedPerson(id: string, patch: Partial<Omit<SavedPerson, 'id'>>): void {
  localStorage.setItem(KEY, JSON.stringify(getSavedPeople().map(p => (p.id === id ? { ...p, ...patch } : p))))
}

export function removeSavedPerson(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getSavedPeople().filter(p => p.id !== id)))
}
