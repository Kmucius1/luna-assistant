import { DesktopHeader } from '@/components/layout/DesktopHeader'
import { MobileTopBar } from '@/components/layout/MobileTopBar'

/**
 * Responsive top bar — desktop fixed header + mobile in-flow bar.
 * Thin composition of the two existing, already-reference-close components;
 * neither is reimplemented here.
 */
export function LunaTopBar() {
  return (
    <>
      <DesktopHeader />
      <div className="lg:hidden" style={{ flexShrink: 0 }}>
        <MobileTopBar />
      </div>
    </>
  )
}
