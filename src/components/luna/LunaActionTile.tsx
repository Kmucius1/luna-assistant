import Link from 'next/link'
import { LunaCard } from './LunaCard'

interface LunaActionTileProps {
  icon: React.ReactNode
  label: string
  sublabel?: string
  href?: string
  onClick?: () => void
  className?: string
}

/** Low-height glass pill/card — quick-action buttons (Dictate, Brain Dump, Plan My Day, New Task, etc). */
export function LunaActionTile({ icon, label, sublabel, href, onClick, className }: LunaActionTileProps) {
  const body = (
    <LunaCard variant="action" onClick={onClick} className={className}>
      <span style={{ color: 'var(--luna-purple-2)', display: 'flex', alignItems: 'center' }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--luna-text)', margin: 0, lineHeight: 1.2 }}>{label}</p>
        {sublabel && <p style={{ fontSize: 10.5, color: 'var(--luna-dim)', margin: 0, lineHeight: 1.2 }}>{sublabel}</p>}
      </div>
    </LunaCard>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{body}</Link> : body
}
