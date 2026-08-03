import { AstrologyShell } from '@/components/astrology/AstrologyShell'
import { AstrologyChart } from '@/components/astrology/AstrologyChart'

export default function AstrologyChartPage() {
  return (
    <AstrologyShell backHref="/home">
      <AstrologyChart />
    </AstrologyShell>
  )
}
