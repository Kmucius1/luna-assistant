'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight, ChevronLeft, Moon, MapPin, BookOpen, GraduationCap, RotateCcw,
  Archive, Settings, Check, CalendarDays, Activity, ScrollText,
} from 'lucide-react'

import { SmartInput } from '@/components/ui/SmartInput'
import { AstrologyHero } from './AstrologyHero'
import styles from './AstrologyMore.module.css'

// Every real destination in the Astrology room, in one place with an honest
// one-line description, so nothing requires already knowing it exists.
export function ExploreRow({ href, icon, label, desc, badge }: {
  href: string; icon: React.ReactNode; label: string; desc: string; badge?: string
}) {
  return (
    <Link href={href} className={styles.row}>
      <span className={styles.rowMeta}>
        {icon}
        <span className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowDesc}>{desc}</span>
        </span>
      </span>
      <span className={styles.rowEnd}>
        {badge && <span className={styles.elsewhereBadge}>{badge}</span>}
        <ChevronRight size={16} className={styles.rowArrow} />
      </span>
    </Link>
  )
}

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
      <AstrologyHero image="/images/astrology/more.jpg" label="Explore" title="Every Tool, One Place" subtitle="Everything in the Astrology room, in one list — nothing buried." />

      <div className={styles.sectionHeader}>Read</div>
      <ExploreRow href="/astrology/daily" icon={<ScrollText size={16} />} label="Daily Reading Archive"
        desc="The full version of today's reading, plus every past day you can look back on" />
      <ExploreRow href="/astrology/forecasts" icon={<CalendarDays size={16} />} label="Weekly Forecast"
        desc="Day-by-day outlook for the next 7 days — best day, rest day, love window" />
      <ExploreRow href="/astrology/moon" icon={<Moon size={16} />} label="Moon"
        desc="Current phase, sign, and what it means for your emotions, body, and rituals" />

      <div className={styles.sectionHeader}>Explore The Sky</div>
      <ExploreRow href="/astrology/transits" icon={<Activity size={16} />} label="Transit Explorer"
        desc="Every real aspect active right now, filterable by tension or flow" />
      <ExploreRow href="/astrology/retrogrades" icon={<RotateCcw size={16} />} label="Retrogrades"
        desc="What's retrograde right now, what it means, and when Mercury turns next" />
      <ExploreRow href="/travel/astrocartography" icon={<MapPin size={16} />} label="Places"
        desc="Where on the map your chart lights up — lives in the Travel room" badge="Travel" />

      <div className={styles.sectionHeader}>Learn &amp; Keep</div>
      <ExploreRow href="/astrology/deep-dives" icon={<GraduationCap size={16} />} label="Learn"
        desc="What every planet, house, and aspect actually means, in plain English" />
      <ExploreRow href="/astrology/saved-readings" icon={<Archive size={16} />} label="Saved Readings"
        desc="Every daily reading you've had, browsable by date" />
      <button type="button" onClick={() => setView('journal')} className={styles.row} style={{ width: '100%', border: 'none' }}>
        <span className={styles.rowMeta}>
          <BookOpen size={16} />
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Astrology Journal</span>
            <span className={styles.rowDesc}>Write what's alive for you right now, tagged with today's Moon</span>
          </span>
        </span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </button>

      <div className={styles.sectionHeader}>Settings</div>
      <button type="button" onClick={() => setView('settings')} className={styles.row} style={{ width: '100%', border: 'none' }}>
        <span className={styles.rowMeta}>
          <Settings size={16} />
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>Astrology Settings</span>
            <span className={styles.rowDesc}>Your birth date, time, place, and house system</span>
          </span>
        </span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </button>
    </>
  )
}
