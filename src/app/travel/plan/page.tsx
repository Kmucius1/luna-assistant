import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PlanTrip } from '@/components/travel/PlanTrip'

export default function PlanTripPage() {
  return (
    <AppLayout noPad>
      <Suspense fallback={null}>
        <PlanTrip />
      </Suspense>
    </AppLayout>
  )
}
