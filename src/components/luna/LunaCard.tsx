import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'

type LunaCardVariant = 'hero' | 'glass' | 'preview' | 'action' | 'icon'

interface LunaCardProps {
  children: React.ReactNode
  className?: string
  variant?: LunaCardVariant
  onClick?: () => void
  as?: 'div' | 'button' | 'a'
  /** hero variant only — bounded background image (never full-page) */
  backgroundImage?: string
}

/**
 * The 5 required card variants, built on the locked LUNA tokens.
 * `glass` delegates to the existing GlassCard (variant="locked") rather than
 * duplicating its CSS, so there's one glass-card implementation, not two.
 */
export function LunaCard({ children, className, variant = 'glass', onClick, as, backgroundImage }: LunaCardProps) {
  if (variant === 'glass') {
    return (
      <GlassCard variant="locked" className={className} onClick={onClick} as={as}>
        {children}
      </GlassCard>
    )
  }

  if (variant === 'hero') {
    return (
      <div
        onClick={onClick}
        className={cn('luna-hero-card relative p-6', className)}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      >
        {backgroundImage && (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'linear-gradient(100deg, rgba(10,4,28,0.72) 0%, rgba(10,4,28,0.28) 60%, rgba(10,4,28,0.10) 100%)' }}
          />
        )}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  if (variant === 'preview') {
    return (
      <div onClick={onClick} className={cn('luna-glass-card p-4', className)}>
        {children}
      </div>
    )
  }

  if (variant === 'action') {
    return (
      <div
        onClick={onClick}
        className={cn(className)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          borderRadius: 18,
          background: 'var(--luna-panel)',
          border: '1px solid var(--luna-border-soft)',
          cursor: onClick ? 'pointer' : undefined,
        }}
      >
        {children}
      </div>
    )
  }

  // icon — Explore-only app icon tile (just the square icon box; caller places the label)
  return (
    <div
      onClick={onClick}
      className={cn(className)}
      style={{
        width: 56, height: 56, borderRadius: 18,
        background: 'linear-gradient(145deg, rgba(92,69,48,0.20), rgba(17,12,42,0.65))',
        border: '1px solid var(--luna-border-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {children}
    </div>
  )
}
