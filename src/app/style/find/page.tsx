import { StyleShell } from '@/components/style/StyleShell'
import { StyleFindView } from '@/components/style/StyleFindView'

export const dynamic = 'force-dynamic'

export default function StyleFindPage() {
  return (
    <StyleShell title="Find">
      <StyleFindView />
    </StyleShell>
  )
}
