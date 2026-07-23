import { ComingSoonRoom } from '@/components/shared/ComingSoonRoom'

export default function WellnessPage() {
  return (
    <ComingSoonRoom
      label="Wellness"
      image="/images/rooms/wellness.jpg"
      tagline="Sleep, skincare, self-tan, beach and pool time, and the recovery your body actually needs."
      planned={[
        'Sleep tracking',
        'Beach, pool, and outdoor walk scheduling',
        'Self-tan and skincare routines',
        'Meditation and recovery',
        'Habits',
      ]}
    />
  )
}
