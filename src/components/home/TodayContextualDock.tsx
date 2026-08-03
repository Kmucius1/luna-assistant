'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'

import type { TodayDockCategory } from '@/lib/luna/todayDock'
import styles from './TodayContextualDock.module.css'

interface TodayContextualDockProps {
  /** Pager is open — show the active slide's real links (Gym goals, Meal plan, etc). */
  category?: TodayDockCategory
  /** Pager is collapsed (Right Now view) — a single action opens it, instead of
      the old behavior of linking straight to /plan-my-day (redundant with the
      morning-planning flow already on Home). */
  onExpand?: () => void
}

export function TodayContextualDock({ category, onExpand }: TodayContextualDockProps) {
  if (onExpand) {
    return (
      <nav className={styles.dock} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <Link href="/home" className={`${styles.dockItem} ${styles.dockItemHome}`} aria-label="Back to Home">
          <Home size={16} strokeWidth={1.8} />
          <span className={styles.dockLabel}>Home</span>
        </Link>
        <button type="button" onClick={onExpand} className={styles.dockItem}>
          <span className={styles.dockLabel}>View Full Day</span>
        </button>
      </nav>
    )
  }

  if (!category) return null
  const itemCount = category.links.length + 1

  return (
    <nav className={styles.dock} style={{ gridTemplateColumns: `repeat(${itemCount}, 1fr)` }}>
      <Link href="/home" className={`${styles.dockItem} ${styles.dockItemHome}`} aria-label="Back to Home">
        <Home size={16} strokeWidth={1.8} />
        <span className={styles.dockLabel}>Home</span>
      </Link>
      {category.links.map(link => (
        <Link key={link.href} href={link.href} className={styles.dockItem}>
          <span className={styles.dockLabel}>{link.label}</span>
        </Link>
      ))}
    </nav>
  )
}
