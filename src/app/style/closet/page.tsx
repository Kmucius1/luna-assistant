import { StyleShell } from '@/components/style/StyleShell'
import { StyleClosetView } from '@/components/style/StyleClosetView'

export const dynamic = 'force-dynamic'

export default function StyleClosetPage() {
  return (
    <StyleShell title="Closet">
      <StyleClosetView />
    </StyleShell>
  )
}
