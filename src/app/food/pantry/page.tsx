import { FoodShell } from '@/components/food/FoodShell'
import { PantryView } from '@/components/food/PantryView'

export const dynamic = 'force-dynamic'

export default function PantryPage() {
  return (
    <FoodShell title="Pantry">
      <PantryView />
    </FoodShell>
  )
}
