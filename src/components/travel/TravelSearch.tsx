'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { TravelSubHeader } from './TravelSubHeader'
import styles from '../../app/travel/travel.module.css'
import type { Destination } from '@/lib/travel/destinations'

export function TravelSearch() {
  const params = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [results, setResults] = useState<Destination[] | null>(null)
  const [loading, setLoading] = useState(false)

  function search(q: string) {
    setLoading(true)
    fetch(`/api/travel/destinations?q=${encodeURIComponent(q)}`).then(r => r.json()).then(d => setResults(d.destinations ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { if (query) search(query) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.page}>
      <TravelSubHeader title="Search" />
      <form onSubmit={e => { e.preventDefault(); search(query) }} className={styles.searchBar}>
        <Search size={16} color="#8A8098" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search cities, countries, or vibes" autoFocus />
      </form>

      {loading && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--travel-muted)' }}>Searching…</p>}
      {results && results.length === 0 && (
        <div className={styles.emptyState}>
          <p>Luna couldn&apos;t find that thought yet. Try different wording, or browse all destinations below.</p>
        </div>
      )}
      {results?.map(dest => (
        <Link key={dest.id} href={`/travel/destination/${dest.id}`} style={{ display: 'flex', gap: 10, textDecoration: 'none', background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 16, boxShadow: 'var(--travel-shadow)', padding: 10, marginBottom: 8 }}>
          <div style={{ position: 'relative', width: 84, height: 84, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}><Image src={dest.image} alt={dest.name} fill sizes="84px" style={{ objectFit: 'cover' }} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 14, color: 'var(--travel-text)' }}>{dest.name}, {dest.country}</strong>
            <p style={{ margin: '3px 0 5px', fontSize: 11, color: 'var(--travel-muted)', lineHeight: 1.35 }}>{dest.short_description}</p>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--travel-gold)' }}>{dest.best_for[0]}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
