'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Calendar, Moon } from 'lucide-react'
import styles from './AstrologyTiming.module.css'

interface TransitAspect {
  transiting: string; natal: string; type: string; orb: number; applying: boolean; interpretation: string
}
interface TransitData { aspects: TransitAspect[] }

const STATUS_LABEL: Record<string, string> = { conjunction: 'Exact', square: 'Challenging', opposition: 'Mixed', trine: 'Supportive', sextile: 'Supportive' }

const ADVANCED_SOON = ['Solar Return', 'Saturn Return', 'Progressions', 'Annual Profections', 'Zodiacal Releasing', 'Electional Astrology']

export function AstrologyTiming() {
  const [transits, setTransits] = useState<TransitData | null>(null)

  useEffect(() => {
    fetch('/api/astrology/transits').then(r => r.json()).then(setTransits).catch(() => {})
  }, [])

  return (
    <>
      <div className={styles.sectionHeader}>Transit Timeline — This Week</div>
      {!transits && <p style={{ fontSize: 12, color: '#716B63', textAlign: 'center', padding: 20 }}>Reading the sky…</p>}
      {transits?.aspects.slice(0, 6).map(a => (
        <div key={`${a.transiting}-${a.natal}`} className={styles.timelineRow}>
          <div className={styles.timelineHeader}>
            <span className={styles.timelineTitle}>{a.transiting} {a.type} natal {a.natal}</span>
            <span className={styles.timelinePill}>{STATUS_LABEL[a.type] ?? a.type}</span>
          </div>
          <p className={styles.timelineMeta}>{a.applying ? 'Applying' : 'Separating'} · {a.orb}° orb — {a.interpretation}</p>
        </div>
      ))}

      <Link href="/astrology/transits" className={styles.linkCard}>
        <span>Open Full Transit Explorer</span>
        <ChevronRight size={16} />
      </Link>
      <Link href="/astrology/forecasts" className={styles.linkCard}>
        <span><Calendar size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Weekly Forecast</span>
        <ChevronRight size={16} />
      </Link>
      <Link href="/astrology/moon" className={styles.linkCard}>
        <span><Moon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Cosmic Calendar (Moon Phases)</span>
        <ChevronRight size={16} />
      </Link>

      <div className={styles.sectionHeader} style={{ marginTop: 6 }}>Advanced Timing</div>
      <div className={styles.soonGrid}>
        {ADVANCED_SOON.map(label => (
          <div key={label} className={styles.soonCard}>
            <span className={styles.soonBadge}>Soon</span>
            {label}
          </div>
        ))}
      </div>
    </>
  )
}
