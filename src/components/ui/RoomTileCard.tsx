import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import styles from './RoomTileCard.module.css'

export interface RoomTileCardProps {
  href: string
  label: string
  tagline: string
  icon: LucideIcon
  /** rgba(...) tint — same convention as Home's room accents */
  accent: string
  /** Real photo, matching Home's room cards. Falls back to a gradient + icon panel when omitted. */
  image?: string
  comingSoon?: boolean
}

export function RoomTileCard({ href, label, tagline, icon: Icon, accent, image, comingSoon }: RoomTileCardProps) {
  return (
    <Link href={href} className={styles.roomCard}>
      <span className={styles.roomIconBadge} style={{ background: accent }}>
        <Icon size={16} strokeWidth={1.7} className={styles.roomIcon} />
      </span>
      <span className={styles.roomLabel}>{label}</span>
      <p className={styles.roomTagline}>{tagline}</p>
      <div className={styles.roomArt}>
        {image ? (
          <Image src={image} alt={label} fill sizes="(max-width: 640px) 45vw, 220px" className={styles.roomPhoto} />
        ) : (
          <Icon size={40} strokeWidth={1.15} />
        )}
        <span className={styles.roomGoButton}><ArrowUpRight size={13} /></span>
      </div>
      {comingSoon && <span className={styles.comingSoonBadge}>Soon</span>}
    </Link>
  )
}
