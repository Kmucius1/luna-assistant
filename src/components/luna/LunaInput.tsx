'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface LunaInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const LunaInput = forwardRef<HTMLInputElement, LunaInputProps>(
  ({ label, error, className, ...rest }, ref) => (
    <div className="w-full">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest block mb-2" style={{ color: 'var(--luna-dim)', letterSpacing: '0.08em' }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn('w-full px-4 py-3 rounded-2xl text-sm outline-none transition-all', className)}
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--luna-border)', color: 'var(--luna-text)' }}
        {...rest}
      />
      {error && <p className="text-xs mt-1" style={{ color: '#FF8A8A' }}>{error}</p>}
    </div>
  )
)
LunaInput.displayName = 'LunaInput'
