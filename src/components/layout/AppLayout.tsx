'use client'
import { usePathname } from 'next/navigation'
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
}

const DOCK_CLEAR = 'calc(max(34px, env(safe-area-inset-bottom, 0px)) + 78px)'

// The moon/LUNA/bell header only earns its space on the two pages it's
// actually useful on — everywhere else it just ate screen height and
// pushed content below the fold.
const TOP_BAR_ROUTES = ['/', '/explore']

export function AppLayout({ children, noScroll, noPad, className, wide }: AppLayoutProps) {
  const pathname = usePathname()
  const showTopBar = TOP_BAR_ROUTES.includes(pathname)

  return (
    <SwipeContainer
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
    >
      {/* Desktop fixed header */}
      <DesktopHeader />

      {/* Mobile top bar — Home and Explore only, part of flex flow, hidden on desktop */}
      {showTopBar && (
        <div className="lg:hidden" style={{ flexShrink: 0 }}>
          <MobileTopBar />
        </div>
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
              paddingBottom: DOCK_CLEAR,
            }}
          >
            {children}
          </div>
        ) : (
          <div
            className={noPad ? '' : 'px-4 md:px-8 lg:px-10'}
            style={{
              flex: 1, overflowY: 'auto', overflowX: 'hidden',
              paddingBottom: DOCK_CLEAR,
            }}
          >
            <div className="animate-page-enter content-enter">
              {children}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
      <DesktopTabBar />
    </SwipeContainer>
  )
}
