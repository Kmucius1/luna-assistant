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

export function removeSavedPerson(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(getSavedPeople().filter(p => p.id !== id)))
}
