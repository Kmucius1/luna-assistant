'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Calendar, RefreshCw } from 'lucide-react'

import { useLocation } from '@/hooks/useLocation'
import styles from './StyleViews.module.css'

interface WeekDayPlan {
  date: string
  day_name: string
  occasion: string
  why: string
  outfit_caption: string
  image_url: string
  high_f: number | null
  low_f: number | null
  weather_text: string | null
}

export function StyleWeekView() {
  const location = useLocation()
  const [days, setDays] = useState<WeekDayPlan[] | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  const load = useCallback((force = false) => {
    if (force) setRegenerating(true)
    const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    if (location.lat != null && location.lon != null) {
      params.set('lat', String(location.lat))
      params.set('lon', String(location.lon))
    }
    if (force) params.set('force', 'true')
    fetch(`/api/atelier/weekly-outfit-plan?${params}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setDays(data?.days ?? []))
      .catch(() => setDays([]))
      .finally(() => setRegenerating(false))
  }, [location.lat, location.lon])

  useEffect(() => {
    if (location.permitted === null) return
    load()
  }, [location.permitted, load])

  return (
    <>
      <div className={styles.weekHeader}>
        <div className={styles.sectionHeader}><Calendar size={13} /> This Week&apos;s Outfits</div>
        <button type="button" className={styles.weekRegenerate} onClick={() => load(true)} disabled={regenerating || days === null}>
          <RefreshCw size={12} className={regenerating ? styles.weekSpinning : undefined} /> {regenerating ? 'Replanning…' : 'Regenerate'}
        </button>
      </div>
      <p className={styles.weekIntro}>A real pick for each of the next 7 days, built from that day&apos;s weather and what&apos;s on your calendar.</p>

      {days === null ? (
        <div className={styles.emptyState}><p>Building your week…</p></div>
      ) : days.length === 0 ? (
        <div className={styles.emptyState}><p>Couldn&apos;t build this week&apos;s outfits — check your connection and try again.</p></div>
      ) : (
        <div className={styles.weekList}>
          {days.map(day => (
            <div key={day.date} className={styles.weekCard}>
              <div className={styles.weekThumb}>
                <Image src={day.image_url} alt={day.outfit_caption} fill sizes="56px" />
              </div>
              <div className={styles.weekBody}>
                <div className={styles.weekDayRow}>
                  <span className={styles.weekDayName}>{day.day_name}</span>
                  <span className={styles.weekDate}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                {day.high_f != null && (
                  <span className={styles.weekWeather}>{day.low_f}&ndash;{day.high_f}&deg;F, {day.weather_text}</span>
                )}
                <span className={styles.weekOccasion}>{day.occasion}</span>
                <span className={styles.weekCaption}>{day.outfit_caption}</span>
                <span className={styles.weekWhy}>{day.why}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
