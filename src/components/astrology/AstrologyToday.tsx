'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Heart, Briefcase, Palette, MessageCircle, Sparkles as SparklesIcon, Star,
  Check, Moon, Sun, Sparkles, Calendar, PieChart, Clock, Grid3x3,
} from 'lucide-react'

import { GreetingHeader, useTodayContext } from '@/components/home/GreetingHeader'
import { buildDailyThemeHeadline } from '@/lib/luna/dailyThemeHeadline'
import { TilePager } from '@/components/ui/TilePager'
import { RoomTileCard } from '@/components/ui/RoomTileCard'
import styles from './AstrologyToday.module.css'

const ASTROLOGY_TILES = [
  { id: 'chart', href: '/astrology/chart', label: 'My Chart', tagline: 'Your full natal placements.', icon: PieChart, accent: 'rgba(201,169,110,0.32)', image: '/images/astrology/chart.jpg' },
  { id: 'timing', href: '/astrology/timing', label: 'Timing', tagline: 'What the sky favors right now.', icon: Clock, accent: 'rgba(150,160,200,0.32)', image: '/images/astrology/timing.jpg' },
  { id: 'connections', href: '/astrology/connections', label: 'Connections', tagline: 'Compatibility and synastry.', icon: Heart, accent: 'rgba(210,150,150,0.32)', image: '/images/astrology/connections.jpg' },
  { id: 'spirit', href: '/spirit', label: 'Spirit', tagline: 'Tarot, crystals, and rituals.', icon: Sparkles, accent: 'rgba(200,180,220,0.32)', image: '/images/astrology/spirit.jpg' },
  { id: 'more', href: '/astrology/more', label: 'More', tagline: 'Every astrology tool in one place.', icon: Grid3x3, accent: 'rgba(150,175,160,0.32)', image: '/images/astrology/more.jpg' },
]

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

interface UpcomingEvent { kind: 'moon' | 'eclipse' | 'station'; title: string; detail: string; date: string; dateFormatted: string }

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
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([])
  const { now, weather, weatherError } = useTodayContext()

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

    fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`).then(r => r.json()).then(setMoon).catch(() => {})
    fetch('/api/astrology/transits').then(r => r.json()).then(setTransits).catch(() => {})
    fetch(`/api/astrology/planets?tz=${encodeURIComponent(tz)}`).then(r => r.json()).then(d => setUpcoming(d.upcoming ?? [])).catch(() => {})

    const localDate = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
    const localTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
    fetch(`/api/astrology/daily-guidance?tz=${encodeURIComponent(tz)}&date=${encodeURIComponent(localDate)}&time=${encodeURIComponent(localTime)}`)
      .then(r => r.json()).then(setGuidance).catch(() => {})
  }, [])

  const topTransit = transits?.aspects?.[0]
  const categories = topTransit ? (NATAL_CATEGORIES[topTransit.natal] ?? []) : []

  return (
    <>
      <GreetingHeader now={now} weather={weather} weatherError={weatherError} />

      <div className={styles.tileSection}>
        <TilePager items={ASTROLOGY_TILES} keyFor={t => t.id} renderItem={t => <RoomTileCard {...t} />} />
      </div>

      {/* Daily horoscope first — the thing she actually reads every day — with
          the Moon snapshot right after it, not the other way around. The headline
          is computed from today's real Moon phase + sign (not AI text), so it's
          both accurate and guaranteed to read differently whenever the sky does. */}
      <div className={styles.card}>
        <div className={styles.cardLabel}>Today&apos;s Theme</div>
        {moon && (
          <h2 className={styles.themeHeadline}>{buildDailyThemeHeadline(moon.phase.name, moon.sign.name)}</h2>
        )}
        {guidance ? (
          <>
            <p className={styles.themeQuote}>{guidance.affirmation.replace(/\.$/, '')}</p>
            <p className={styles.themeBody}>{guidance.horoscope}</p>
          </>
        ) : <p className={styles.loadingText}>Luna is reading today&apos;s sky…</p>}
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
          {upcoming.slice(0, 5).map(u => (
            <div key={u.kind + u.title + u.date} className={styles.upcomingRow}>
              <div className={styles.upcomingIcon}>{u.kind === 'moon' ? <Moon size={15} /> : u.kind === 'eclipse' ? <Sun size={15} /> : <Calendar size={15} />}</div>
              <div className={styles.upcomingBody}><strong>{u.title}</strong><span>{u.dateFormatted}{u.detail ? ` · ${u.detail}` : ''}</span></div>
            </div>
          ))}
          {upcoming.length === 0 && (
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
