import { FitnessShell } from '@/components/fitness/FitnessShell'
import { FitnessTodayView } from '@/components/fitness/FitnessTodayView'

export const dynamic = 'force-dynamic'

export default function FitnessPage() {
  return (
    <FitnessShell title="Today">
      <FitnessTodayView />
    </FitnessShell>
  )
}
