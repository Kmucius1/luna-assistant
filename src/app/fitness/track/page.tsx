import { FitnessShell } from '@/components/fitness/FitnessShell'
import { FitnessTrackView } from '@/components/fitness/FitnessTrackView'

export const dynamic = 'force-dynamic'

export default function FitnessTrackPage() {
  return (
    <FitnessShell title="Track">
      <FitnessTrackView />
    </FitnessShell>
  )
}
