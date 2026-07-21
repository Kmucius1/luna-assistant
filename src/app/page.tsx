import { AppLayout } from '@/components/layout/AppLayout'
import { LunaHomeV2 } from '@/components/home/LunaHomeV2'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <AppLayout noPad>
      <LunaHomeV2 />
    </AppLayout>
  )
}
