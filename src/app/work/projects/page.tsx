import { WorkShell } from '@/components/work/WorkShell'
import { ProjectsView } from '@/components/work/ProjectsView'

export const dynamic = 'force-dynamic'

export default function WorkProjectsPage() {
  return (
    <WorkShell title="Projects">
      <ProjectsView />
    </WorkShell>
  )
}
