import { ComingSoonRoom } from '@/components/shared/ComingSoonRoom'

export default function FitnessPage() {
  return (
    <ComingSoonRoom
      label="Fitness"
      image="/images/rooms/fitness.png"
      tagline="Your workout split, progress, and recovery — tracked for real, not just planned."
      planned={[
        "Today's workout + weekly gym split",
        'Exercise library',
        'Progress charts and body measurements',
        'Gym history',
        'Stretching and recovery',
      ]}
    />
  )
}
