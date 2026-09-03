import { WorkShell } from '@/components/work/WorkShell'
import { EventsView } from '@/components/work/EventsView'

export const dynamic = 'force-dynamic'

export default function WorkEventsPage() {
  return (
    <WorkShell title="Modeling Events">
      <EventsView />
    </WorkShell>
  )
}
