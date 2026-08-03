import { FoodShell } from '@/components/food/FoodShell'
import { MealPlanView } from '@/components/food/MealPlanView'

export const dynamic = 'force-dynamic'

export default function FoodPage() {
  return (
    <FoodShell title="Meal Plan">
      <MealPlanView />
    </FoodShell>
  )
}
