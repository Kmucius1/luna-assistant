import { StyleShell } from '@/components/style/StyleShell'
import { StyleWeekView } from '@/components/style/StyleWeekView'

export const dynamic = 'force-dynamic'

export default function StyleWeekPage() {
  return (
    <StyleShell title="This Week">
      <StyleWeekView />
    </StyleShell>
  )
}
