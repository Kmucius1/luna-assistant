import { AppLayout } from '@/components/layout/AppLayout'
import { LunaHomeV2 } from '@/components/home/LunaHomeV2'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <AppLayout noPad noScroll>
      <LunaHomeV2 />
    </AppLayout>
  )
}
