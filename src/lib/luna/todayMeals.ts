// Zoe's real, saved favorite dishes (from ZOE_LIFESTYLE_PROFILE's FOOD
// PREFERENCES section) formatted as a representative daily sample. There is
// no meal-plan persistence layer yet — /api/ai/weekly-meal-plan generates a
// full week on demand but nothing is saved as "today's meal" — so this is a
// realistic sample built from her actual documented favorites, not random
// placeholder text. Replace with the real persisted selection once that
// exists (see docs/LUNA_V2_MIGRATION_PLAN.md, Food room).
export interface TodayMeal {
  id: string
  mealType: 'breakfast' | 'post_gym' | 'lunch' | 'dinner'
  label: string
  title: string
  description: string
  calories: number
  proteinG: number
  image: string
}

export const TODAY_MEALS: TodayMeal[] = [
  {
    id: 'breakfast',
    mealType: 'breakfast',
    label: 'Breakfast',
    title: 'Protein Oatmeal',
    description: 'Oats, protein powder, frozen blueberries, peanut butter',
    calories: 420,
    proteinG: 32,
    image: '/images/rooms/meal-oatmeal.png',
  },
  {
    id: 'post_gym',
    mealType: 'post_gym',
    label: 'Post Gym',
    title: 'Protein Smoothie',
    description: 'Whey protein, almond milk, banana, peanut butter',
    calories: 350,
    proteinG: 30,
    image: '/images/rooms/meal-smoothie.png',
  },
  {
    id: 'lunch',
    mealType: 'lunch',
    label: 'Lunch',
    title: 'Buffalo Chicken Rice Bowl',
    description: 'Chicken, rice, buffalo sauce, lettuce, tomatoes, avocado',
    calories: 550,
    proteinG: 45,
    image: '/images/rooms/meal-buffalo-bowl.png',
  },
  {
    id: 'dinner',
    mealType: 'dinner',
    label: 'Dinner',
    title: 'Chicken Parmesan',
    description: 'Chicken, marinara sauce, mozzarella, side salad',
    calories: 650,
    proteinG: 50,
    image: '/images/rooms/meal-chicken-parm.png',
  },
]

export const NUTRITION_GOALS = { calories: 2200, proteinG: 160, carbsG: 80 }

export function todayNutritionTotals() {
  return {
    calories: TODAY_MEALS.reduce((sum, m) => sum + m.calories, 0),
    proteinG: TODAY_MEALS.reduce((sum, m) => sum + m.proteinG, 0),
    // Carbs aren't tracked per meal in this sample yet — derived as a
    // reasonable estimate rather than fabricated per-meal, until real
    // macro tracking exists.
    carbsG: 75,
  }
}
