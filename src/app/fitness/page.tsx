import { Suspense } from 'react'
import { LunaFitnessPage } from '@/components/home/LunaFitnessPage'

export const dynamic = 'force-dynamic'

export default function FitnessPage() {
  return (
    <Suspense fallback={null}>
      <LunaFitnessPage />
    </Suspense>
  )
}
