import { cn } from '@/lib/utils'

interface LunaPageFrameProps {
  children: React.ReactNode
  className?: string
  /** Narrow detail pages (Profile, forms) use 1120px instead of 1440px */
  narrow?: boolean
}

/**
 * Centered max-width container. Use standalone inside pages that render
 * their own chrome (e.g. pre-LunaShell composition) but still want the
 * locked content width.
 */
export function LunaPageFrame({ children, className, narrow }: LunaPageFrameProps) {
  return (
    <div className={cn(narrow ? 'luna-page-container-narrow' : 'luna-page-container', 'px-6 md:px-8 lg:px-10', className)}>
      {children}
    </div>
  )
}
