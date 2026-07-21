import { ComingSoonRoom } from '@/components/shared/ComingSoonRoom'

export default function TravelPage() {
  return (
    <ComingSoonRoom
      label="Travel"
      image="/images/rooms/travel.png"
      tagline="Upcoming trips, dream trips, packing lists, and itineraries — all in one place."
      planned={[
        'Upcoming and dream trips',
        'Packing lists',
        'Hotels and flights',
        'Itineraries and maps',
        'Trip memories',
      ]}
    />
  )
}
