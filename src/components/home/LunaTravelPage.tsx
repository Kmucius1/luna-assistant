'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Globe2, Heart, Briefcase, Bookmark, MoreHorizontal, ArrowRight,
  Calendar, MapPin, Clock,
} from 'lucide-react'

import styles from '../../app/travel/travel.module.css'
import type { Destination } from '@/lib/travel/destinations'

interface Trip { id: string; destination_name: string; status: string; start_date: string | null; end_date: string | null; trip_type: string | null; cover_image_path: string | null }
interface SavedPlace { id: string; name: string; city: string | null; reason_saved: string | null; image_url: string | null }
interface Recommendation { destination: Destination; score: number; factors: Array<{ label: string; reason: string }> }

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
}

export function LunaTravelPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [topMatch, setTopMatch] = useState<Recommendation | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([])

  useEffect(() => {
    fetch('/api/travel/recommendations').then(r => r.json()).then(d => setTopMatch(d.recommendations?.[0] ?? null)).catch(() => {})
    fetch('/api/travel/trips').then(r => r.json()).then(d => setTrips(d.trips ?? [])).catch(() => {})
    fetch('/api/travel/saved-places').then(r => r.json()).then(d => setSavedPlaces((d.places ?? []).slice(0, 5))).catch(() => {})
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/travel/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.heroWrap}>
        <div className={styles.heroPhoto}><Image src="/images/rooms/travel-hero.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority /></div>
        <div className={styles.heroFade} />
        <div className={styles.heroContent}>
          <h1>Travel</h1>
          <p>Explore places that align with your energy and goals.</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className={styles.searchBar}>
        <Search size={16} color="#8A8098" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cities, countries, or vibes" />
      </form>

      <div className={styles.quickActions}>
        <Link href="/travel/astrocartography" className={styles.quickAction}><div className={styles.quickActionIcon}><Globe2 size={17} /></div><strong>Astro Map</strong><span>Where to go</span></Link>
        <Link href="/travel/best-for-you" className={styles.quickAction}><div className={styles.quickActionIcon}><Heart size={17} /></div><strong>Best For You</strong><span>Personal picks</span></Link>
        <Link href="/travel/plan" className={styles.quickAction}><div className={styles.quickActionIcon}><Briefcase size={17} /></div><strong>Plan a Trip</strong><span>Itinerary builder</span></Link>
        <Link href="/travel/saved" className={styles.quickAction}><div className={styles.quickActionIcon}><Bookmark size={17} /></div><strong>Saved Places</strong><span>Your list</span></Link>
        <Link href="/travel/more" className={styles.quickAction}><div className={styles.quickActionIcon}><MoreHorizontal size={17} /></div><strong>More</strong><span>Travel tools</span></Link>
      </div>

      {topMatch && (
        <div className={styles.matchCard}>
          <div className={styles.matchImage}>
            <Image src={topMatch.destination.image} alt={topMatch.destination.name} fill sizes="200px" />
            <div className={styles.matchScoreBadge}><strong>{topMatch.score}%</strong><span>Match</span></div>
          </div>
          <div className={styles.matchBody}>
            <div className={styles.matchLabel}>Best Energy Match</div>
            <h3 className={styles.matchName}>{topMatch.destination.name}, {topMatch.destination.country}</h3>
            <span className={styles.matchTag}>{topMatch.destination.best_for[0]}</span>
            <p className={styles.matchDesc}>{topMatch.destination.short_description}</p>
            <Link href={`/travel/destination/${topMatch.destination.id}`} className={styles.matchLink}>View Full Reading <ArrowRight size={12} /></Link>
          </div>
        </div>
      )}

      <div>
        <div className={styles.sectionHeader}><h2>Upcoming &amp; Suggested Trips</h2><Link href="/travel/trips">View all</Link></div>
        <div className={styles.tripRow} style={{ marginTop: 8 }}>
          {trips.length === 0 ? (
            <div className={styles.emptyState} style={{ width: '100%' }}>
              <p>Your next chapter has not been planned yet.</p>
              <Link href="/travel/plan">Plan a Trip</Link>
            </div>
          ) : trips.map(trip => (
            <Link key={trip.id} href={`/travel/trip/${trip.id}`} className={styles.tripCard}>
              <div className={styles.tripCardImage}>
                <Image src={trip.cover_image_path || '/images/rooms/travel-hero.jpg'} alt={trip.destination_name} fill sizes="168px" />
                <span className={styles.tripCardStatus}>{trip.start_date ? `In ${Math.max(0, daysUntil(trip.start_date))} days` : trip.status === 'idea' ? 'Suggested' : trip.status}</span>
              </div>
              <div className={styles.tripCardBody}>
                <strong>{trip.destination_name}</strong>
                {trip.start_date && <div className={styles.tripCardMeta}><Calendar size={11} /> {new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionHeader}><h2>Saved Places</h2><Link href="/travel/saved">View all</Link></div>
        <div className={styles.placeRow} style={{ marginTop: 8 }}>
          {savedPlaces.length === 0 ? (
            <div className={styles.emptyState} style={{ width: '100%' }}>
              <p>Places that catch your attention will live here.</p>
              <Link href="/travel/search">Explore Destinations</Link>
            </div>
          ) : savedPlaces.map(place => (
            <Link key={place.id} href="/travel/saved" className={styles.placeCard}>
              <div className={styles.placeCardImage}>
                <Image src={place.image_url || '/images/rooms/travel-hero.jpg'} alt={place.name} fill sizes="96px" />
                <div className={styles.placeBookmark}><Bookmark size={11} fill="currentColor" /></div>
              </div>
              <strong>{place.name}</strong>
              {place.reason_saved && <span>{place.reason_saved}</span>}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionHeader}><h2>Travel Tools &amp; Guidance</h2></div>
        <div className={styles.toolsGrid} style={{ marginTop: 8 }}>
          <Link href="/travel/astrocartography" className={styles.toolCard}>
            <div className={styles.toolIcon}><Globe2 size={16} /></div>
            <strong>Astrocartography Map</strong>
            <p>See your planetary lines around the world.</p>
            <span className={styles.toolLink}>Open Map →</span>
          </Link>
          <Link href="/travel/more" className={styles.toolCard}>
            <div className={styles.toolIcon}><MapPin size={16} /></div>
            <strong>Relocation Analyzer</strong>
            <p>Compare places to live, work, or visit.</p>
            <span className={styles.toolLink}>Compare Places →</span>
          </Link>
          <Link href="/travel/more" className={styles.toolCard}>
            <div className={styles.toolIcon}><Clock size={16} /></div>
            <strong>Travel Timing</strong>
            <p>Best times to travel based on your schedule.</p>
            <span className={styles.toolLink}>View Calendar →</span>
          </Link>
          <Link href="/travel/more" className={styles.toolCard}>
            <div className={styles.toolIcon}><Briefcase size={16} /></div>
            <strong>Packing Guide</strong>
            <p>Custom packing list for your destination.</p>
            <span className={styles.toolLink}>View Checklist →</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
