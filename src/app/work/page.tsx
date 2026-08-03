import { WorkShell } from '@/components/work/WorkShell'
import { TodayView } from '@/components/work/TodayView'

export const dynamic = 'force-dynamic'

export default function WorkPage() {
  return (
    <WorkShell title="Today">
      <TodayView />
    </WorkShell>
  )
}
