import { FoodShell } from '@/components/food/FoodShell'
import { FavoritesView } from '@/components/food/FavoritesView'

export const dynamic = 'force-dynamic'

export default function FavoritesPage() {
  return (
    <FoodShell title="Favorites">
      <FavoritesView />
    </FoodShell>
  )
}
