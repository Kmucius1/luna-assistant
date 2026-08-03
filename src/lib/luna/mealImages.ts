// Keyword → curated photo mapping for AI-generated meal titles. The weekly
// meal plan is generated fresh each week (see /api/ai/weekly-meal-plan), so
// there's no stable id to hang a per-meal image on — match on the title text
// against Zoe's real favorite-food categories instead, same categories
// documented in ZOE_LIFESTYLE_PROFILE's FOOD PREFERENCES section.
const MEAL_IMAGE_RULES: { keywords: string[]; image: string }[] = [
  { keywords: ['salmon'], image: '/images/rooms/meal-salmon.jpg' },
  { keywords: ['fajita', 'taco', 'mexican', 'burrito'], image: '/images/rooms/meal-fajitas.jpg' },
  { keywords: ['buffalo'], image: '/images/rooms/meal-buffalo-salad.jpg' },
  { keywords: ['alfredo'], image: '/images/rooms/meal-chicken-alfredo.jpg' },
  { keywords: ['parmesan', 'parm'], image: '/images/rooms/meal-chicken-parm.jpg' },
  { keywords: ['pancake', 'waffle'], image: '/images/rooms/meal-protein-pancakes.jpg' },
  { keywords: ['smoothie', 'shake'], image: '/images/rooms/meal-smoothie.jpg' },
  { keywords: ['oatmeal', 'overnight oats'], image: '/images/rooms/meal-oatmeal.jpg' },
  { keywords: ['bowl'], image: '/images/rooms/meal-buffalo-bowl.jpg' },
]

const FALLBACK_IMAGE = '/images/rooms/food.jpg'

export function imageForMeal(title: string): string {
  const t = title.toLowerCase()
  for (const rule of MEAL_IMAGE_RULES) {
    if (rule.keywords.some(k => t.includes(k))) return rule.image
  }
  return FALLBACK_IMAGE
}
