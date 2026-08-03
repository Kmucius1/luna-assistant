'use client'
import { usePathname } from 'next/navigation'
import { EnergyReadUpdater } from '@/components/home/EnergyReadUpdater'
import { BottomNav } from './BottomNav'
import { DesktopHeader } from './DesktopHeader'
import { DesktopTabBar } from './DesktopTabBar'
import { MobileTopBar } from './MobileTopBar'
import { SwipeContainer } from './SwipeContainer'

interface AppLayoutProps {
  children: React.ReactNode
  noScroll?: boolean
  noPad?: boolean
  className?: string
  /** Hub/list pages: a roomy desktop cap without stretching cards edge-to-edge */
  wide?: boolean
  /** Rooms with their own internal 5-tab bottom nav (e.g. Astrology) render
      that instead of the main app dock, rather than stacking two bottom bars. */
  hideBottomNav?: boolean
  /** Ordered hrefs for that room's own sub-tabs — when set, a horizontal
      swipe moves between them instead of the global top-level rooms. */
  swipeTabs?: string[]
}

const DOCK_CLEAR = 'calc(max(34px, env(safe-area-inset-bottom, 0px)) + 78px)'

// The moon/LUNA/bell header only earns its space on the pages it's
// actually useful on — everywhere else it just ate screen height and
// pushed content below the fold. Home (`/`) has its own greeting header
// as part of the LUNA V2 design and must fit one screen with no scroll,
// so it doesn't get this bar on top of that.
const TOP_BAR_ROUTES = ['/explore']

export function AppLayout({ children, noScroll, noPad, className, wide, hideBottomNav, swipeTabs }: AppLayoutProps) {
  const pathname = usePathname()
  const showTopBar = TOP_BAR_ROUTES.includes(pathname)

  return (
    <SwipeContainer
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
      tabs={swipeTabs}
    >
      <EnergyReadUpdater />
      {/* Desktop fixed header */}
      <DesktopHeader />

      {/* Mobile top bar — Explore only, part of flex flow, hidden on desktop.
          MobileTopBar itself pads for the top safe area (notch/Dynamic
          Island); pages that don't render it still need that clearance,
          since viewportFit=cover lets content draw under the status bar. */}
      {showTopBar ? (
        <div className="lg:hidden" style={{ flexShrink: 0 }}>
          <MobileTopBar />
        </div>
      ) : (
        <div className="lg:hidden" style={{ flexShrink: 0, paddingTop: 'env(safe-area-inset-top, 0px)' }} />
      )}

      <main
        className={['mx-auto w-full', wide ? 'max-w-[1180px]' : 'max-w-[1120px]', 'lg:pt-16', className ?? ''].join(' ')}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {noScroll ? (
          <div
            className={noPad ? '' : 'px-4 md:px-8 lg:px-10'}
            style={{
              flex: 1, minHeight: 0, overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
              paddingBottom: hideBottomNav ? 0 : DOCK_CLEAR,
            }}
          >
            {children}
          </div>
        ) : (
          <div
            className={noPad ? '' : 'px-4 md:px-8 lg:px-10'}
            style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden',
              paddingBottom: hideBottomNav ? 0 : DOCK_CLEAR,
            }}
          >
            <div className="animate-page-enter content-enter">
              {children}
            </div>
          </div>
        )}
      </main>

      {!hideBottomNav && <BottomNav />}
      {!hideBottomNav && <DesktopTabBar />}
    </SwipeContainer>
  )
}
