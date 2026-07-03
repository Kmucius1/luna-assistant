import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  soul?: boolean
  onClick?: () => void
  as?: 'div' | 'button' | 'a'
  /** 'locked' opts into the LUNA final-theme-kit glass spec (.luna-glass-card) instead of the legacy .glass-card */
  variant?: 'legacy' | 'locked'
}

export function GlassCard({ children, className, soul, onClick, as: Tag = 'div', variant = 'legacy' }: GlassCardProps) {
  const base = variant === 'locked' ? 'luna-glass-card' : (soul ? 'soul-card' : 'glass-card')
  return (
    <Tag
      onClick={onClick}
      className={cn(base, 'p-5', className)}
    >
      {children}
    </Tag>
  )
}

export function SmallCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-card-sm p-4', className)}>
      {children}
    </div>
  )
}
