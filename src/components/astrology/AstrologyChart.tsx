'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { NatalWheel, type WheelPlacement, type WheelAspect } from './NatalWheel'
import { AstrologyHero } from './AstrologyHero'
import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './AstrologyChart.module.css'

interface NatalPlacement extends WheelPlacement { houseTheme: string; notes?: string; retrograde: boolean }
interface ChartData {
  placements: NatalPlacement[]
  aspects: WheelAspect[]
  birthData: { date: string; time: string; place: string; timeAccuracy: 'exact' | 'approximate' | 'unknown' }
  houseSystem: string
}

const PLANET_KEYWORDS: Record<string, string> = {
  Sun: 'Identity · vitality · core self · life force',
  Moon: 'Emotions · instincts · safety needs · cycles',
  Mercury: 'Mind · communication · thought · learning',
  Venus: 'Love · beauty · values · pleasure · attraction',
  Mars: 'Drive · action · desire · anger · motivation',
  Jupiter: 'Expansion · abundance · wisdom · opportunity',
  Saturn: 'Discipline · limits · lessons · mastery · time',
  Uranus: 'Disruption · liberation · awakening · innovation',
  Neptune: 'Illusion · dreams · spirituality · dissolution',
  Pluto: 'Transformation · power · death/rebirth · shadow',
  NNode: 'Growth direction · soul path forward',
  SNode: 'Past patterns · what you\'re releasing',
  Chiron: 'The wound that becomes the gift',
  Lilith: 'Raw instinct · what refuses to be tamed',
  Midheaven: 'Career · legacy · public life',
  Rising: 'First impression · how you meet the world',
}

const TABS = ['Chart', 'Placements', 'Houses', 'Aspects'] as const
type Tab = typeof TABS[number]

const ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','NNode','SNode','Chiron','Lilith','Rising','Midheaven']

export function AstrologyChart() {
  const [data, setData] = useState<ChartData | null>(null)
  const [tab, setTab] = useState<Tab>('Chart')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/astrology/natal-chart').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) return <p style={{ fontSize: 12, color: 'var(--astro-muted)', textAlign: 'center', padding: 30 }}>Calculating your chart…</p>

  const byPoint = Object.fromEntries(data.placements.map(p => [p.point, p]))
  const sun = byPoint.Sun, moon = byPoint.Moon, rising = byPoint.Rising
  const selectedPlacement = selected ? byPoint[selected] : null

  const housesOccupants: Record<number, string[]> = {}
  for (const p of data.placements) {
    if (p.point === 'Rising' || p.point === 'Midheaven') continue
    housesOccupants[p.house] = [...(housesOccupants[p.house] ?? []), p.point]
  }

  return (
    <>
      <AstrologyHero image="/images/astrology/chart.jpg" label="My Chart" title="Your Natal Blueprint" subtitle="Every placement, house, and aspect — mapped from your exact birth data." />

      <div className={styles.tabRow}>
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'Chart' && (
        <>
          <div className={styles.wheelCard}>
            <NatalWheel placements={data.placements} aspects={data.aspects} onSelectPoint={setSelected} selected={selected} />
          </div>

          <div className={styles.uncertaintyNote}>
            <AlertTriangle />
            <span>Birth time is <strong>{data.birthData.timeAccuracy}</strong> ({data.birthData.place}). Houses use the whole-sign system, derived directly from your real Rising sign — Ascendant, Midheaven, and house placements near a sign boundary carry some uncertainty until an exact birth time is confirmed.</span>
          </div>

          <div className={styles.bigThreeGrid}>
            {[{ label: 'Sun', p: sun }, { label: 'Moon', p: moon }, { label: 'Rising', p: rising }].map(({ label, p }) => p && (
              <div key={label} className={styles.bigThreeCard}>
                <div className={styles.bigThreeLabel}>{label}</div>
                <div className={styles.bigThreeSign}>{p.sign}</div>
                <div className={styles.bigThreeDegree}>{p.degree}°{String(p.minutes).padStart(2, '0')}&apos; · House {p.house}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'Placements' && (
        <>
          {ORDER.map(point => {
            const p = byPoint[point]
            if (!p) return null
            return (
              <button key={point} type="button" onClick={() => setSelected(point)} className={styles.placementRow} style={{ width: '100%', textAlign: 'left', border: 'none' }}>
                <div className={styles.placementGlyph}>{point === 'Rising' ? 'AC' : point === 'Midheaven' ? 'MC' : point[0]}</div>
                <div className={styles.placementInfo}>
                  <strong>{point === 'NNode' ? 'North Node' : point === 'SNode' ? 'South Node' : point}{p.retrograde && <span className={styles.retroTag}> ℞</span>}</strong>
                  <span>{p.sign} {p.degree}°{String(p.minutes).padStart(2, '0')}&apos;</span>
                </div>
                <div className={styles.placementHouse}>House {p.house}</div>
              </button>
            )
          })}
        </>
      )}

      {tab === 'Houses' && (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const houseNum = i + 1
            const occupants = housesOccupants[houseNum] ?? []
            return (
              <div key={houseNum} className={styles.houseCard}>
                <strong>House {houseNum}</strong>
                <p>{data.placements.find(p => p.house === houseNum)?.houseTheme}</p>
                {occupants.length > 0 && (
                  <div className={styles.houseOccupants}>
                    {occupants.map(o => <span key={o}>{o === 'NNode' ? 'N. Node' : o === 'SNode' ? 'S. Node' : o}</span>)}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {tab === 'Aspects' && (
        <>
          {data.aspects.length === 0 && <p style={{ fontSize: 12, color: 'var(--astro-muted)', textAlign: 'center' }}>No major aspects found.</p>}
          {data.aspects.map(a => (
            <div key={`${a.a}-${a.b}`} className={styles.aspectRow}>
              <span className={styles.aspectType}>{a.type}</span>
              <span>{a.a} – {a.b}</span>
              <span className={styles.aspectOrb}>{a.orb}° orb</span>
            </div>
          ))}
        </>
      )}

      <BottomSheet isOpen={!!selectedPlacement} onClose={() => setSelected(null)} title={selected === 'Rising' ? 'Ascendant' : selected === 'Midheaven' ? 'Midheaven' : selected ?? ''} subtitle={selectedPlacement ? `${selectedPlacement.sign} ${selectedPlacement.degree}°${String(selectedPlacement.minutes).padStart(2, '0')}'${selectedPlacement.retrograde ? ' · Retrograde' : ''}` : undefined}>
        {selectedPlacement && (
          <>
            <div className={styles.sheetSection}>
              <h4>Plain-Language Meaning</h4>
              <p>{selectedPlacement.notes ?? 'No interpretation available yet.'}</p>
            </div>
            <div className={styles.sheetSection}>
              <h4>Keywords</h4>
              <p>{PLANET_KEYWORDS[selected ?? ''] ?? ''}</p>
            </div>
            <div className={styles.sheetSection}>
              <h4>House {selectedPlacement.house}</h4>
              <p>{selectedPlacement.houseTheme}</p>
            </div>
          </>
        )}
      </BottomSheet>
    </>
  )
}
