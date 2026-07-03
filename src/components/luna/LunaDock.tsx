import { BottomNav } from '@/components/layout/BottomNav'
import { DesktopTabBar } from '@/components/layout/DesktopTabBar'

/**
 * The one dock: Home | Work | LUNA | Astrology | Explore.
 * Thin wrapper re-exporting the existing mobile (BottomNav) and desktop
 * (DesktopTabBar) docks — both already have the correct 5 items.
 */
export function LunaDock() {
  return (
    <>
      <BottomNav />
      <DesktopTabBar />
    </>
  )
}
