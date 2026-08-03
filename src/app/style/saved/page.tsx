import { StyleShell } from '@/components/style/StyleShell'
import { StyleSavedView } from '@/components/style/StyleSavedView'

export const dynamic = 'force-dynamic'

export default function StyleSavedPage() {
  return (
    <StyleShell title="Saved">
      <StyleSavedView />
    </StyleShell>
  )
}
