'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Heart, Briefcase, Palette, MessageCircle, Sparkles as SparklesIcon, Star,
  Check, Moon, Sun, Sparkles, Calendar, PieChart, Clock, Grid3x3,
  Target, DollarSign, Users, Compass, ScrollText, CalendarDays, Activity, RotateCcw, GraduationCap,
} from 'lucide-react'
import { plainAspectPhrase } from '@/lib/astrology'

import { GreetingHeader, useTodayContext } from '@/components/home/GreetingHeader'
import { buildDailyThemeHeadline } from '@/lib/luna/dailyThemeHeadline'
import { TilePager } from '@/components/ui/TilePager'
import { RoomTileCard } from '@/components/ui/RoomTileCard'
import { ExploreRow } from './AstrologyMore'
import styles from './AstrologyToday.module.css'

const ASTROLOGY_TILES = [
  { id: 'chart', href: '/astrology/chart', label: 'My Chart', tagline: 'Your full birth chart, mapped out.', icon: PieChart, accent: 'rgba(201,169,110,0.32)', image: '/images/astrology/chart.jpg' },
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
  career: string; love: string; sex: string; money: string; friendship: string; family: string
  self_reflection: string; main_focus: string; highest_self: string; affirmation: string
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
            <div className={styles.themeEnergyLabel}>How Today Feels</div>
            <p className={styles.themeEnergyBody}>{guidance.energy}</p>
          </>
        ) : <p className={styles.loadingText}>Luna is reading today&apos;s sky…</p>}
      </div>

      {guidance?.main_focus && (
        <div className={styles.focusBanner}>
          <Target />
          <div>
            <div className={styles.focusBannerLabel}>Main Focus Today</div>
            <p className={styles.focusBannerBody}>{guidance.main_focus}</p>
          </div>
        </div>
      )}

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
          <h2 className={styles.transitTitle}>{topTransit.transiting} is {plainAspectPhrase(topTransit.type)} your {topTransit.natal}</h2>
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

      {guidance && (
        <div>
          <div className={styles.sectionHeader}>Life Areas Today</div>
          <div className={styles.card} style={{ marginTop: 8, marginBottom: 8 }}>
            <div className={styles.lifeAreaCard}>
              <div className={styles.lifeAreaIcon}><Briefcase /></div>
              <div>
                <div className={styles.lifeAreaLabel}>Career &amp; Work</div>
                <p className={styles.lifeAreaBody}>{guidance.career}</p>
              </div>
            </div>
          </div>
          <div className={styles.card} style={{ marginBottom: 8 }}>
            <div className={styles.lifeAreaCard}>
              <div className={styles.lifeAreaIcon}><Heart /></div>
              <div>
                <div className={styles.lifeAreaLabel}>Love &amp; Connection</div>
                <p className={styles.lifeAreaBody}>{guidance.love}</p>
                {guidance.sex && <p className={styles.lifeAreaBody}>{guidance.sex}</p>}
              </div>
            </div>
          </div>
          <div className={styles.card} style={{ marginBottom: 8 }}>
            <div className={styles.lifeAreaCard}>
              <div className={styles.lifeAreaIcon}><DollarSign /></div>
              <div>
                <div className={styles.lifeAreaLabel}>Money</div>
                <p className={styles.lifeAreaBody}>{guidance.money}</p>
              </div>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.lifeAreaCard}>
              <div className={styles.lifeAreaIcon}><Users /></div>
              <div>
                <div className={styles.lifeAreaLabel}>Family &amp; Friends</div>
                <p className={styles.lifeAreaBody}>{guidance.family}</p>
                {guidance.friendship && <p className={styles.lifeAreaBody}>{guidance.friendship}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {guidance && (
        <div className={styles.lunaCard}>
          <div className={styles.lunaLabel}><Sparkles /> Luna&apos;s Message</div>
          <p className={styles.lunaText}>{guidance.self_reflection}</p>
        </div>
      )}

      {guidance?.highest_self && (
        <div className={styles.lunaCard}>
          <div className={styles.lunaLabel}><Compass /> Your Highest Self Today</div>
          <p className={styles.lunaText}>{guidance.highest_self}</p>
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

      {/* Everything else in Astrology, right here — these used to only exist one
          more tap in on the More tab, which is exactly what made them hard to find. */}
      <div>
        <div className={styles.sectionHeader}>More To Explore</div>
        <div style={{ marginTop: 8 }}>
          <ExploreRow href="/astrology/daily" icon={<ScrollText size={16} />} label="Daily Reading Archive"
            desc="The full version of today's reading, plus your past days" />
          <ExploreRow href="/astrology/forecasts" icon={<CalendarDays size={16} />} label="Weekly Forecast"
            desc="Day-by-day outlook for the next 7 days" />
          <ExploreRow href="/astrology/moon" icon={<Moon size={16} />} label="Moon"
            desc="Phase, sign, and what it means for you right now" />
          <ExploreRow href="/astrology/transits" icon={<Activity size={16} />} label="Transit Explorer"
            desc="Every real aspect active right now" />
          <ExploreRow href="/astrology/retrogrades" icon={<RotateCcw size={16} />} label="Retrogrades"
            desc="What's retrograde right now and what it means" />
          <ExploreRow href="/astrology/deep-dives" icon={<GraduationCap size={16} />} label="Learn"
            desc="What every planet, house, and aspect actually means" />
          <ExploreRow href="/astrology/more" icon={<Grid3x3 size={16} />} label="Everything Else"
            desc="Saved readings, your astrology journal, and settings" />
        </div>
      </div>
    </>
  )
}
