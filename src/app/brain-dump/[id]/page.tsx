import { AppLayout } from '@/components/layout/AppLayout'
import { BrainDumpDetail } from '@/components/home/BrainDumpDetail'

export default async function BrainDumpDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <AppLayout noPad>
      <BrainDumpDetail id={id} />
    </AppLayout>
  )
}
