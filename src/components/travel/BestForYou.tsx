'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, X, Bookmark } from 'lucide-react'
import { TravelSubHeader } from './TravelSubHeader'
import styles from '../../app/travel/travel.module.css'
import type { Destination } from '@/lib/travel/destinations'

interface Rec { destination: Destination; score: number; factors: Array<{ label: string; reason: string; points: number; maxPoints: number }> }

const FILTERS = ['all', 'beach', 'city', 'nature', 'creative', 'wellness', 'food', 'affordable', 'luxury', 'solo', 'romance']

export function BestForYou() {
  const [recs, setRecs] = useState<Rec[]>([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  function load(f: string) {
    setLoading(true)
    fetch(`/api/travel/recommendations?filter=${f}`).then(r => r.json()).then(d => setRecs(d.recommendations ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load(filter) }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function react(id: string, status: 'liked' | 'rejected') {
    await fetch('/api/travel/recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ destinationId: id, status }) })
    load(filter)
  }

  return (
    <div className={styles.page}>
      <TravelSubHeader title="Best For You" />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTERS.map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize', border: f === filter ? '1px solid var(--travel-gold)' : '1px solid var(--travel-border)', background: f === filter ? 'var(--travel-gold-soft)' : 'var(--travel-card)', color: f === filter ? 'var(--travel-text)' : 'var(--travel-muted)' }}>{f}</button>
        ))}
      </div>

      {loading ? <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--travel-muted)' }}>Finding your matches…</p> : recs.length === 0 ? (
        <div className={styles.emptyState}><p>Luna needs a little more information to find places that fit you.</p></div>
      ) : recs.map(rec => (
        <div key={rec.destination.id} style={{ background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 18, boxShadow: 'var(--travel-shadow)', overflow: 'hidden', marginBottom: 12 }}>
          <Link href={`/travel/destination/${rec.destination.id}`} style={{ position: 'relative', display: 'block', aspectRatio: '16/9' }}>
            <Image src={rec.destination.image} alt={rec.destination.name} fill sizes="(max-width: 640px) 100vw, 640px" style={{ objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: 'var(--travel-text)' }}>{rec.score}%</div>
          </Link>
          <div style={{ padding: 12 }}>
            <strong style={{ fontSize: 15, color: 'var(--travel-text)', fontFamily: 'var(--font-display-var, serif)' }}>{rec.destination.name}, {rec.destination.country}</strong>
            <p style={{ fontSize: 11.5, color: 'var(--travel-muted)', margin: '4px 0 8px', lineHeight: 1.4 }}>{rec.destination.short_description}</p>
            <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: 'var(--travel-muted)', marginBottom: 8 }}>
              <span>{rec.destination.best_season.split(' ')[0]}</span>
              <span style={{ textTransform: 'capitalize' }}>{rec.destination.budget_tier}</span>
              <span>{rec.destination.typical_trip_length_days[0]}-{rec.destination.typical_trip_length_days[1]} days</span>
            </div>
            <button type="button" onClick={() => setExpanded(expanded === rec.destination.id ? null : rec.destination.id)} style={{ background: 'none', border: 'none', fontSize: 10.5, fontWeight: 700, color: 'var(--travel-gold)', padding: 0, marginBottom: 8 }}>
              {expanded === rec.destination.id ? 'Hide why' : 'Why this match?'}
            </button>
            {expanded === rec.destination.id && (
              <div style={{ marginBottom: 8 }}>
                {rec.factors.map(f => <p key={f.label} style={{ fontSize: 10.5, color: 'var(--travel-text)', margin: '2px 0' }}>{f.label}: {f.points}/{f.maxPoints} — {f.reason}</p>)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={() => react(rec.destination.id, 'rejected')} style={{ flex: 1, minHeight: 38, borderRadius: 12, border: '1px solid var(--travel-border)', background: 'var(--travel-card)', color: 'var(--travel-muted)' }}><X size={14} /></button>
              <button type="button" onClick={() => react(rec.destination.id, 'liked')} style={{ flex: 1, minHeight: 38, borderRadius: 12, border: '1px solid var(--travel-border)', background: 'var(--travel-card)', color: 'var(--travel-gold)' }}><Heart size={14} /></button>
              <button type="button" style={{ flex: 2, minHeight: 38, borderRadius: 12, border: 'none', background: 'var(--travel-gold)', color: '#fff', fontSize: 11.5, fontWeight: 700 }}><Bookmark size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} /> Save</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
