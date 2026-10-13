'use client'
import Link from 'next/link'
import { Compass, Clapperboard, Gem, User } from 'lucide-react'
import styles from '@/app/prosperity/prosperity.module.css'

function greeting(): string {
  // Client clock on purpose: the server doesn't know Zoe's timezone.
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function ProsperityHome() {
  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>Luna Prosperity</div>
      {/* suppressHydrationWarning: the server renders in its own timezone, the
          client corrects it to Zoe's local time on hydration. */}
      <h1 className={styles.title} suppressHydrationWarning>{greeting()}, Zoe.</h1>
      <p className={styles.sub}>
        Luna finds the opportunity, explains it, helps you create it, and you approve it.
        Nothing has been connected yet, so there are no opportunities to show — only what is
        actually ready.
      </p>

      <div className={styles.grid}>
        <Link href="/prosperity/clips" className={styles.card}>
          <span className={styles.cardTitle}><Clapperboard size={20} strokeWidth={1.4} /> Clip Studio</span>
          <span className={styles.cardBody}>
            Upload a video, cut it into clips, frame it for vertical, and preview it.
          </span>
          <span className={styles.badge}>Ready</span>
        </Link>

        <div className={styles.card}>
          <span className={styles.cardTitle}><Compass size={20} strokeWidth={1.4} /> Finds</span>
          <span className={styles.cardBody}>
            Real opportunities, translated into simple instructions.
          </span>
          <span className={styles.badgeSoon}>Next phase</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardTitle}><Gem size={20} strokeWidth={1.4} /> Products</span>
          <span className={styles.cardBody}>
            Digital product ideas backed by evidence of demand.
          </span>
          <span className={styles.badgeSoon}>Later</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardTitle}><User size={20} strokeWidth={1.4} /> You</span>
          <span className={styles.cardBody}>
            Brand deals, UGC and modeling from your own inbox.
          </span>
          <span className={styles.badgeSoon}>Later</span>
        </div>
      </div>
    </div>
  )
}
