import { cn } from '@/lib/utils'

interface LunaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text'
}

/** Only 3 button types per the locked theme: primary (violet glass fill), secondary (transparent + violet border), text (lavender link). */
export function LunaButton({ variant = 'primary', className, children, ...rest }: LunaButtonProps) {
  if (variant === 'text') {
    return (
      <button
        className={cn('inline-flex items-center gap-1 text-sm font-semibold', className)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--luna-purple-2)' }}
        {...rest}
      >
        {children}
      </button>
    )
  }

  const styles: React.CSSProperties = variant === 'secondary'
    ? { background: 'transparent', border: '1px solid var(--luna-border)', color: 'var(--luna-text)' }
    : { background: 'rgba(155,92,255,0.16)', border: '1px solid var(--luna-border)', color: 'var(--luna-text)', boxShadow: '0 0 18px rgba(155,92,255,0.18)' }

  return (
    <button
      className={cn('px-5 py-2.5 rounded-full text-sm font-semibold transition-all tap-scale', className)}
      style={styles}
      {...rest}
    >
      {children}
    </button>
  )
}
