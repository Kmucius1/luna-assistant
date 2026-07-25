'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'

import type { TodayDockCategory } from '@/lib/luna/todayDock'
import styles from './TodayContextualDock.module.css'

export function TodayContextualDock({ category }: { category: TodayDockCategory }) {
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
