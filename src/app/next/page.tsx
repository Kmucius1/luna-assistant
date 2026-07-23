import { ComingSoonRoom } from '@/components/shared/ComingSoonRoom'

export default function NextMovePage() {
  return (
    <ComingSoonRoom
      label="Next Move"
      image="/images/rooms/next-move.jpg"
      tagline="One screen. One question: what should I do next? Luna will read your calendar, work, food, wellness, fitness, and energy to give you exactly one recommendation."
      planned={[
        'Cross-room AI synthesis (needs Food, Fitness, and Travel to have real data first)',
        'A single, clear next-action recommendation',
        'No dashboards, no lists — just the one thing that matters most right now',
      ]}
    />
  )
}
