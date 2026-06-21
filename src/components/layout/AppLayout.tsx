import { BottomNav } from './BottomNav'
import { DesktopHeader } from './DesktopHeader'
import { DesktopTabBar } from './DesktopTabBar'

interface AppLayoutProps {
  children: React.ReactNode
  noPad?: boolean
  className?: string
  darkDesktop?: boolean
}

export function AppLayout({ children, noPad, className, darkDesktop }: AppLayoutProps) {
  return (
    <div className={['min-h-full', darkDesktop ? 'lg:bg-[#0D0B1E]' : 'bg-sanctuary'].join(' ')}>
      {/* Desktop top header — hidden on mobile/tablet */}
      <DesktopHeader />

      {/* Main content */}
      <main className={[
        // Mobile: centered narrow column
        'max-w-lg mx-auto',
        // Desktop: full width, top padding for header
        'lg:max-w-none lg:pt-14',
        // Padding
        noPad ? '' : 'px-5 lg:px-8',
        // Bottom spacing
        'pb-nav lg:pb-[100px]',
        className ?? '',
      ].join(' ')}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
      {/* Desktop bottom tab bar */}
      <DesktopTabBar />
    </div>
  )
}
