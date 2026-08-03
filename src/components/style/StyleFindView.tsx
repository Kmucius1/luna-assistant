'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Search, ShirtIcon } from 'lucide-react'

import { FindSimilarSheet } from './FindSimilarSheet'
import styles from './StyleViews.module.css'

export function StyleFindView() {
  const [findSimilarOpen, setFindSimilarOpen] = useState(false)

  return (
    <>
      <div className={styles.sectionHeader}><Search size={13} /> Find Clothes</div>
      <div className={styles.findGrid}>
        <Link href="/style/find/week" className={styles.findCard}>
          <Calendar size={22} strokeWidth={1.6} />
          <div className={styles.findCardText}>
            <strong>Plan My Looks</strong>
            <span>Build outfits for your whole week</span>
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
        <button type="button" className={styles.findCard} onClick={() => setFindSimilarOpen(true)}>
          <Search size={22} strokeWidth={1.6} />
          <div className={styles.findCardText}>
            <strong>Find Similar</strong>
            <span>Build an outfit around a piece you own</span>
          </div>
        </button>
      </div>

      <FindSimilarSheet isOpen={findSimilarOpen} onClose={() => setFindSimilarOpen(false)} />
    </>
  )
}
