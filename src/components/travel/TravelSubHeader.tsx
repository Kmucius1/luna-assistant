'use client'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import styles from '../../app/travel/travel.module.css'

export function TravelSubHeader({ title, backHref = '/travel', action }: { title: string; backHref?: string; action?: React.ReactNode }) {
  return (
    <div className={styles.topRow}>
      <Link href={backHref} className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
      <h1 style={{ fontFamily: 'var(--font-display-var, serif)', fontSize: 18, fontWeight: 700, color: 'var(--travel-text)', margin: 0 }}>{title}</h1>
      {action ?? <span style={{ width: 38 }} />}
    </div>
  )
}
