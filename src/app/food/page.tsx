import { ComingSoonRoom } from '@/components/shared/ComingSoonRoom'

export default function FoodPage() {
  return (
    <ComingSoonRoom
      label="Food"
      image="/images/rooms/food.png"
      tagline="Meal plans, recipes, groceries, and nutrition — built around what you actually like to eat."
      planned={[
        'Weekly meal plan (breakfasts, lunches, dinners — the AI engine already works, just needs this screen)',
        "Today's meals + snacks",
        'Recipes and restaurant picks',
        'Grocery list organized by store section',
        'Pantry, favorites, and nutrition tracking',
      ]}
    />
  )
}
