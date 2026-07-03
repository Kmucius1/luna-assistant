import { AppLayout } from '@/components/layout/AppLayout'
import { LunaBackground } from './LunaBackground'

interface LunaShellProps {
  children: React.ReactNode
  noScroll?: boolean
  noPad?: boolean
  className?: string
  /** Hub/list pages get the 1440px cap instead of AppLayout's default 1120px */
  wide?: boolean
}

/**
 * Canonical page shell. Thin wrapper around the existing, proven AppLayout
 * (57 of 61 pages already use it) — adds the ambient LunaBackground layer.
 * Does not reimplement swipe/dock/header logic.
 */
export function LunaShell({ children, noScroll, noPad, className, wide }: LunaShellProps) {
  return (
    <>
      <LunaBackground />
      <AppLayout noScroll={noScroll} noPad={noPad} wide={wide} className={className}>
        {children}
      </AppLayout>
    </>
  )
}
