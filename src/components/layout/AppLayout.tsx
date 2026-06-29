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
}

const DOCK_CLEAR = 'calc(max(10px, env(safe-area-inset-bottom, 0px)) + 78px)'

export function AppLayout({ children, noScroll, noPad, className }: AppLayoutProps) {
  return (
    <SwipeContainer
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
    >
      {/* Desktop fixed header */}
      <DesktopHeader />

      {/* Mobile top bar — part of flex flow, hidden on desktop */}
      <div className="lg:hidden" style={{ flexShrink: 0 }}>
        <MobileTopBar />
      </div>

      <main
        className={['mx-auto w-full max-w-[1120px] lg:pt-16', className ?? ''].join(' ')}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {noScroll ? (
          <div
            className={noPad ? '' : 'px-4'}
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
            className={noPad ? '' : 'px-4 md:px-8'}
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
