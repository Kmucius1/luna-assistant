interface LunaSectionHeaderProps {
  icon?: React.ReactNode
  label: string
  className?: string
}

/** Small uppercase, letter-spaced, violet section label used inside cards. */
export function LunaSectionHeader({ icon, label, className }: LunaSectionHeaderProps) {
  return (
    <div className={`luna-section-label flex items-center gap-1.5 ${className ?? ''}`}>
      {icon}{label}
    </div>
  )
}
