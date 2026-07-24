import destinationsData from '@/data/travel/destinations.json'

export interface Destination {
  id: string; name: string; country: string; lat: number; lon: number; timezone: string
  climate_zone: string; best_season: string; typical_trip_length_days: [number, number]
  budget_tier: 'affordable' | 'moderate' | 'luxury'; vibe_tags: string[]; best_for: string[]
  short_description: string; neighborhoods: Array<{ name: string; vibe: string }>
  food_highlights: string; culture_notes: string; nature_notes: string; transportation_notes: string
  image: string
}

export const DESTINATIONS = destinationsData as Destination[]

export function getDestination(id: string): Destination | undefined {
  return DESTINATIONS.find(d => d.id === id)
}

// Natural-language + exact search over the curated set. Not a live places
// API (none exists in this app — see the Travel room build report) but a
// real search over real destination facts, matching both exact names and
// vibe/mood language ("somewhere warm near the ocean").
const MOOD_SYNONYMS: Record<string, string[]> = {
  warm: ['tropical', 'subtropical', 'warm'],
  ocean: ['beach', 'coastal'],
  beach: ['beach', 'coastal'],
  creative: ['creative', 'art'],
  peaceful: ['relaxing', 'wellness', 'spiritual'],
  solo: ['solo'],
  affordable: ['affordable'],
  cheap: ['affordable'],
  luxury: ['luxury'],
  romance: ['romance'],
  romantic: ['romance'],
  confident: ['confidence', 'fashion', 'nightlife'],
  confidence: ['confidence', 'fashion', 'nightlife'],
  fashion: ['fashion', 'shopping'],
  photography: ['photography'],
  photo: ['photography'],
  nature: ['nature'],
  adventure: ['adventurous'],
  adventurous: ['adventurous'],
  cold: ['subarctic', 'temperate', 'cold'],
  spiritual: ['spiritual', 'wellness'],
  food: ['food'],
  nightlife: ['nightlife'],
  business: ['business'],
  freedom: ['adventurous', 'nature', 'solo'],
}

export function searchDestinations(query: string): Destination[] {
  const q = query.toLowerCase().trim()
  if (!q) return DESTINATIONS

  // Exact/substring match on name or country first
  const exact = DESTINATIONS.filter(d => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q))
  if (exact.length) return exact

  // Natural-language: score by keyword/synonym/vibe-tag overlap
  const words = q.split(/\s+/).filter(w => w.length > 2)
  const matchedTags = new Set<string>()
  for (const w of words) {
    if (MOOD_SYNONYMS[w]) MOOD_SYNONYMS[w].forEach(t => matchedTags.add(t))
  }

  const scored = DESTINATIONS.map(d => {
    let score = 0
    for (const tag of matchedTags) {
      if (d.vibe_tags.includes(tag) || d.climate_zone === tag) score += 2
    }
    for (const w of words) {
      if (d.short_description.toLowerCase().includes(w) || d.best_for.some(b => b.toLowerCase().includes(w))) score += 1
    }
    return { d, score }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score)

  return scored.map(x => x.d)
}
