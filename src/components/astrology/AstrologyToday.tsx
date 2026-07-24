'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Heart, Briefcase, Palette, MessageCircle, Sparkles as SparklesIcon, Star,
  Check, Moon, Sun, Sparkles, Calendar,
} from 'lucide-react'

import styles from './AstrologyToday.module.css'

interface MoonData {
  phase: { name: string; emoji: string; illumination: number; description: string; next_exact: { name: string; time: string } | null }
  sign: { name: string; formatted: string; keywords: string }
  next_ingress: string | null
}

interface TransitAspect {
  transiting: string; natal: string; type: string; emoji: string; orb: number
  applying: boolean; interpretation: string; natalSign: string; transitSign: string
}

interface TransitData {
  aspects: TransitAspect[]
  daily_theme: string
  moon_house: number | null
  moon_house_meaning: string | null
}

interface DailyGuidance {
  horoscope: string; energy: string; do_today: string[]; dont_today: string[]
  career: string; love: string; money: string; family: string; self_reflection: string
  affirmation: string
}

interface EclipseEvent { type: string; dateFormatted: string; description: string }

const NATAL_CATEGORIES: Record<string, { label: string; icon: typeof Heart }[]> = {
  Moon:       [{ label: 'Emotions', icon: Heart }, { label: 'Self-Care', icon: SparklesIcon }],
  Venus:      [{ label: 'Relationships', icon: Heart }, { label: 'Creativity', icon: Palette }],
  Mars:       [{ label: 'Confidence', icon: Star }, { label: 'Work', icon: Briefcase }],
  Mercury:    [{ label: 'Communication', icon: MessageCircle }, { label: 'Work', icon: Briefcase }],
  Saturn:     [{ label: 'Work', icon: Briefcase }, { label: 'Confidence', icon: Star }],
  Sun:        [{ label: 'Confidence', icon: Star }, { label: 'Creativity', icon: Palette }],
  Rising:     [{ label: 'Confidence', icon: Star }],
  Midheaven:  [{ label: 'Work', icon: Briefcase }],
  NNode:      [{ label: 'Emotions', icon: Heart }, { label: 'Self-Care', icon: SparklesIcon }],
}

const STATUS_LABEL: Record<string, string> = {
  conjunction: 'Exact', square: 'Challenging', opposition: 'Mixed', trine: 'Supportive', sextile: 'Supportive',
}

const OUTLOOK_LABELS = ['High', 'Flowing', 'Focused', 'Reflective', 'Sensitive', 'Restorative']

function outlookFor(seed: number): string {
  return OUTLOOK_LABELS[Math.abs(seed) % OUTLOOK_LABELS.length]
}

export function AstrologyToday() {
  const [moon, setMoon] = useState<MoonData | null>(null)
  const [transits, setTransits] = useState<TransitData | null>(null)
  const [guidance, setGuidance] = useState<DailyGuidance | null>(null)
  const [eclipses, setEclipses] = useState<EclipseEvent[]>([])
  const [greetingHour, setGreetingHour] = useState<number | null>(null)

  useEffect(() => {
    setGreetingHour(new Date().getHours())
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`).then(r => r.json()).then(setMoon).catch(() => {})
    fetch('/api/astrology/transits').then(r => r.json()).then(setTransits).catch(() => {})
    fetch(`/api/astrology/planets?tz=${encodeURIComponent(tz)}`).then(r => r.json()).then(d => setEclipses(d.eclipses ?? [])).catch(() => {})

    const localDate = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
    const localTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
    fetch(`/api/astrology/daily-guidance?tz=${encodeURIComponent(tz)}&date=${encodeURIComponent(localDate)}&time=${encodeURIComponent(localTime)}`)
      .then(r => r.json()).then(setGuidance).catch(() => {})
  }, [])

  const greeting = greetingHour == null ? 'Hello' : greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening'
  const topTransit = transits?.aspects?.[0]
  const categories = topTransit ? (NATAL_CATEGORIES[topTransit.natal] ?? []) : []

  return (
    <>
      <div className={styles.greeting}>
        <h1>{greeting}, Zoe</h1>
        <p>The stars are aligning in your favor.</p>
      </div>

      <Link href="/astrology/moon" className={styles.cardLink}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Current Moon</div>
          {moon ? (
            <div className={styles.moonRow}>
              <div className={styles.moonVisual}><div className={styles.moonShadow} style={{ opacity: 1 - moon.phase.illumination / 100 }} /></div>
              <div className={styles.moonInfo}>
                <strong>{moon.phase.name}</strong>
                <span>{moon.sign.name} · {moon.phase.illumination}% illuminated</span>
                {moon.next_ingress && <span>{moon.next_ingress}</span>}
              </div>
            </div>
          ) : <p className={styles.loadingText}>Reading the sky…</p>}
        </div>
      </Link>

      <div className={styles.card}>
        <div className={styles.cardLabel}>Today&apos;s Theme</div>
        {guidance ? (
          <>
            <p className={styles.themeQuote}>{guidance.affirmation.replace(/\.$/, '')}</p>
            <p className={styles.themeBody}>{guidance.horoscope}</p>
          </>
        ) : <p className={styles.loadingText}>Luna is reading today&apos;s sky…</p>}
      </div>

      {topTransit && (
        <div className={styles.card}>
          <div className={styles.transitHeader}>
            <div className={styles.cardLabel} style={{ marginBottom: 0 }}>Personal Transit of the Day</div>
            <div className={styles.transitStatus}>
              <span className={`${styles.pill} ${styles.pillGold}`}>{topTransit.applying ? 'Applying' : 'Separating'}</span>
              <span className={`${styles.pill} ${styles.pillMuted}`}>{STATUS_LABEL[topTransit.type] ?? topTransit.type}</span>
            </div>
          </div>
          <h2 className={styles.transitTitle}>{topTransit.transiting} {topTransit.type} your natal {topTransit.natal}</h2>
          <p className={styles.themeBody} style={{ marginBottom: 10 }}>{topTransit.interpretation}</p>

          {categories.length > 0 && (
            <>
              <div className={styles.cardLabel}>What This Means</div>
              <div className={styles.categoryGrid}>
                {categories.map(c => (
                  <div key={c.label} className={styles.categoryItem}><c.icon /> {c.label}</div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {guidance && (
        <div className={styles.card}>
          <div className={styles.cardLabel}>Best Use of Today</div>
          <ul className={styles.useList}>
            {guidance.do_today.slice(0, 4).map(item => <li key={item}><Check /> {item}</li>)}
            {guidance.dont_today.slice(0, 1).map(item => <li key={item}><Check /> Avoid: {item}</li>)}
          </ul>
        </div>
      )}

      <div>
        <div className={styles.sectionHeader}>Daily Outlook</div>
        <div className={styles.outlookGrid} style={{ marginTop: 8 }}>
          {[
            { label: 'Energy', seed: 1 }, { label: 'Love', seed: 2 }, { label: 'Work', seed: 3 },
            { label: 'Creativity', seed: 4 }, { label: 'Emotional Tone', seed: 5 }, { label: 'Wellness', seed: 6 },
          ].map(o => (
            <div key={o.label} className={styles.outlookCard}>
              <span>{o.label}</span>
              <div className={styles.outlookLabel}>{outlookFor(o.seed + (transits?.aspects?.[0]?.orb ? Math.round(transits.aspects[0].orb) : 0))}</div>
            </div>
          ))}
        </div>
      </div>

      {guidance && (
        <div className={styles.lunaCard}>
          <div className={styles.lunaLabel}><Sparkles /> Luna&apos;s Message</div>
          <p className={styles.lunaText}>{guidance.self_reflection}</p>
        </div>
      )}

      <div>
        <div className={styles.sectionHeader}>Upcoming Cosmic Dates</div>
        <div className={styles.upcomingList} style={{ marginTop: 8 }}>
          {moon?.phase.next_exact && (
            <div className={styles.upcomingRow}>
              <div className={styles.upcomingIcon}><Moon size={15} /></div>
              <div className={styles.upcomingBody}><strong>{moon.phase.next_exact.name}</strong><span>{moon.phase.next_exact.time}</span></div>
            </div>
          )}
          {eclipses.slice(0, 3).map(e => (
            <div key={e.type + e.dateFormatted} className={styles.upcomingRow}>
              <div className={styles.upcomingIcon}><Sun size={15} /></div>
              <div className={styles.upcomingBody}><strong>{e.type}</strong><span>{e.dateFormatted}</span></div>
            </div>
          ))}
          {!moon?.phase.next_exact && eclipses.length === 0 && (
            <div className={styles.upcomingRow}>
              <div className={styles.upcomingIcon}><Calendar size={15} /></div>
              <div className={styles.upcomingBody}><strong>Nothing major this week</strong><span>Check Timing for the full picture</span></div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
