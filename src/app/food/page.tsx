import { Suspense } from 'react'
import { LunaFoodPage } from '@/components/home/LunaFoodPage'

export const dynamic = 'force-dynamic'

export default function FoodPage() {
  return (
    <Suspense fallback={null}>
      <LunaFoodPage />
    </Suspense>
  )
}
