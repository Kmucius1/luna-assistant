import { FoodShell } from '@/components/food/FoodShell'
import { RecipesView } from '@/components/food/RecipesView'

export default function RecipesPage() {
  return (
    <FoodShell title="Recipes">
      <RecipesView />
    </FoodShell>
  )
}
