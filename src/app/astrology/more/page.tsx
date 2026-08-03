import { AstrologyShell } from '@/components/astrology/AstrologyShell'
import { AstrologyMore } from '@/components/astrology/AstrologyMore'

export default function AstrologyMorePage() {
  return (
    <AstrologyShell backHref="/home">
      <AstrologyMore />
    </AstrologyShell>
  )
}
