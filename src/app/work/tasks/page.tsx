import { WorkShell } from '@/components/work/WorkShell'
import { TasksView } from '@/components/work/TasksView'

export const dynamic = 'force-dynamic'

export default function WorkTasksPage() {
  return (
    <WorkShell title="Tasks">
      <TasksView />
    </WorkShell>
  )
}
