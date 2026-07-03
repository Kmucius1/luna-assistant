import Link from 'next/link'
import { LunaCard } from './LunaCard'

interface LunaPreviewTileProps {
  label: string
  icon?: React.ReactNode
  href?: string
  linkText?: string
  children: React.ReactNode
  className?: string
}

/** Compact preview tile — short summaries with one action link (Astrology/Style/Money/Night previews, Explore summaries). */
export function LunaPreviewTile({ label, icon, href, linkText, children, className }: LunaPreviewTileProps) {
  const body = (
    <LunaCard variant="preview" className={className}>
      <div className="luna-section-label flex items-center gap-1.5 mb-2">
        {icon}{label}
      </div>
      {children}
      {href && linkText && (
        <span className="text-xs font-semibold mt-1.5 inline-block" style={{ color: 'var(--luna-purple-2)' }}>
          {linkText} →
        </span>
      )}
    </LunaCard>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none', display: 'flex' }}>{body}</Link> : body
}
