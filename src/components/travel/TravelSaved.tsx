'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { TravelSubHeader } from './TravelSubHeader'
import styles from '../../app/travel/travel.module.css'

interface SavedPlace { id: string; name: string; city: string | null; country: string | null; reason_saved: string | null; image_url: string | null; list_name: string; external_place_id: string | null }

export function TravelSaved() {
  const [places, setPlaces] = useState<SavedPlace[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    fetch('/api/travel/saved-places').then(r => r.json()).then(d => setPlaces(d.places ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  async function remove(id: string) {
    await fetch('/api/travel/saved-places', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  return (
    <div className={styles.page}>
      <TravelSubHeader title="Saved Places" />
      {loading ? <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--travel-muted)' }}>Loading…</p> : places.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Places that catch your attention will live here.</p>
          <Link href="/travel/search">Explore Destinations</Link>
        </div>
      ) : places.map(place => (
        <div key={place.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 16, boxShadow: 'var(--travel-shadow)', padding: 10, marginBottom: 8 }}>
          {place.external_place_id ? (
            <Link href={`/travel/destination/${place.external_place_id}`} style={{ display: 'flex', gap: 10, flex: 1, textDecoration: 'none' }}>
              <div style={{ position: 'relative', width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}><Image src={place.image_url || '/images/rooms/travel-hero.jpg'} alt={place.name} fill sizes="60px" style={{ objectFit: 'cover' }} /></div>
              <div>
                <strong style={{ display: 'block', fontSize: 13, color: 'var(--travel-text)' }}>{place.name}</strong>
                {place.reason_saved && <span style={{ fontSize: 11, color: 'var(--travel-muted)' }}>{place.reason_saved}</span>}
              </div>
            </Link>
          ) : (
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: 13, color: 'var(--travel-text)' }}>{place.name}</strong>
              {place.reason_saved && <span style={{ fontSize: 11, color: 'var(--travel-muted)' }}>{place.reason_saved}</span>}
            </div>
          )}
          <button type="button" onClick={() => remove(place.id)} style={{ background: 'none', border: 'none', color: 'var(--travel-muted)', padding: 8 }}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  )
}
