'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Calendar, Moon, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'
import { AstrologyHero } from './AstrologyHero'
import { plainAspectPhrase } from '@/lib/astrology'
import styles from './AstrologyTiming.module.css'

interface TransitAspect {
  transiting: string; natal: string; type: string; orb: number; applying: boolean; interpretation: string
}
interface WeekPreview { bestDay: string; bestDayReason: string; challengingDay: string; challengingDayReason: string }
interface TransitData { aspects: TransitAspect[]; week_preview?: WeekPreview }

const STATUS_LABEL: Record<string, string> = { conjunction: 'Exact', square: 'Challenging', opposition: 'Mixed', trine: 'Supportive', sextile: 'Supportive' }

const ADVANCED_SOON = ['Solar Return', 'Saturn Return', 'Progressions', 'Annual Profections', 'Zodiacal Releasing', 'Electional Astrology']

export function AstrologyTiming() {
  const [transits, setTransits] = useState<TransitData | null>(null)

  useEffect(() => {
    fetch('/api/astrology/transits').then(r => r.json()).then(setTransits).catch(() => {})
  }, [])

  return (
    <>
      <AstrologyHero image="/images/astrology/timing.jpg" label="Timing" title="What the Sky Favors Now" subtitle="Transits, retrogrades, and the moments worth planning around." />

      {transits?.week_preview && (
        <div className={styles.weekGlanceCard}>
          <div className={styles.sectionHeader} style={{ margin: '0 0 10px' }}>This Week At A Glance</div>
          <div className={styles.weekGlanceRow}>
            <span className={`${styles.weekGlanceBadge} ${styles.weekGlanceBadgeBest}`}><TrendingUp size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />{transits.week_preview.bestDay}</span>
            <p className={styles.weekGlanceText}>Your best day to move things forward. {transits.week_preview.bestDayReason}</p>
          </div>
          <div className={styles.weekGlanceRow}>
            <span className={`${styles.weekGlanceBadge} ${styles.weekGlanceBadgeTough}`}><TrendingDown size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />{transits.week_preview.challengingDay}</span>
            <p className={styles.weekGlanceText}>Your trickiest day — good to plan lighter or be more patient with yourself. {transits.week_preview.challengingDayReason}</p>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader}>Transit Timeline — This Week</div>
      {!transits && <p style={{ fontSize: 12, color: 'var(--astro-muted)', textAlign: 'center', padding: 20 }}>Reading the sky…</p>}
      {transits?.aspects.slice(0, 6).map(a => (
        <div key={`${a.transiting}-${a.natal}`} className={styles.timelineRow}>
          <div className={styles.timelineHeader}>
            <span className={styles.timelineTitle}>{a.transiting} is {plainAspectPhrase(a.type)} your {a.natal}</span>
            <span className={styles.timelinePill}>{STATUS_LABEL[a.type] ?? a.type}</span>
          </div>
          <p className={styles.timelineMeta}>
            {a.applying ? 'Still building — this is getting stronger over the next few days' : 'Easing off — this has already passed its peak'} · {a.orb < 2 ? 'very strong right now' : a.orb < 5 ? 'strongly felt' : 'present in the background'} — {a.interpretation}
          </p>
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
        <span><Moon size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Moon</span>
        <ChevronRight size={16} />
      </Link>
      <Link href="/astrology/retrogrades" className={styles.linkCard}>
        <span><RotateCcw size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} /> Retrogrades</span>
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
