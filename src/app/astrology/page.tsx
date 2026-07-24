import { AstrologyShell } from '@/components/astrology/AstrologyShell'
import { AstrologyToday } from '@/components/astrology/AstrologyToday'

export default function AstrologyPage() {
  return (
    <AstrologyShell>
      <AstrologyToday />
    </AstrologyShell>
  )
}
