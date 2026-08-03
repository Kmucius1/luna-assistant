'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Archive } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { ReadingJSON } from '@/lib/luna/readingGenerator'
import styles from './saved-readings.module.css'

interface StoredReadingSlim {
  reading_date: string
  reading_json: ReadingJSON
  generated_at: string
}

function formatDateLabel(dateKey: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(dateKey + 'T12:00:00'))
}

export default function SavedReadingsArchive() {
  const [readings, setReadings] = useState<StoredReadingSlim[] | null>(null)
  const [active, setActive] = useState<StoredReadingSlim | null>(null)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/luna/daily-readings/history?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(d => setReadings(d.readings ?? []))
      .catch(() => setReadings([]))
  }, [])

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/astrology/more" className={styles.backButton} aria-label="Back"><ArrowLeft size={16} /></Link>
          <h1>Saved Readings</h1>
        </div>

        {readings === null && (
          <div className={styles.shimmerRow}>
            {[1, 2, 3, 4].map(i => <div key={i} className={styles.shimmer} />)}
          </div>
        )}

        {readings !== null && readings.length === 0 && (
          <div className={styles.emptyState}>
            <Archive size={28} />
            <p>No readings saved yet.</p>
          </div>
        )}

        {readings !== null && readings.length > 0 && (
          <div className={styles.list}>
            {readings.map(r => (
              <button key={r.reading_date} type="button" onClick={() => setActive(r)} className={styles.card}>
                <p className={styles.cardDate}>{formatDateLabel(r.reading_date)}</p>
                <p className={styles.cardTitle}>{r.reading_json.title}</p>
                <p className={styles.cardMeta}>
                  ☀️ {r.reading_json.cosmic_weather.sun_sign} · 🌙 {r.reading_json.cosmic_weather.moon_sign} · {r.reading_json.cosmic_weather.moon_phase}
                </p>
              </button>
            ))}
          </div>
        )}

        <BottomSheet
          isOpen={!!active}
          onClose={() => setActive(null)}
          title={active ? formatDateLabel(active.reading_date) : undefined}
          subtitle={active?.reading_json.title}
        >
          {active && (
            <div className={styles.detail}>
              <p className={styles.detailTheme}>{active.reading_json.main_theme}</p>

              <div>
                <p className={styles.detailLabel}>Love</p>
                <p className={styles.detailBody}>{active.reading_json.personal_alignment.relationship_theme}</p>
              </div>
              <div>
                <p className={styles.detailLabel}>Work</p>
                <p className={styles.detailBody}>{active.reading_json.personal_alignment.career_theme}</p>
              </div>
              <div>
                <p className={styles.detailLabel}>Energy</p>
                <p className={styles.detailBody}>{active.reading_json.personal_alignment.energy_theme}</p>
              </div>
              <div>
                <p className={styles.detailLabel}>Luna&apos;s Message</p>
                <p className={styles.detailBody} style={{ fontStyle: 'italic' }}>{active.reading_json.luna_message}</p>
              </div>
              <div>
                <p className={styles.detailLabel}>Affirmation</p>
                <p className={styles.detailAffirmation}>{active.reading_json.guidance.affirmation}</p>
              </div>
            </div>
          )}
        </BottomSheet>
      </div>
    </AppLayout>
  )
}
