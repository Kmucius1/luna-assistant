'use client'

import Link from 'next/link'
import { Calendar, Search, ShirtIcon } from 'lucide-react'

import styles from './StyleViews.module.css'

export function StyleFindView() {
  return (
    <>
      <div className={styles.sectionHeader}><Search size={13} /> Find Clothes</div>
      <div className={styles.findGrid}>
        <Link href="/style/find/week" className={styles.findCard}>
          <Calendar size={22} strokeWidth={1.6} />
          <div className={styles.findCardText}>
            <strong>Plan a Look</strong>
            <span>Build outfits for your week</span>
          </div>
        </Link>
        <div className={styles.findCard}>
          <span className={styles.findBadge}>Soon</span>
          <ShirtIcon size={22} strokeWidth={1.6} />
          <div className={styles.findCardText}>
            <strong>Build from Closet</strong>
            <span>Create new looks with what you already own</span>
          </div>
        </div>
        <div className={styles.findCard}>
          <span className={styles.findBadge}>Soon</span>
          <Search size={22} strokeWidth={1.6} />
          <div className={styles.findCardText}>
            <strong>Find Similar</strong>
            <span>Discover new pieces that match your taste</span>
          </div>
        </div>
      </div>
    </>
  )
}
