import { FitnessShell } from '@/components/fitness/FitnessShell'
import { FitnessPhotosView } from '@/components/fitness/FitnessPhotosView'

export const dynamic = 'force-dynamic'

export default function FitnessPhotosPage() {
  return (
    <FitnessShell title="Photos">
      <FitnessPhotosView />
    </FitnessShell>
  )
}
