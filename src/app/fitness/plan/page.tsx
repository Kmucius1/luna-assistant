import { FitnessShell } from '@/components/fitness/FitnessShell'
import { FitnessPlanView } from '@/components/fitness/FitnessPlanView'

export const dynamic = 'force-dynamic'

export default function FitnessPlanPage() {
  return (
    <FitnessShell title="Plan">
      <FitnessPlanView />
    </FitnessShell>
  )
}
