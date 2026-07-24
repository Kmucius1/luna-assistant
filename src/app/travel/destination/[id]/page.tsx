import { AppLayout } from '@/components/layout/AppLayout'
import { DestinationDetail } from '@/components/travel/DestinationDetail'

export default async function DestinationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <AppLayout noPad>
      <DestinationDetail id={id} />
    </AppLayout>
  )
}
