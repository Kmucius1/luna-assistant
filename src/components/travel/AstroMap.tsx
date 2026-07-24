'use client'
import { useEffect, useState } from 'react'
import { Globe2, AlertTriangle } from 'lucide-react'
import { TravelSubHeader } from './TravelSubHeader'
import styles from '../../app/travel/travel.module.css'

interface Line { body: string; type: string; points: Array<{ lat: number; lon: number }> }

const BODY_GLYPH: Record<string, string> = { Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇' }
const LINE_LABEL: Record<string, string> = { MC: 'Midheaven', IC: 'IC', AC: 'Ascendant', DC: 'Descendant' }

export function AstroMap() {
  const [lines, setLines] = useState<Line[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    fetch('/api/travel/astrocartography').then(r => r.json()).then(d => { setLines(d.lines ?? []); setNote(d.timeAccuracyNote ?? '') })
  }, [])

  const mcIc = lines.filter(l => l.type === 'MC' || l.type === 'IC')

  return (
    <div className={styles.page}>
      <TravelSubHeader title="Astrocartography" />
      <div style={{ background: 'var(--travel-gold-soft)', borderRadius: 14, padding: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={14} style={{ color: 'var(--travel-gold)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 11, color: 'var(--travel-text)', margin: 0, lineHeight: 1.4 }}>
          A visual world map isn&apos;t available yet (no maps provider is connected). These are your real calculated planetary line positions — check any destination&apos;s own page for a reading specific to that place. {note}
        </p>
      </div>

      {mcIc.length === 0 ? <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--travel-muted)' }}>Calculating your lines…</p> : (
        <>
          {['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map(body => {
            const mc = lines.find(l => l.body === body && l.type === 'MC')
            const ic = lines.find(l => l.body === body && l.type === 'IC')
            if (!mc || !ic) return null
            return (
              <div key={body} style={{ background: 'var(--travel-card)', border: '1px solid var(--travel-border)', borderRadius: 16, boxShadow: 'var(--travel-shadow)', padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--travel-gold-soft)', color: 'var(--travel-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{BODY_GLYPH[body]}</div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 13, color: 'var(--travel-text)' }}>{body}</strong>
                  <p style={{ fontSize: 10.5, color: 'var(--travel-muted)', margin: '2px 0 0' }}>
                    {LINE_LABEL.MC} line: {mc.points[0].lon.toFixed(1)}° longitude · {LINE_LABEL.IC} line: {ic.points[0].lon.toFixed(1)}° longitude
                  </p>
                </div>
              </div>
            )
          })}
          <p style={{ fontSize: 10.5, color: 'var(--travel-muted)', textAlign: 'center', marginTop: 8 }}>
            <Globe2 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} />
            Ascendant/Descendant lines curve by latitude and are shown per-destination rather than listed here.
          </p>
        </>
      )}
    </div>
  )
}
