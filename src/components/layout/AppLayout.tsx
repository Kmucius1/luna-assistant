import { BottomNav } from './BottomNav'
import { DesktopHeader } from './DesktopHeader'
import { DesktopTabBar } from './DesktopTabBar'
import { SwipeContainer } from './SwipeContainer'

interface AppLayoutProps {
  children: React.ReactNode
  noScroll?: boolean
  noPad?: boolean
  className?: string
}

export function AppLayout({ children, noScroll, noPad, className }: AppLayoutProps) {
  return (
    <SwipeContainer
      className="bg-app"
      style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <DesktopHeader />

      <main
        className={['mx-auto w-full max-w-[1120px] lg:pt-16', className ?? ''].join(' ')}
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {noScroll ? (
          <div
            className={noPad ? '' : 'px-4 md:px-6'}
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {children}
          </div>
        ) : (
          <div
            className={noPad ? '' : 'px-4 md:px-8 lg:px-10'}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom, 0px)) + 94px)',
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
