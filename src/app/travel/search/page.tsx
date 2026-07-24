import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { TravelSearch } from '@/components/travel/TravelSearch'

export default function TravelSearchPage() {
  return (
    <AppLayout noPad>
      <Suspense fallback={null}>
        <TravelSearch />
      </Suspense>
    </AppLayout>
  )
}
