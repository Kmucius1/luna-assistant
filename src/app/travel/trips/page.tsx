'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { TravelSubHeader } from '@/components/travel/TravelSubHeader'
import styles from '../travel.module.css'

interface Trip { id: string; title: string; destination_name: string; status: string; start_date: string | null; end_date: string | null; cover_image_path: string | null }

export default function AllTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  useEffect(() => { fetch('/api/travel/trips').then(r => r.json()).then(d => setTrips(d.trips ?? [])) }, [])

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <TravelSubHeader title="All Trips" />
        {trips.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Your next chapter has not been planned yet.</p>
            <Link href="/travel/plan">Plan a Trip</Link>
          </div>
        ) : trips.map(trip => (
          <Link key={trip.id} href={`/travel/trip/${trip.id}`} style={{ display: 'flex', gap: 10, textDecoration: 'none', background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 16, boxShadow: 'var(--travel-shadow)', padding: 10, marginBottom: 8 }}>
            <div style={{ position: 'relative', width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}><Image src={trip.cover_image_path || '/images/rooms/travel-hero.jpg'} alt={trip.destination_name} fill sizes="72px" style={{ objectFit: 'cover' }} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 14, color: 'var(--travel-text)' }}>{trip.title}</strong>
              <span style={{ fontSize: 11, color: 'var(--travel-muted)' }}>{trip.destination_name} · <span style={{ textTransform: 'capitalize' }}>{trip.status}</span></span>
              {trip.start_date && <div style={{ fontSize: 10.5, color: 'var(--travel-muted)', marginTop: 2 }}>{new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  )
}
