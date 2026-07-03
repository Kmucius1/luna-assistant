import Link from 'next/link'
import { LunaCard } from './LunaCard'

interface LunaAppIconTileProps {
  icon: React.ReactNode
  label: string
  href: string
}

/** Explore-only: square gradient-glass icon + label underneath. */
export function LunaAppIconTile({ icon, label, href }: LunaAppIconTileProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <LunaCard variant="icon">
        <span style={{ color: 'var(--luna-purple-2)' }}>{icon}</span>
      </LunaCard>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--luna-muted)', textAlign: 'center', margin: 0 }}>{label}</p>
    </Link>
  )
}
