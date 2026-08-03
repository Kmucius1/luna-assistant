'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronLeft, Moon, MapPin, BookOpen, GraduationCap, Sun, Archive, Settings, Check } from 'lucide-react'

import { SmartInput } from '@/components/ui/SmartInput'
import { AstrologyHero } from './AstrologyHero'
import styles from './AstrologyMore.module.css'

interface MoonData { phase: { name: string }; sign: { name: string } }
interface ChartBirthData { date: string; time: string; place: string; timeAccuracy: string }

export function AstrologyMore() {
  const [view, setView] = useState<'hub' | 'journal' | 'settings'>('hub')
  const [moon, setMoon] = useState<MoonData | null>(null)
  const [birthData, setBirthData] = useState<ChartBirthData | null>(null)
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)

  useEffect(() => {
    fetch('/api/astrology/moon').then(r => r.json()).then(setMoon).catch(() => {})
    fetch('/api/astrology/natal-chart').then(r => r.json()).then(d => setBirthData(d.birthData)).catch(() => {})
  }, [])

  async function saveJournal() {
    if (!journalText.trim()) return
    try {
      await fetch('/api/journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: 'astrology',
          content: journalText.trim(),
          tags: moon ? [moon.phase.name, `${moon.sign.name} Moon`] : [],
        }),
      })
      setJournalSaved(true)
      setJournalText('')
    } catch {}
  }

  if (view === 'journal') {
    return (
      <>
        <button type="button" onClick={() => setView('hub')} className={styles.backButton}><ChevronLeft size={14} /> Back</button>
        <div className={styles.journalCard}>
          {moon && (
            <div style={{ marginBottom: 10 }}>
              <span className={styles.contextChip}>{moon.phase.name}</span>
              <span className={styles.contextChip}>{moon.sign.name} Moon</span>
            </div>
          )}
          {journalSaved ? (
            <p style={{ fontSize: 13, color: 'var(--astro-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} style={{ color: 'var(--astro-gold)' }} /> Saved with today&apos;s cosmic context. <Link href="/journal" style={{ color: 'var(--astro-gold)', fontWeight: 700 }}>View journal →</Link>
            </p>
          ) : (
            <>
              <SmartInput
                context="astrology journal — what's coming up under today's sky"
                placeholder="What's alive for you right now?"
                value={journalText}
                onChange={setJournalText}
                patternType="astrology_journal"
                rows={4}
                autosaveKey="astrology_journal"
              />
              <button type="button" onClick={saveJournal} disabled={!journalText.trim()} className={styles.saveButton}>Save Entry</button>
            </>
          )}
        </div>
      </>
    )
  }

  if (view === 'settings') {
    return (
      <>
        <button type="button" onClick={() => setView('hub')} className={styles.backButton}><ChevronLeft size={14} /> Back</button>
        <div className={styles.settingsCard}>
          <div className={styles.settingsRow}><span>Birth Date</span><span>{birthData?.date ?? '—'}</span></div>
          <div className={styles.settingsRow}><span>Birth Time</span><span>{birthData?.time ?? '—'}</span></div>
          <div className={styles.settingsRow}><span>Birth Place</span><span>{birthData?.place ?? '—'}</span></div>
          <div className={styles.settingsRow}><span>Time Accuracy</span><span style={{ textTransform: 'capitalize' }}>{birthData?.timeAccuracy ?? '—'}</span></div>
          <div className={styles.settingsRow}><span>House System</span><span>Whole Sign</span></div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--astro-muted)', marginTop: 10, lineHeight: 1.4 }}>
          This is a single-profile app, so birth details aren&apos;t yet editable from here — they&apos;re stored in <code>src/data/astrology/natal-zoe.json</code>. Ask Claude to update them directly if anything needs correcting.
        </p>
      </>
    )
  }

  return (
    <>
      <AstrologyHero image="/images/astrology/more.jpg" label="Explore" title="Every Tool, One Place" subtitle="Moon room, journal, deep dives, and the sky right now." />

      <div className={styles.sectionHeader}>Explore</div>
      <Link href="/astrology/moon" className={styles.row}>
        <span className={styles.rowMeta}><Moon size={16} /> Moon Room</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </Link>
      <button type="button" onClick={() => setView('journal')} className={styles.row} style={{ width: '100%', border: 'none' }}>
        <span className={styles.rowMeta}><BookOpen size={16} /> Astrology Journal</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </button>
      <Link href="/astrology/deep-dives" className={styles.row}>
        <span className={styles.rowMeta}><GraduationCap size={16} /> Learn</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </Link>
      <Link href="/astrology/retrogrades" className={styles.row}>
        <span className={styles.rowMeta}><Sun size={16} /> Current Sky</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </Link>
      <Link href="/astrology/saved-readings" className={styles.row}>
        <span className={styles.rowMeta}><Archive size={16} /> Saved Readings</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </Link>

      <div className={styles.sectionHeader}>Advanced</div>
      <div className={`${styles.row} ${styles.soonRow}`}><span className={styles.soonBadge}>Soon</span> <MapPin size={16} style={{ marginRight: 6 }} /> Places (Astrocartography)</div>

      <div className={styles.sectionHeader}>Settings</div>
      <button type="button" onClick={() => setView('settings')} className={styles.row} style={{ width: '100%', border: 'none' }}>
        <span className={styles.rowMeta}><Settings size={16} /> Astrology Settings</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </button>
    </>
  )
}
