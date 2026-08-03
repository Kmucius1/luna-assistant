import { StyleShell } from '@/components/style/StyleShell'
import { StyleTodayView } from '@/components/style/StyleTodayView'

export const dynamic = 'force-dynamic'

export default function StylePage() {
  return (
    <StyleShell title="Today">
      <StyleTodayView />
    </StyleShell>
  )
}
