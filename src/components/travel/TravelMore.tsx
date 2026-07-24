'use client'
import { useState } from 'react'
import { TravelSubHeader } from './TravelSubHeader'
import pageStyles from '../../app/travel/travel.module.css'
import { DESTINATIONS } from '@/lib/travel/destinations'

const SOON_TOOLS = ['Currency converter', 'Flight tracker', 'Travel documents', 'Emergency information', 'Language phrases', 'Visa checklist', 'Local etiquette', 'Safety contacts']

export function TravelMore() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')

  const destA = DESTINATIONS.find(d => d.id === a)
  const destB = DESTINATIONS.find(d => d.id === b)

  return (
    <div className={pageStyles.page}>
      <TravelSubHeader title="Travel Tools" />

      <div style={{ background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 18, boxShadow: 'var(--travel-shadow)', padding: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--travel-gold)', marginBottom: 10 }}>Relocation Analyzer</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={a} onChange={e => setA(e.target.value)} style={{ flex: 1, minHeight: 42, borderRadius: 12, border: '1px solid var(--travel-border)', padding: '0 10px', fontSize: 12.5 }}>
            <option value="">Choose a place…</option>
            {DESTINATIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={b} onChange={e => setB(e.target.value)} style={{ flex: 1, minHeight: 42, borderRadius: 12, border: '1px solid var(--travel-border)', padding: '0 10px', fontSize: 12.5 }}>
            <option value="">Compare to…</option>
            {DESTINATIONS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {destA && destB && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5 }}>
            {[destA, destB].map(d => (
              <div key={d.id}>
                <strong style={{ display: 'block', fontSize: 13, color: 'var(--travel-text)', marginBottom: 6 }}>{d.name}</strong>
                <p style={{ margin: '0 0 4px', color: 'var(--travel-muted)' }}>Budget: <span style={{ color: 'var(--travel-text)', textTransform: 'capitalize' }}>{d.budget_tier}</span></p>
                <p style={{ margin: '0 0 4px', color: 'var(--travel-muted)' }}>Climate: <span style={{ color: 'var(--travel-text)' }}>{d.climate_zone}</span></p>
                <p style={{ margin: '0 0 4px', color: 'var(--travel-muted)' }}>Best for: <span style={{ color: 'var(--travel-text)' }}>{d.best_for[0]}</span></p>
                <p style={{ margin: 0, color: 'var(--travel-muted)' }}>Best season: <span style={{ color: 'var(--travel-text)' }}>{d.best_season}</span></p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 18, boxShadow: 'var(--travel-shadow)', padding: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--travel-gold)', marginBottom: 6 }}>Travel Timing</div>
        <p style={{ fontSize: 12, color: 'var(--travel-muted)', lineHeight: 1.4, margin: 0 }}>Best travel timing considers your real calendar availability, each destination&apos;s best season, and — optionally — your astrocartography. Check a destination&apos;s own page for its best season, and your Calendar room for open weeks.</p>
      </div>

      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--travel-muted)', margin: '4px 0 -4px' }}>Coming Soon</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SOON_TOOLS.map(tool => (
          <div key={tool} style={{ position: 'relative', background: 'var(--travel-surface)', border: '1px dashed var(--travel-border)', borderRadius: 14, padding: 12, fontSize: 11.5, fontWeight: 600, color: 'var(--travel-muted)', minHeight: 46 }}>
            <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: '#14110b', background: 'var(--travel-gold)', padding: '2px 6px', borderRadius: 999 }}>Soon</span>
            {tool}
          </div>
        ))}
      </div>
    </div>
  )
}
