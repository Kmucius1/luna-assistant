import { ZOE_NEVER_FOODS } from '@/lib/luna/zoeLifestyleProfile'

export interface FoodProfile {
  preferred_chicken_brand: string | null
  rice_preference: string | null
  dressing_preference: string | null
  favorite_meals: Record<string, string[]> | null
  behavior_rules: string[] | null
  never_foods: string[] | null
  cooking_techniques: Record<string, string> | null
}

/** Union of the app-wide never-list and the Food Profile's own — nothing
 * she's ever banned gets silently dropped just because one list is shorter. */
export function mergedNeverFoods(profile: FoodProfile | null): string[] {
  const set = new Set([...ZOE_NEVER_FOODS, ...(profile?.never_foods ?? [])].map(f => f.toLowerCase()))
  return Array.from(set)
}

export function formatFoodProfileForPrompt(profile: FoodProfile | null): string {
  if (!profile) return ''
  const parts: string[] = []

  if (profile.preferred_chicken_brand) {
    parts.push(`Preferred chicken brand: ${profile.preferred_chicken_brand} — always specify this brand whenever chicken appears in a grocery list.`)
  }
  if (profile.rice_preference) parts.push(`Rice preference: ${profile.rice_preference}`)
  if (profile.dressing_preference) parts.push(`Dressing preference: ${profile.dressing_preference}`)

  if (profile.favorite_meals) {
    for (const [category, meals] of Object.entries(profile.favorite_meals)) {
      if (Array.isArray(meals) && meals.length) {
        parts.push(`Favorite ${category.replace(/_/g, ' ')}: ${meals.join(', ')}`)
      }
    }
  }

  if (profile.behavior_rules?.length) {
    parts.push(`Behavior rules:\n${profile.behavior_rules.map(r => `- ${r}`).join('\n')}`)
  }

  if (profile.cooking_techniques) {
    const notes = Object.entries(profile.cooking_techniques).map(([dish, note]) => `- ${dish.replace(/_/g, ' ')}: ${note}`)
    if (notes.length) parts.push(`Real restaurant technique/seasoning notes to follow when these dishes come up:\n${notes.join('\n')}`)
  }

  return parts.join('\n\n')
}
