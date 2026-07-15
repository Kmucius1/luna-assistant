'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LunaShell } from '@/components/luna/LunaShell'
import { LunaHeroCard } from '@/components/luna/LunaHeroCard'
import { LunaActionTile } from '@/components/luna/LunaActionTile'
import { LunaSwipePager } from '@/components/luna/LunaSwipePager'
import { LunaEmptyState, LunaLoadingState } from '@/components/luna'
import VAULT_CATEGORIES from '@/data/vault/categories.json'
import {
  Star, Moon, Sparkles, Target, Calendar,
  Mic, Brain, Zap,
  BookOpen, Scissors, Plus,
  Heart, Flame, Waves, PenLine, Sun,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GuidanceData {
  horoscope?: string; energy?: string; affirmation?: string
  shadow_question?: string; moon_note?: string; crystal?: string
}
interface HomeTask     { id: string; title: string; urgency_level?: string }
interface HomeCalEvent { id: string; title: string; startTime: string; allDay: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', pct: 0   },
  { name: 'Waxing Crescent', emoji: '🌒', pct: 14  },
  { name: 'First Quarter',   emoji: '🌓', pct: 28  },
  { name: 'Waxing Gibbous',  emoji: '🌔', pct: 82  },
  { name: 'Full Moon',       emoji: '🌕', pct: 100 },
  { name: 'Waning Gibbous',  emoji: '🌖', pct: 72  },
  { name: 'Last Quarter',    emoji: '🌗', pct: 50  },
  { name: 'Waning Crescent', emoji: '🌘', pct: 18  },
]
function getMoonPhase() {
  const days = (Date.now() - new Date('2024-01-11').getTime()) / 86_400_000
  return MOON_PHASES[Math.floor(((days % 29.53) / 29.53) * 8)] ?? MOON_PHASES[0]
}
type HeroTimeBucket = 'morning' | 'afternoon' | 'evening' | 'night'

function getHeroTimeBucket(h: number): HeroTimeBucket {
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

const HERO_GREETINGS: Record<HeroTimeBucket, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Good night',
}

const HERO_BACKGROUNDS: Record<HeroTimeBucket, string> = {
  morning: '/brand/ui/hero-morning.jpg',
  afternoon: '/brand/ui/hero-afternoon.jpg',
  evening: '/brand/ui/hero-evening.jpg',
  night: '/brand/ui/hero-night.jpg',
}

// Rotating taglines, grouped by time of day so tone matches the moment.
// Picked by day-of-year so it's stable through a single viewing but changes daily.
const HERO_TAGLINES: Record<HeroTimeBucket, string[]> = {
  morning: [
    'You are not behind.\nYou are becoming.',
    'Start soft.\nThe day will meet you there.',
    'One clear breath\nbefore the noise begins.',
  ],
  afternoon: [
    'Keep going.\nYou are closer than it feels.',
    'This is the middle,\nnot the mistake.',
    'Steady pace.\nYou do not have to rush this.',
  ],
  evening: [
    'The day is closing.\nLet it.',
    'You did enough.\nReally.',
    'Soften now.\nTomorrow can wait its turn.',
  ],
  night: [
    'Rest is not\nfalling behind.',
    'The quiet is yours.\nStay a while.',
    'You are not behind.\nYou are becoming.',
  ],
}

function getGreeting(h: number) {
  return HERO_GREETINGS[getHeroTimeBucket(h)]
}

function getHeroBackground(h: number) {
  return HERO_BACKGROUNDS[getHeroTimeBucket(h)]
}

function getHeroTagline(h: number) {
  const bucket = getHeroTimeBucket(h)
  const pool = HERO_TAGLINES[bucket]
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000)
  return pool[dayOfYear % pool.length]
}

// ─── Shared glass card style — LUNA locked theme tokens ────────────────────────
const G: React.CSSProperties = {
  background: 'var(--luna-panel)',
  border: '1px solid var(--luna-border-soft)',
  borderRadius: 20,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
}

// ─── Section label inside cards ───────────────────────────────────────────────
const LBL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'white',
  display: 'flex', alignItems: 'center', gap: 5,
  marginBottom: 8, flexShrink: 0,
}

// ─── Star sigil ───────────────────────────────────────────────────────────────
function StarSigil({ size = 52 }: { size?: number }) {
  const c = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {[c * 0.95, c * 0.70, c * 0.48].map((r, i) => (
        <div key={i} style={{ position: 'absolute', top: `${c - r}px`, right: `${c - r}px`, bottom: `${c - r}px`, left: `${c - r}px`, borderRadius: '50%', border: `0.5px solid rgba(155,92,255,${0.08 + i * 0.07})` }} />
      ))}
      <svg style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 4px rgba(185,139,255,0.65))' }} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M${c} ${c*0.07} L${c+c*0.045} ${c-c*0.055} L${c*1.93} ${c} L${c+c*0.045} ${c+c*0.055} L${c} ${c*1.93} L${c-c*0.045} ${c+c*0.055} L${c*0.07} ${c} L${c-c*0.045} ${c-c*0.055} Z`} fill="rgba(220,200,255,0.92)" />
        <circle cx={c} cy={c} r={c * 0.065} fill="white" opacity="0.95" />
      </svg>
    </div>
  )
}

// ─── Pinterest outfit inspo strip ────────────────────────────────────────────
const OUTFIT_PINS = [
  { src: 'https://i.pinimg.com/736x/43/c1/04/43c10408dafe7a122c4bfbff3b2a2f99.jpg', label: 'Chic Workwear' },
  { src: 'https://i.pinimg.com/736x/0b/f7/2f/0bf72f36fe8ef8c3e2260069ebc7c9b8.jpg', label: 'Business Casual' },
  { src: 'https://i.pinimg.com/736x/9e/22/4e/9e224e109889a66d84689073f5fd3453.jpg', label: 'Old Money' },
  { src: 'https://i.pinimg.com/736x/90/a0/83/90a083f4aa1d32c00d420bfdd3baa212.jpg', label: 'Classy' },
  { src: 'https://i.pinimg.com/736x/98/40/10/984010c8f122ff9fc08d9a918d91173a.jpg', label: 'Wide-Leg' },
  { src: 'https://i.pinimg.com/736x/dd/85/71/dd8571499b11785dd01ecf717acb0465.jpg', label: 'Effortless' },
  { src: 'https://i.pinimg.com/736x/0f/ab/ab/0fabab24cecd50492cc8a572b5665ae0.jpg', label: 'Office Chic' },
]

function StyleVisual() {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: '4px 0' }}>
      {/* Scrollable outfit strip */}
      <div style={{
        display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch', paddingBottom: 2,
      }}>
        {OUTFIT_PINS.map((pin, i) => (
          <div key={i} style={{ flexShrink: 0, position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pin.src}
              alt={pin.label}
              style={{
                width: 54, height: 72, objectFit: 'cover',
                borderRadius: 9, display: 'block',
                border: '1px solid rgba(220,190,140,0.15)',
              }}
            />
          </div>
        ))}
      </div>
      {/* Pinterest credit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, flexShrink: 0 }}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="#E60023"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
        <span style={{ fontSize: 8, color: 'white', fontWeight: 600, letterSpacing: '0.04em' }}>PINTEREST INSPO</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Today  (4 compact cards, no scroll, fits iPhone 14)
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_TASKS = [
  { id: 'f1', title: 'Reply to priority client email', source: 'Work'     },
  { id: 'f2', title: 'Finish DRYP task',               source: 'DRYPHub' },
  { id: 'f3', title: 'Plan one clear work block',       source: 'Calendar'},
]

function Slide1({
  greeting, moon, heroBg, heroTagline, topTasks, calEvents, dataLoaded,
}: {
  greeting: string; moon: typeof MOON_PHASES[0]
  heroBg: string; heroTagline: string
  topTasks: HomeTask[]; calEvents: HomeCalEvent[]; dataLoaded: boolean
}) {
  const tasks     = (dataLoaded && topTasks.length > 0) ? topTasks.slice(0, 3) : FALLBACK_TASKS
  const nextEvent = calEvents[0] ?? null

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: '100%' }}>

      {/* Hero — background + tagline swap with time of day */}
      <LunaHeroCard backgroundImage={heroBg} className="p-5 lg:p-6" >
        <p style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.15, margin: '0 0 6px', textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}>
          {greeting}, Zoe ✦
        </p>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1.4, margin: '0 0 10px', textShadow: '0 2px 10px rgba(0,0,0,0.45)', whiteSpace: 'pre-line' }}>
          {heroTagline}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12 }}>{moon.emoji}</span>
          <p style={{ fontSize: 11, color: 'white', margin: 0, lineHeight: 1.3, textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}>
            {moon.name} · {moon.pct}% illuminated
          </p>
        </div>
      </LunaHeroCard>

      {/* Today's Top 3 + Next Event */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div style={{ ...G, borderRadius: 22, padding: '12px 13px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Target style={{ width: 10, height: 10 }} />Today's Top 3</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 7 }}>
            {tasks.map((t, i) => (
              <div key={'id' in t ? t.id : i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: 'rgba(155,92,255,0.22)', border: '1px solid rgba(155,92,255,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: 'white' }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 12, color: 'white', margin: 0, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.title}</p>
              </div>
            ))}
          </div>
          <Link href="/tasks" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 10.5, color: 'white', fontWeight: 600 }}>View all tasks →</span>
          </Link>
        </div>

        <div style={{ ...G, borderRadius: 22, padding: '12px 13px', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Calendar style={{ width: 10, height: 10 }} />Next Event</div>
          <p style={{ fontSize: 16, fontWeight: 900, color: 'white', margin: '0 0 3px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextEvent?.title ?? 'Client Call'}
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: '0 0 3px' }}>
            Today · {nextEvent?.startTime ?? '1:30 PM'}
          </p>
          <p style={{ fontSize: 10.5, color: 'white', margin: '0 0 auto', lineHeight: 1.4 }}>
            Prep 15 minutes before.
          </p>
          <Link href="/calendar" style={{ textDecoration: 'none', marginTop: 8 }}>
            <div style={{ padding: '6px', background: 'rgba(155,92,255,0.10)', border: '1px solid rgba(155,92,255,0.18)', borderRadius: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 10.5, color: 'white', fontWeight: 600 }}>View details →</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1B — Focus  (Quick Actions + LUNA'S MESSAGE, split out of Slide 1 so
// neither slide needs to scroll on smaller phones)
// ─────────────────────────────────────────────────────────────────────────────
function Slide1B({ guidance, lunaMessage, lmLoading }: {
  guidance: GuidanceData | null
  lunaMessage: { message: string; affirmation: string } | null; lmLoading: boolean
}) {
  const [messageExpanded, setMessageExpanded] = useState(false)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4" style={{ minHeight: '100%' }}>

      {/* Quick Actions */}
      <div style={{ ...G, borderRadius: 22, padding: '13px 14px', alignSelf: 'start' }}>
        <div style={LBL}><Zap style={{ width: 10, height: 10 }} />Quick Actions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
          <LunaActionTile icon={<Mic size={16} strokeWidth={1.6} />} label="Dictate" href="/luna?tab=dictate" />
          <LunaActionTile icon={<Brain size={16} strokeWidth={1.6} />} label="Brain Dump" href="/brain-dump" />
          <LunaActionTile icon={<Calendar size={16} strokeWidth={1.6} />} label="Plan My Day" href="/plan-my-day" />
          <LunaActionTile icon={<Plus size={16} strokeWidth={1.6} />} label="New Task" href="/tasks" />
        </div>
      </div>

      {/* LUNA'S MESSAGE */}
      <div style={{ ...G, borderRadius: 26, padding: '20px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={LBL}><span>✦</span>LUNA'S MESSAGE</div>
        {lmLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[100, 100, 82].map((w, i) => (
              <div key={i} style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.07)', width: `${w}%` }} />
            ))}
          </div>
        ) : (
          <p style={{
            fontSize: 14, color: 'white', lineHeight: 1.65, margin: '0 0 10px',
            overflow: messageExpanded ? 'visible' : 'hidden',
            display: messageExpanded ? 'block' : '-webkit-box',
            WebkitLineClamp: messageExpanded ? 'unset' : 6, WebkitBoxOrient: 'vertical',
          }}>
            {lunaMessage?.message ?? guidance?.energy ?? 'Your energy needs structure before speed. Pick one priority, answer the message that unlocks work, and protect your body before you start spiraling.'}
            {messageExpanded && (lunaMessage?.affirmation ?? guidance?.affirmation) && (
              <><br /><br />{lunaMessage?.affirmation ?? guidance?.affirmation}</>
            )}
          </p>
        )}

        <div style={{ flex: 1, minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/brand/ui/luna-star-sigil.png" alt="" style={{ width: 96, height: 96, objectFit: 'contain', animation: 'breathe 4s ease-in-out infinite' }} />
        </div>

        <button
          onClick={() => setMessageExpanded(v => !v)}
          style={{
            alignSelf: 'flex-start', marginTop: 'auto',
            padding: '9px 18px', borderRadius: 999,
            background: 'rgba(155,92,255,0.14)', border: '1px solid var(--luna-border)',
            cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'white',
          }}
        >
          {messageExpanded ? 'Show less ←' : 'Tell me more →'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Daily Previews  (2×2 grid, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
function PreviewCard({ label, icon, href, linkText, children }: {
  label: string; icon: React.ReactNode; href: string; linkText: string; children: React.ReactNode
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex' }}>
      <div style={{ ...G, borderRadius: 24, padding: '13px 14px 11px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={LBL}>{icon}{label}</div>
        {children}
        <span style={{ fontSize: 10.5, color: 'white', fontWeight: 600, marginTop: 5, flexShrink: 0 }}>{linkText} →</span>
      </div>
    </Link>
  )
}

interface MoonPreviewData { phase?: { name: string; emoji?: string }; sign?: { name: string; emoji?: string } }
interface MoneyPreviewData { bills_due_soon?: unknown[]; has_transactions?: boolean; spending_this_week?: number }
interface StylePreviewData { hasProfile: boolean; summary?: string }

function Slide2({ guidance, moonData, moneyData, styleData }: {
  guidance: GuidanceData | null
  moonData: MoonPreviewData | null
  moneyData: MoneyPreviewData | null
  styleData: StylePreviewData | null
}) {
  const astroHeadline = moonData?.sign?.name
    ? `${moonData.sign.name} Moon`
    : moonData?.phase?.name ?? 'Astrology'

  return (
    <div style={{ minHeight: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8 }}>
      <PreviewCard label="Astrology Preview" icon={<Moon style={{ width: 9, height: 9 }} />} href="/astrology" linkText="Open Astrology">
        <img src="/brand/ui/crescent-preview.png" alt="" style={{ width: 56, height: 56, margin: '4px auto 8px', objectFit: 'contain', animation: 'float 6s ease-in-out infinite' }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>{astroHeadline}</p>
        <p style={{ fontSize: 10.5, color: 'white', margin: '3px 0 0', lineHeight: 1.4, flexShrink: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {guidance?.moon_note ?? 'Emotional clarity · intuition · home'}
        </p>
      </PreviewCard>

      <PreviewCard
        label="Style Preview" icon={<Scissors style={{ width: 9, height: 9 }} />}
        href={styleData?.hasProfile ? '/creative' : '/atelier/style-board'}
        linkText={styleData?.hasProfile ? 'Open Atelier' : 'Pick your style'}
      >
        {styleData?.hasProfile ? (
          <>
            <StyleVisual />
            <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>{styleData.summary ?? 'Your style profile'}</p>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.4 }}>Pick a few looks you like and LUNA will build your daily style from there.</p>
          </div>
        )}
      </PreviewCard>

      <PreviewCard label="Money Preview" icon={
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: 'white', lineHeight: 1 }}>$</span>
        </div>
      } href="/money/transactions" linkText="View">
        {moneyData?.has_transactions ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 5, paddingBottom: 3 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>
              {moneyData.bills_due_soon?.length ?? 0} bill{moneyData.bills_due_soon?.length === 1 ? '' : 's'} due<br />this week
            </p>
            <p style={{ fontSize: 9.5, color: 'white', margin: '6px 0 1px' }}>Spent this week</p>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'white', margin: 0 }}>${(moneyData.spending_this_week ?? 0).toFixed(2)}</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.4 }}>Connect your bank so LUNA can track bills and spending here.</p>
          </div>
        )}
      </PreviewCard>

      <PreviewCard label="Night Preview" icon={<Moon style={{ width: 9, height: 9 }} />} href="/night" linkText="View">
        <img src="/brand/ui/night-cloud.png" alt="" style={{ width: 84, height: 50, margin: '4px auto 8px', objectFit: 'contain', animation: 'float 7s ease-in-out infinite' }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Wind down tonight.</p>
        <p style={{ fontSize: 10.5, color: 'white', margin: '3px 0 0', lineHeight: 1.4, flexShrink: 0 }}>Plan tomorrow, protect your rest.</p>
      </PreviewCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Wellness & Energy  (gauge + flow chart + journal prompt, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
interface TodayCheckIn {
  sleep_rating?: number | null
  energy_rating?: number | null
  mood_rating?: number | null
  type?: string
  date?: string
}

function ratingLabel(n: number | null | undefined): { status: string; color: string } {
  if (n == null) return { status: 'Not logged', color: 'white' }
  if (n >= 8) return { status: 'Great', color: 'white' }
  if (n >= 5) return { status: 'Okay', color: 'white' }
  return { status: 'Low', color: 'white' }
}

function EnergyGauge({ pct = 78, size = 108 }: { pct?: number; size?: number }) {
  const stroke = size * 0.09
  const r = (size - stroke) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, animation: 'breathe 5s ease-in-out infinite' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(155,92,255,0.16)" strokeWidth={stroke} />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke="#8D5CFF" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(141,92,255,0.55))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color: 'white', lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: size * 0.085, fontWeight: 700, color: 'white', marginTop: 2 }}>Good Energy</span>
        <span style={{ fontSize: size * 0.09, marginTop: 2, color: 'white' }}>✦</span>
      </div>
    </div>
  )
}

function TodaysFlowChart() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{
        position: 'absolute', left: '46%', top: -6, transform: 'translateX(-50%)',
        padding: '3px 9px', borderRadius: 10, background: 'rgba(155,92,255,0.22)',
        border: '1px solid rgba(185,139,255,0.35)', whiteSpace: 'nowrap', zIndex: 2,
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: 'white' }}>Peak 4–6 PM</span>
      </div>
      <svg viewBox="0 0 320 70" width="100%" height="70" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <path
          d="M0,58 C40,56 60,52 90,44 C130,34 150,10 175,8 C200,10 220,34 250,46 C275,54 295,57 320,58"
          fill="none" stroke="#8D5CFF" strokeWidth="2.5" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 5px rgba(141,92,255,0.5))', animation: 'breathe 6s ease-in-out infinite' }}
        />
        <circle cx="175" cy="8" r="4" fill="#B58CFF" style={{ filter: 'drop-shadow(0 0 5px rgba(181,140,255,0.8))' }} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'].map(t => (
          <span key={t} style={{ fontSize: 8, color: 'white', fontWeight: 600 }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'white', display: 'flex', alignItems: 'center', gap: 3 }}><Moon style={{ width: 9, height: 9 }} />Rest</span>
        <span style={{ fontSize: 9, color: 'white', display: 'flex', alignItems: 'center', gap: 3 }}><Sun style={{ width: 9, height: 9 }} />Focus</span>
        <span style={{ fontSize: 9, color: 'white', display: 'flex', alignItems: 'center', gap: 3 }}><Moon style={{ width: 9, height: 9 }} />Wind Down</span>
      </div>
    </div>
  )
}

function Slide3({ checkIn, checkInLoading }: { checkIn: TodayCheckIn | null; checkInLoading: boolean }) {
  const sleep  = ratingLabel(checkIn?.sleep_rating)
  const energy = ratingLabel(checkIn?.energy_rating)
  const mood   = ratingLabel(checkIn?.mood_rating)
  const gaugePct = checkIn
    ? Math.round((((checkIn.sleep_rating ?? 5) + (checkIn.energy_rating ?? 5) + (checkIn.mood_rating ?? 5)) / 3) * 10)
    : 0

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Wellness & Energy */}
      <div style={{ ...G, borderRadius: 26, padding: '14px 15px', flex: 1, minHeight: 0 }}>
        <div style={LBL}><Heart style={{ width: 10, height: 10 }} />Wellness &amp; Energy</div>
        <p style={{ fontSize: 10.5, color: 'white', margin: '-4px 0 10px' }}>Your mind, body &amp; spirit today</p>
        {checkInLoading ? (
          <LunaLoadingState compact />
        ) : checkIn ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <EnergyGauge pct={gaugePct} size={104} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { icon: Moon, label: 'Sleep', value: checkIn.sleep_rating != null ? `${checkIn.sleep_rating}/10` : '—', ...sleep },
                { icon: Flame, label: 'Energy', value: checkIn.energy_rating != null ? `${checkIn.energy_rating}/10` : '—', ...energy },
                { icon: Heart, label: 'Mood', value: checkIn.mood_rating != null ? `${checkIn.mood_rating}/10` : '—', ...mood },
              ].map(({ icon: Icon, label, value, status, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'rgba(155,92,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 11, height: 11, color: 'white' }} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 10.5, fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>{label}</p>
                    <p style={{ fontSize: 9, color: 'white', margin: 0, lineHeight: 1.2 }}>{value}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 9.5, fontWeight: 700, color, margin: 0, lineHeight: 1.2 }}>{status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <LunaEmptyState
            icon={<Heart size={22} />}
            title="You haven't checked in today"
            message="Log a quick morning, midday, or night check-in and LUNA will track your real energy here."
            action={
              <Link href="/morning" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Check in now →</span>
              </Link>
            }
          />
        )}
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3B — Flow + Journal  (split out of Slide 3 so neither needs to scroll)
// ─────────────────────────────────────────────────────────────────────────────
function Slide3B() {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Today's Flow */}
      <div style={{ ...G, borderRadius: 22, padding: '13px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...LBL, marginBottom: 4 }}><Waves style={{ width: 10, height: 10 }} />Today's Flow</div>
          <Link href="/health" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 9.5, color: 'white', fontWeight: 600 }}>See full day →</span>
          </Link>
        </div>
        <p style={{ fontSize: 10, color: 'white', margin: '0 0 10px' }}>Energy throughout your day</p>
        <TodaysFlowChart />
      </div>

      {/* Daily Journal Prompt */}
      <Link href="/journal" style={{ textDecoration: 'none', flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{
          ...G, borderRadius: 22, padding: '13px 14px', flex: 1, minHeight: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(140deg, rgba(40,14,90,0.55) 0%, rgba(16,5,44,0.72) 100%)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={LBL}><PenLine style={{ width: 10, height: 10 }} />Daily Journal Prompt</div>
            <p style={{ fontSize: 9.5, color: 'white', margin: '-4px 0 8px' }}>For your reflection</p>
            <p style={{ fontSize: 12, color: 'white', fontStyle: 'italic', lineHeight: 1.45, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              "What is one area of my life that is asking for more patience?"
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #6B3DFF 0%, #8D5CFF 100%)',
              boxShadow: '0 0 18px rgba(109,60,255,0.35)',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>Start Journaling →</span>
            </div>
          </div>
          <BookOpen style={{ width: 44, height: 44, color: 'white', flexShrink: 0, animation: 'breathe 9s ease-in-out infinite' }} strokeWidth={1.3} />
        </div>
      </Link>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Energy Reset  (decision flow: 5 compact cards, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const RESET_MODES = [
  { label: 'I woke up late',     mode: 'recovery' },
  { label: "I'm rushing",        mode: 'rush'     },
  { label: 'I feel overwhelmed', mode: 'ground'   },
  { label: 'I need softness',    mode: 'soft'     },
]

function Slide4({ topTasks }: { topTasks: HomeTask[] }) {
  const [bodyDone,   setBodyDone]   = useState<Set<string>>(new Set())
  const [focusDone,  setFocusDone]  = useState(false)

  function toggleBody(item: string) {
    setBodyDone(prev => { const n = new Set(prev); n.has(item) ? n.delete(item) : n.add(item); return n })
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* 1. Energy Read Card — large main card */}
      <div style={{
        ...G,
        background: 'linear-gradient(140deg, rgba(50,25,100,0.75) 0%, rgba(20,10,55,0.82) 100%)',
        border: '1px solid rgba(155,92,255,0.22)',
        borderRadius: 24, padding: '12px 14px',
        flexShrink: 0, boxShadow: '0 0 28px rgba(100,50,200,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div style={LBL}><Zap style={{ width: 9, height: 9 }} />ENERGY READ</div>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: '0 0 4px', lineHeight: 1.25 }}>
          Scattered but capable
        </p>
        <p style={{ fontSize: 11, color: 'white', lineHeight: 1.55, margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          Your mind is moving faster than your body. Start with grounding, then choose one clean action.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {[['Mood', '🫧 scattered'], ['Energy', 'medium'], ['Sleep', '7h 24m'], ['Support', 'grounding']].map(([k, v]) => (
            <div key={k} style={{ padding: '3px 8px', borderRadius: 24, background: 'rgba(155,92,255,0.14)', border: '1px solid rgba(155,92,255,0.22)' }}>
              <span style={{ fontSize: 9, color: 'white', fontWeight: 600 }}>{k}: </span>
              <span style={{ fontSize: 9, color: 'white', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2+3. Body Basics + Focus Reset — side by side row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        {/* Body Basics */}
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px' }}>
          <div style={LBL}><Sparkles style={{ width: 9, height: 9 }} />BODY BASICS</div>
          <p style={{ fontSize: 10, color: 'white', margin: '0 0 7px', lineHeight: 1.4 }}>
            You need water + food before decisions.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['💧 Water', '🍽 Food', '🚿 Shower', '☀️ Sunlight'].map(item => (
              <button key={item} onClick={() => toggleBody(item)} style={{ padding: '3px 7px', borderRadius: 11, border: `1px solid ${bodyDone.has(item) ? 'rgba(138,184,138,0.45)' : 'rgba(255,255,255,0.09)'}`, background: bodyDone.has(item) ? 'rgba(138,184,138,0.14)' : 'rgba(255,255,255,0.04)', color: bodyDone.has(item) ? '#8AB88A' : 'rgba(255,255,255,0.50)', fontSize: 9, fontWeight: 600, cursor: 'pointer', textDecoration: bodyDone.has(item) ? 'line-through' : 'none' }}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Reset */}
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Target style={{ width: 9, height: 9 }} />FOCUS RESET</div>
          <p style={{ fontSize: 10, color: 'white', margin: '0 0 4px', lineHeight: 1.4 }}>
            One 25-min block. No multitasking.
          </p>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'white', margin: '0 0 auto', lineHeight: 1.35 }}>
            {topTasks[0]?.title ?? 'No priority task set — add one'}
          </p>
          <button onClick={() => setFocusDone(!focusDone)} style={{ marginTop: 7, padding: '5px 6px', borderRadius: 13, border: `1px solid ${focusDone ? 'rgba(138,184,138,0.38)' : 'rgba(155,92,255,0.32)'}`, background: focusDone ? 'rgba(138,184,138,0.12)' : 'rgba(155,92,255,0.12)', color: focusDone ? '#8AB88A' : '#b98bff', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>
            {focusDone ? '✓ Done' : 'Start focus block →'}
          </button>
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4B — Reset Mode + Home Energy  (split out of Slide 4 so neither
// needs to scroll)
// ─────────────────────────────────────────────────────────────────────────────
function Slide4B() {
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [homeDone,   setHomeDone]   = useState(false)

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Choose Reset Mode — compact 4-button card */}
      <div style={{ ...G, borderRadius: 22, padding: '10px 12px', flexShrink: 0 }}>
        <div style={LBL}><Moon style={{ width: 9, height: 9 }} />CHOOSE RESET MODE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {RESET_MODES.map(({ label, mode }) => (
            <button key={mode} onClick={() => setActiveMode(activeMode === mode ? null : mode)} style={{ padding: '6px 8px', borderRadius: 14, border: `1px solid ${activeMode === mode ? 'rgba(155,92,255,0.45)' : 'rgba(255,255,255,0.08)'}`, background: activeMode === mode ? 'rgba(155,92,255,0.18)' : 'rgba(255,255,255,0.03)', color: activeMode === mode ? '#b98bff' : 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3 }}>
              {label}
            </button>
          ))}
        </div>
        {activeMode && (
          <p style={{ fontSize: 10, color: 'white', margin: '6px 0 0', lineHeight: 1.4 }}>
            {activeMode === 'recovery' ? '🌿 Recovery Mode: gentle, slow, restore.' :
             activeMode === 'rush'     ? '⚡ Rush Mode: single task, protect energy.' :
             activeMode === 'ground'   ? '🌍 Grounding: breathe, body first, then one step.' :
             '🌸 Soft Start: permission to be slow and still get it done.'}
          </p>
        )}
      </div>

      {/* Home Energy Card */}
      <div style={{ ...G, borderRadius: 22, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={LBL}><Star style={{ width: 9, height: 9 }} />HOME ENERGY</div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'white', margin: '0 0 1px' }}>Small reset. Big energy.</p>
          <p style={{ fontSize: 10, color: 'white', margin: 0 }}>Start one load of laundry</p>
        </div>
        <button onClick={() => setHomeDone(!homeDone)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 14, border: `1px solid ${homeDone ? 'rgba(138,184,138,0.38)' : 'rgba(155,92,255,0.30)'}`, background: homeDone ? 'rgba(138,184,138,0.12)' : 'rgba(155,92,255,0.12)', color: homeDone ? '#8AB88A' : '#b98bff', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {homeDone ? '✓ Done' : 'Start task →'}
        </button>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Weekly / Growth  (5 cards, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
// Same source of truth as /vault — no second hardcoded parked-items list.
const PARKED = VAULT_CATEGORIES.flatMap(c => c.items)
  .filter(i => i.status === 'parked')
  .slice(0, 3)
  .map(i => i.name)

function Slide5({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Weekly Focus — redesigned hero tile */}
      <div style={{
        borderRadius: 26, padding: '14px 16px 12px',
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(148deg, rgba(58,18,115,0.90) 0%, rgba(28,8,78,0.94) 50%, rgba(10,4,38,0.97) 100%)',
        border: '1px solid rgba(185,139,255,0.20)',
        boxShadow: '0 0 48px rgba(100,40,210,0.18), inset 0 1px 0 rgba(255,255,255,0.07)',
        position: 'relative',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
      }}>
        {/* Glow orb top-right */}
        <div style={{ position: 'absolute', top: -28, right: -28, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle, rgba(160,100,255,0.22) 0%, transparent 68%)', pointerEvents: 'none' }} />
        {/* Glow orb bottom-left */}
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,50,200,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ ...LBL, marginBottom: 0 }}><Target style={{ width: 9, height: 9 }} />Weekly Focus</div>
          <div style={{ padding: '3px 10px', borderRadius: 24, background: 'rgba(155,92,255,0.22)', border: '1px solid rgba(185,139,255,0.24)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.08em' }}>
              WK {Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000)}
            </span>
          </div>
        </div>

        {/* Center sigil */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <StarSigil size={48} />
        </div>

        {/* Focus declaration */}
        <p style={{ fontSize: 17, fontWeight: 900, color: 'white', margin: '0 0 5px', lineHeight: 1.22, textAlign: 'center', letterSpacing: '-0.01em', position: 'relative', zIndex: 1, flexShrink: 0 }}>
          One lane gets your<br />energy this week.
        </p>

        {/* Affirmation */}
        <p style={{ fontSize: 11, color: 'white', margin: '0 0 auto', lineHeight: 1.6, textAlign: 'center', fontStyle: 'italic', position: 'relative', zIndex: 1, flexShrink: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {guidance?.affirmation ?? 'Finish what unlocks momentum.'}
        </p>

        {/* Week day progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {['M','T','W','T','F','S','S'].map((day, i) => {
            const jsDay = new Date().getDay()
            const weekPos = jsDay === 0 ? 6 : jsDay - 1
            const isPast  = i < weekPos
            const isToday = i === weekPos
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: isToday ? 9 : 6, height: isToday ? 9 : 6, borderRadius: '50%', background: isToday ? '#b98bff' : isPast ? 'rgba(155,92,255,0.58)' : 'rgba(255,255,255,0.10)', boxShadow: isToday ? '0 0 8px rgba(185,139,255,0.60)' : 'none', transition: 'all 0.2s' }} />
                <span style={{ fontSize: 7.5, fontWeight: 700, color: isToday ? '#b98bff' : isPast ? 'rgba(185,139,255,0.38)' : 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>{day}</span>
              </div>
            )
          })}
        </div>

        {/* Theme pills */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10, flexShrink: 0, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {['Refinement', 'Visibility', 'Momentum'].map((theme, i) => (
            <div key={theme} style={{ padding: '3px 10px', borderRadius: 24, background: `rgba(155,92,255,${0.12 + i * 0.04})`, border: '1px solid rgba(185,139,255,0.16)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: '0.04em' }}>{theme}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5B — Lesson/Upcoming + Parked + Reset  (split out of Slide 5 so
// neither needs to scroll)
// ─────────────────────────────────────────────────────────────────────────────
function Slide5B({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Lesson + Upcoming row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px' }}>
          <div style={LBL}><BookOpen style={{ width: 9, height: 9 }} />LESSON</div>
          <p style={{ fontSize: 10, color: 'white', lineHeight: 1.55, margin: 0, fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            {guidance?.shadow_question ?? 'Recognition over chasing. Speak clearly, then let the right doors open.'}
          </p>
        </div>
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px' }}>
          <div style={LBL}><Calendar style={{ width: 9, height: 9 }} />UPCOMING ENERGY</div>
          <p style={{ fontSize: 10, color: 'white', lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            This week favors refinement, planning, and one brave visible step.
          </p>
        </div>
      </div>

      {/* Parked Priorities */}
      <div style={{ ...G, borderRadius: 22, padding: '10px 12px', flexShrink: 0 }}>
        <div style={LBL}><Star style={{ width: 9, height: 9 }} />PARKED PRIORITIES</div>
        <p style={{ fontSize: 10, color: 'white', margin: '0 0 7px' }}>Your ideas are safe here.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PARKED.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#9b5cff', flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'white', margin: 0, lineHeight: 1.3 }}>{p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Reset button */}
      <Link href="/luna" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{
          ...G,
          borderRadius: 22, padding: '12px 16px',
          background: 'rgba(155,92,255,0.14)', border: '1px solid rgba(155,92,255,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 0 18px rgba(100,50,200,0.08)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Plan my week →</span>
          <Star style={{ width: 14, height: 14, color: 'white' }} />
        </div>
      </Link>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TAB_TO_SLIDE: Record<string, number> = { today: 0, previews: 2, wellness: 3, energy: 5, weekly: 7 }

function HomePageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [activeSlide, setActiveSlide] = useState(TAB_TO_SLIDE[initialTab ?? ''] ?? 0)
  // Starts null so server-render and the first client-render match exactly
  // (both fall back to the same neutral bucket) — the real local hour is set
  // client-only in the effect below, avoiding a server(UTC)/client(local) mismatch.
  const [hour,       setHour]       = useState<number | null>(null)
  const [guidance,   setGuidance]   = useState<GuidanceData | null>(null)
  const [gLoading,   setGLoading]   = useState(true)
  const [lunaMessage, setLunaMessage] = useState<{ message: string; affirmation: string } | null>(null)
  const [lmLoading,  setLmLoading]  = useState(true)
  const [calEvents,  setCalEvents]  = useState<HomeCalEvent[]>([])
  const [topTasks,   setTopTasks]   = useState<HomeTask[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [moonData,   setMoonData]   = useState<{ phase?: { name: string; emoji?: string }; sign?: { name: string; emoji?: string } } | null>(null)
  const [moneyData,  setMoneyData]  = useState<{ bills_due_soon?: unknown[]; has_transactions?: boolean; spending_this_week?: number } | null>(null)
  const [styleData,  setStyleData]  = useState<{ hasProfile: boolean; summary?: string } | null>(null)
  const [checkIn,    setCheckIn]    = useState<TodayCheckIn | null>(null)
  const [checkInLoading, setCheckInLoading] = useState(true)

  useEffect(() => {
    setHour(new Date().getHours())
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(() => {
    setGLoading(true)
    fetch('/api/astrology/daily-guidance')
      .then(r => r.json()).then(d => setGuidance(d)).catch(() =>
        fetch('/api/ai/spiritual-guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
          .then(r => r.json()).then(d => setGuidance(d)).catch(() => {})
      ).finally(() => setGLoading(false))
    setLmLoading(true)
    fetch(`/api/luna/daily-message?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      .then(r => r.json()).then(d => setLunaMessage(d)).catch(() => {}).finally(() => setLmLoading(false))
    fetch('/api/home/summary')
      .then(r => r.json())
      .then(d => {
        if (d.calendar?.today) setCalEvents(d.calendar.today)
        if (d.tasks?.top)      setTopTasks(d.tasks.top)
      }).catch(() => {}).finally(() => setDataLoaded(true))
    fetch(`/api/astrology/moon?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      .then(r => r.json()).then(d => setMoonData(d)).catch(() => {})
    fetch('/api/money/summary')
      .then(r => r.json()).then(d => setMoneyData(d)).catch(() => {})
    fetch('/api/atelier/style-profile')
      .then(r => r.json()).then(d => setStyleData(d)).catch(() => {})
    setCheckInLoading(true)
    fetch('/api/check-ins?limit=5')
      .then(r => r.json())
      .then((d: { checkIns?: (TodayCheckIn & { created_at?: string })[] }) => {
        const todayKey = new Date().toDateString()
        const today = (d.checkIns ?? []).find(c => c.created_at && new Date(c.created_at).toDateString() === todayKey)
        setCheckIn(today ?? null)
      }).catch(() => {}).finally(() => setCheckInLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const moon        = getMoonPhase()
  // Neutral fallback (noon) until the client-only effect sets the real local hour —
  // keeps server render and first client render identical, no hydration mismatch.
  const effectiveHour = hour ?? 12
  const greeting    = getGreeting(effectiveHour)
  const heroBg       = getHeroBackground(effectiveHour)
  const heroTagline  = getHeroTagline(effectiveHour)

  const pages = [
    {
      id: 'today', label: 'Today', noScroll: true,
      content: <Slide1 greeting={greeting} moon={moon} heroBg={heroBg} heroTagline={heroTagline} topTasks={topTasks} calEvents={calEvents} dataLoaded={dataLoaded} />,
    },
    {
      id: 'focus', label: 'Focus', noScroll: true,
      content: <Slide1B guidance={guidance} lunaMessage={lunaMessage} lmLoading={lmLoading} />,
    },
    { id: 'previews', label: 'Previews', noScroll: true, content: <Slide2 guidance={guidance} moonData={moonData} moneyData={moneyData} styleData={styleData} /> },
    { id: 'wellness', label: 'Wellness', noScroll: true, content: <Slide3 checkIn={checkIn} checkInLoading={checkInLoading} /> },
    { id: 'flow',     label: 'Flow',     noScroll: true, content: <Slide3B /> },
    { id: 'energy',   label: 'Energy',   noScroll: true, content: <Slide4 topTasks={topTasks} /> },
    { id: 'reset',    label: 'Reset',    noScroll: true, content: <Slide4B /> },
    { id: 'weekly',   label: 'Weekly',   noScroll: true, content: <Slide5 guidance={guidance} /> },
    { id: 'parked',   label: 'Parked',   noScroll: true, content: <Slide5B guidance={guidance} /> },
  ]

  return (
    <LunaShell noScroll wide>
      <LunaSwipePager pages={pages} hidePills accentColor="#9b5cff" activeIndex={activeSlide} onChangeIndex={setActiveSlide} pageNoScroll />
    </LunaShell>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  )
}
