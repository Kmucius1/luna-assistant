'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Sparkles, Sun, Wallet, Bookmark, X, Globe2 } from 'lucide-react'
import { TravelSubHeader } from './TravelSubHeader'
import pageStyles from '../../app/travel/travel.module.css'
import styles from './DestinationDetail.module.css'
import type { Destination } from '@/lib/travel/destinations'

interface WeatherData { current_temp_f: number | null; daily: Array<{ date: string; high_f: number; low_f: number }>; source: string }
interface AstroReading { body: string; type: string; description: string; distanceDeg: number }

export function DestinationDetail({ id }: { id: string }) {
  const router = useRouter()
  const [dest, setDest] = useState<Destination | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [astro, setAstro] = useState<AstroReading[] | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/travel/destinations?id=${id}`).then(r => r.json()).then(d => {
      setDest(d.destination ?? null)
      if (d.destination) {
        fetch(`/api/travel/weather?lat=${d.destination.lat}&lon=${d.destination.lon}`).then(r => r.json()).then(setWeather).catch(() => {})
        fetch(`/api/travel/astrocartography?lat=${d.destination.lat}&lon=${d.destination.lon}`).then(r => r.json()).then(a => setAstro(a.nearby ?? [])).catch(() => {})
      }
    })
  }, [id])

  async function savePlace() {
    if (!dest) return
    await fetch('/api/travel/saved-places', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dest.name, city: dest.name, country: dest.country, category: 'city', external_place_id: dest.id, image_url: dest.image, source: 'search' }),
    })
    setSaved(true)
  }

  async function notForMe() {
    if (!dest) return
    await fetch('/api/travel/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinationId: dest.id, status: 'rejected' }) })
    router.push('/travel')
  }

  if (!dest) return <div className={pageStyles.page}><TravelSubHeader title="Destination" /><p style={{ textAlign: 'center', fontSize: 12, color: 'var(--travel-muted)' }}>Loading…</p></div>

  return (
    <div className={pageStyles.page}>
      <TravelSubHeader title={dest.name} />

      <div className={styles.hero}><Image src={dest.image} alt={dest.name} fill sizes="(max-width: 640px) 100vw, 640px" priority /></div>

      <div className={styles.card}>
        <h2 style={{ fontFamily: 'var(--font-display-var, serif)', fontSize: 20, color: 'var(--travel-text)', margin: '0 0 6px' }}>{dest.name}, {dest.country}</h2>
        <p style={{ fontSize: 12.5, color: 'var(--travel-muted)', lineHeight: 1.5, margin: 0 }}>{dest.short_description}</p>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}><span>Best Season</span><strong>{dest.best_season.split(' ')[0]}</strong></div>
        <div className={styles.statCard}><span>Trip Length</span><strong>{dest.typical_trip_length_days[0]}-{dest.typical_trip_length_days[1]} days</strong></div>
        <div className={styles.statCard}><span>Budget</span><strong style={{ textTransform: 'capitalize' }}>{dest.budget_tier}</strong></div>
      </div>

      {weather && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}><Sun size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> Weather Now</div>
          <p style={{ fontSize: 13, color: 'var(--travel-text)', margin: 0 }}>{weather.current_temp_f != null ? `${Math.round(weather.current_temp_f)}°F right now` : 'Unavailable'}</p>
          <p style={{ fontSize: 10, color: 'var(--travel-muted)', margin: '4px 0 0' }}>Source: {weather.source} · {new Date().toLocaleDateString()}</p>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.sectionLabel}>Neighborhoods</div>
        {dest.neighborhoods.map(n => (
          <p key={n.name} style={{ fontSize: 12, color: 'var(--travel-text)', margin: '0 0 6px' }}><strong>{n.name}</strong> — <span style={{ color: 'var(--travel-muted)' }}>{n.vibe}</span></p>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionLabel}>Food</div>
        <p style={{ fontSize: 12.5, color: 'var(--travel-text)', margin: '0 0 12px', lineHeight: 1.4 }}>{dest.food_highlights}</p>
        <div className={styles.sectionLabel}>Culture</div>
        <p style={{ fontSize: 12.5, color: 'var(--travel-text)', margin: '0 0 12px', lineHeight: 1.4 }}>{dest.culture_notes}</p>
        <div className={styles.sectionLabel}>Nature</div>
        <p style={{ fontSize: 12.5, color: 'var(--travel-text)', margin: '0 0 12px', lineHeight: 1.4 }}>{dest.nature_notes}</p>
        <div className={styles.sectionLabel}>Getting Around</div>
        <p style={{ fontSize: 12.5, color: 'var(--travel-text)', margin: 0, lineHeight: 1.4 }}>{dest.transportation_notes}</p>
      </div>

      {astro && astro.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionLabel}><Globe2 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> Astrocartography Reading</div>
          {astro.map((a, i) => <div key={i} className={styles.astroRow}><Sparkles size={13} style={{ color: 'var(--travel-gold)', flexShrink: 0, marginTop: 1 }} /><span>Your {a.body} {a.type} line passes near here. {a.description}</span></div>)}
          <p style={{ fontSize: 10, color: 'var(--travel-muted)', margin: '8px 0 0', fontStyle: 'italic' }}>Astrology describes possible themes, not guarantees — birth time is approximate, so AC/DC lines carry more uncertainty than MC/IC.</p>
        </div>
      )}

      <div className={styles.actionRow}>
        <button type="button" onClick={notForMe} className={styles.actionButton}><X size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} /> Not For Me</button>
        <button type="button" onClick={savePlace} className={styles.actionButton} style={saved ? { color: 'var(--travel-gold)', borderColor: 'var(--travel-gold)' } : {}}><Bookmark size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} /> {saved ? 'Saved' : 'Save'}</button>
        <button type="button" onClick={() => router.push(`/travel/plan?destination=${dest.id}`)} className={`${styles.actionButton} ${styles.actionButtonPrimary}`}><Wallet size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} /> Add to Trip</button>
      </div>
    </div>
  )
}
