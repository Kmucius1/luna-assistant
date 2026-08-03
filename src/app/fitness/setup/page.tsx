import { Suspense } from 'react'
import { FitnessShell } from '@/components/fitness/FitnessShell'
import { FitnessSetupView } from '@/components/fitness/FitnessSetupView'

export const dynamic = 'force-dynamic'

export default function FitnessSetupPage() {
  return (
    <FitnessShell title="Setup">
      <Suspense fallback={null}>
        <FitnessSetupView />
      </Suspense>
    </FitnessShell>
  )
}
