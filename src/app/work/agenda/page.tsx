import { WorkShell } from '@/components/work/WorkShell'
import { AgendaView } from '@/components/work/AgendaView'

export const dynamic = 'force-dynamic'

export default function WorkAgendaPage() {
  return (
    <WorkShell title="Agenda">
      <AgendaView />
    </WorkShell>
  )
}
