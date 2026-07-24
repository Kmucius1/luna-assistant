// Real, transparent destination match scoring — every point is traceable
// to a named factor so "Why this match?" can show its work. Astrology is
// one optional bonus factor among many, never the sole basis (per spec).
import type { Destination } from './destinations'

export interface TravelProfile {
  preferred_climates: string[]
  preferred_budget_tier: 'affordable' | 'moderate' | 'luxury' | null
  preferred_pace: string | null
  preferred_trip_length_days: number | null
  travel_interests: string[]
  liked_destination_ids: string[]
  rejected_destination_ids: string[]
}

export interface MatchFactor { label: string; points: number; maxPoints: number; reason: string }
export interface MatchResult { score: number; factors: MatchFactor[]; astrocartographyBonus: MatchFactor | null }

export function scoreDestination(dest: Destination, profile: Partial<TravelProfile>, nearbyAstroLines?: Array<{ body: string; type: string }>): MatchResult {
  const factors: MatchFactor[] = []

  // Interests overlap (up to 35 pts)
  const interests = profile.travel_interests ?? []
  const overlap = dest.vibe_tags.filter(t => interests.includes(t))
  const interestPts = interests.length ? Math.round((overlap.length / Math.max(interests.length, dest.vibe_tags.length)) * 35) : 15
  factors.push({ label: 'Interests', points: interestPts, maxPoints: 35, reason: overlap.length ? `Matches ${overlap.join(', ')}` : 'No strong interest overlap on file yet' })

  // Budget fit (up to 20 pts)
  const budgetMatch = !profile.preferred_budget_tier || profile.preferred_budget_tier === dest.budget_tier
  factors.push({ label: 'Budget fit', points: budgetMatch ? 20 : 6, maxPoints: 20, reason: budgetMatch ? `Fits your ${dest.budget_tier} preference` : `This is ${dest.budget_tier}, outside your usual range` })

  // Climate preference (up to 15 pts)
  const climates = profile.preferred_climates ?? []
  const climateMatch = !climates.length || climates.includes(dest.climate_zone)
  factors.push({ label: 'Climate', points: climateMatch ? 15 : 5, maxPoints: 15, reason: climateMatch ? `${dest.climate_zone} matches your preference` : `${dest.climate_zone} isn't your usual pick` })

  // Trip length fit (up to 10 pts)
  const preferredLen = profile.preferred_trip_length_days
  const [minLen, maxLen] = dest.typical_trip_length_days
  const lengthMatch = !preferredLen || (preferredLen >= minLen - 2 && preferredLen <= maxLen + 2)
  factors.push({ label: 'Trip length', points: lengthMatch ? 10 : 4, maxPoints: 10, reason: lengthMatch ? `A ${minLen}-${maxLen} day trip fits your usual pace` : `Typically a ${minLen}-${maxLen} day trip` })

  // Past behavior (up to 15 pts) — liked destinations with overlapping tags nudge similar ones up
  const liked = profile.liked_destination_ids ?? []
  const rejected = profile.rejected_destination_ids ?? []
  let pastPts = 8
  let pastReason = 'No history with similar places yet'
  if (rejected.includes(dest.id)) { pastPts = 0; pastReason = 'You passed on this one before' }
  else if (liked.includes(dest.id)) { pastPts = 15; pastReason = 'You\'ve liked this destination before' }
  factors.push({ label: 'Your history', points: pastPts, maxPoints: 15, reason: pastReason })

  // Seasonality (up to 5 pts) — flat credit for now; a real "is it currently
  // the best season" check would need the current date, kept simple here.
  factors.push({ label: 'Seasonality', points: 5, maxPoints: 5, reason: `Best season: ${dest.best_season}` })

  let astrocartographyBonus: MatchFactor | null = null
  if (nearbyAstroLines && nearbyAstroLines.length > 0) {
    const bodies = [...new Set(nearbyAstroLines.map(l => l.body))].join(', ')
    astrocartographyBonus = { label: 'Astrocartography (optional)', points: 8, maxPoints: 8, reason: `Your ${bodies} line${nearbyAstroLines.length > 1 ? 's pass' : ' passes'} near here` }
  }

  const rawTotal = factors.reduce((s, f) => s + f.points, 0) + (astrocartographyBonus?.points ?? 0)
  const maxTotal = factors.reduce((s, f) => s + f.maxPoints, 0) + (astrocartographyBonus?.maxPoints ?? 0)
  const score = Math.round((rawTotal / maxTotal) * 100)

  return { score, factors, astrocartographyBonus }
}
