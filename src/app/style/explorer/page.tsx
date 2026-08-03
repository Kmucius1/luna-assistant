import { StyleShell } from '@/components/style/StyleShell'
import { StyleExplorerView } from '@/components/style/StyleExplorerView'

export const dynamic = 'force-dynamic'

export default function StyleExplorerPage() {
  return (
    <StyleShell title="Explorer">
      <StyleExplorerView />
    </StyleShell>
  )
}
