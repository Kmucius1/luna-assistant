import { WorkShell } from '@/components/work/WorkShell'
import { NotesView } from '@/components/work/NotesView'

export const dynamic = 'force-dynamic'

export default function WorkNotesPage() {
  return (
    <WorkShell title="Notes">
      <NotesView />
    </WorkShell>
  )
}
