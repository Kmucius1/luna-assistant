import { AppLayout } from '@/components/layout/AppLayout'
import { TripDetail } from '@/components/travel/TripDetail'

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <AppLayout noPad>
      <TripDetail id={id} />
    </AppLayout>
  )
}
