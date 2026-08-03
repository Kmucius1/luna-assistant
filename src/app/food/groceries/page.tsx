import { FoodShell } from '@/components/food/FoodShell'
import { GroceriesView } from '@/components/food/GroceriesView'

export const dynamic = 'force-dynamic'

export default function GroceriesPage() {
  return (
    <FoodShell title="Groceries">
      <GroceriesView />
    </FoodShell>
  )
}
