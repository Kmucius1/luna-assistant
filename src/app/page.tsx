'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { SwipeContainer } from '@/components/layout/SwipeContainer'
import { BottomNav } from '@/components/layout/BottomNav'
import { DesktopHeader } from '@/components/layout/DesktopHeader'
import { DesktopSidebar } from '@/components/layout/DesktopSidebar'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { CategoryPager } from '@/components/ui/CategoryPager'
import {
  Star, Moon, Sparkles, Target, Calendar,
  Mic, Brain, Zap, Check, Loader2,
  BookOpen, Scissors, Plus,
  Heart, Droplet, Flame, TrendingUp, Waves, PenLine, Sun,
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
function getGreeting(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Shared glass card style ──────────────────────────────────────────────────
const G: React.CSSProperties = {
  background: 'rgba(20,12,50,0.68)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
}

// ─── Section label inside cards ───────────────────────────────────────────────
const LBL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#8B6FB8',
  display: 'flex', alignItems: 'center', gap: 5,
  marginBottom: 8, flexShrink: 0,
}

// ─── Star sigil ───────────────────────────────────────────────────────────────
function StarSigil({ size = 52 }: { size?: number }) {
  const c = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {[c * 0.95, c * 0.70, c * 0.48].map((r, i) => (
        <div key={i} style={{ position: 'absolute', top: `${c - r}px`, right: `${c - r}px`, bottom: `${c - r}px`, left: `${c - r}px`, borderRadius: '50%', border: `0.5px solid rgba(139,111,184,${0.08 + i * 0.07})` }} />
      ))}
      <svg style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 4px rgba(196,169,232,0.65))' }} viewBox={`0 0 ${size} ${size}`}>
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
        <span style={{ fontSize: 8, color: 'rgba(220,190,140,0.45)', fontWeight: 600, letterSpacing: '0.04em' }}>PINTEREST INSPO</span>
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
  greeting, moon, guidance, gLoading, topTasks, calEvents, dataLoaded,
}: {
  greeting: string; moon: typeof MOON_PHASES[0]
  guidance: GuidanceData | null; gLoading: boolean
  topTasks: HomeTask[]; calEvents: HomeCalEvent[]; dataLoaded: boolean
}) {
  const tasks     = (dataLoaded && topTasks.length > 0) ? topTasks.slice(0, 3) : FALLBACK_TASKS
  const nextEvent = calEvents[0] ?? null
  const [messageExpanded, setMessageExpanded] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'hidden' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{
        ...G,
        border: '1px solid rgba(139,111,184,0.18)',
        borderRadius: 28, padding: '16px 18px 14px',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexShrink: 0, minHeight: 128,
      }}>
        <img
          src="/brand/backgrounds/hero-moon-card-mobile.png"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, rgba(16,5,44,0.72) 0%, rgba(16,5,44,0.28) 60%, rgba(16,5,44,0.10) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, flex: 1, paddingRight: 6 }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.15, margin: '0 0 6px' }}>
            {greeting}, Zoe ✦
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#B99CFF', lineHeight: 1.4, margin: '0 0 10px' }}>
            You are not behind.<br />You are becoming.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>{moon.emoji}</span>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.62)', margin: 0, lineHeight: 1.3 }}>
              {moon.name} · {moon.pct}% illuminated
            </p>
          </div>
        </div>
      </div>

      {/* ── LUNA's Message ────────────────────────────────────────────── */}
      <div style={{ ...G, borderRadius: 24, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={LBL}><span>✦</span>LUNA'S MESSAGE</div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[100, 100, 82].map((w, i) => (
                <div key={i} style={{ height: 9, borderRadius: 4, background: 'rgba(255,255,255,0.07)', width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, margin: '0 0 7px',
              overflow: messageExpanded ? 'visible' : 'hidden',
              display: messageExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: messageExpanded ? 'unset' : 3, WebkitBoxOrient: 'vertical',
            }}>
              {guidance?.energy ?? 'Your energy needs structure before speed. Pick one priority and protect your body before you start spiraling.'}
              {messageExpanded && guidance?.affirmation && (
                <><br /><br />{guidance.affirmation}</>
              )}
            </p>
          )}
          <button
            onClick={() => setMessageExpanded(v => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#8B6FB8' }}
          >
            {messageExpanded ? 'Show less ←' : 'Tell me more →'}
          </button>
        </div>
        <img src="/brand/ui/luna-message-star.png" alt="" style={{ width: 52, height: 52, flexShrink: 0, objectFit: 'contain', animation: 'breathe 4s ease-in-out infinite' }} />
      </div>

      {/* ── Today's Top 3 + Next Event ────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr', gap: 8 }}>
        {/* Top 3 */}
        <div style={{ ...G, borderRadius: 22, padding: '12px 13px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Target style={{ width: 10, height: 10 }} />Today's Top 3</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 7 }}>
            {tasks.map((t, i) => (
              <div key={'id' in t ? t.id : i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, background: 'rgba(139,111,184,0.22)', border: '1px solid rgba(139,111,184,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#C4A9E8' }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', margin: 0, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.title}</p>
              </div>
            ))}
          </div>
          <Link href="/tasks" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 10.5, color: '#8B6FB8', fontWeight: 600 }}>View all tasks →</span>
          </Link>
        </div>

        {/* Next Event */}
        <div style={{ ...G, borderRadius: 22, padding: '12px 13px', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Calendar style={{ width: 10, height: 10 }} />Next Event</div>
          <p style={{ fontSize: 16, fontWeight: 900, color: 'white', margin: '0 0 3px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextEvent?.title ?? 'Client Call'}
          </p>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6FB8', margin: '0 0 3px' }}>
            Today · {nextEvent?.startTime ?? '1:30 PM'}
          </p>
          <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.32)', margin: '0 0 auto', lineHeight: 1.4 }}>
            Prep 15 minutes before.
          </p>
          <Link href="/calendar" style={{ textDecoration: 'none', marginTop: 8 }}>
            <div style={{ padding: '6px', background: 'rgba(139,111,184,0.10)', border: '1px solid rgba(139,111,184,0.18)', borderRadius: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 10.5, color: '#8B6FB8', fontWeight: 600 }}>View details →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div style={{ ...G, borderRadius: 22, padding: '11px 14px', flexShrink: 0 }}>
        <div style={LBL}><Zap style={{ width: 10, height: 10 }} />Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { icon: Mic,      label: 'Dictate',  href: '/luna?tab=dictate' },
            { icon: Brain,    label: 'Brain Dump', href: '/brain-dump'     },
            { icon: Calendar, label: 'Plan My Day', href: '/plan-my-day'   },
            { icon: Plus,     label: 'New Task', href: '/tasks'            },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '9px 2px', borderRadius: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon style={{ width: 15, height: 15, color: 'rgba(196,169,232,0.72)' }} strokeWidth={1.6} />
                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.46)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
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
        <span style={{ fontSize: 10.5, color: '#8B6FB8', fontWeight: 600, marginTop: 5, flexShrink: 0 }}>{linkText} →</span>
      </div>
    </Link>
  )
}

function Slide2({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8 }}>
      <PreviewCard label="Astrology Preview" icon={<Moon style={{ width: 9, height: 9 }} />} href="/astrology" linkText="Open Astrology">
        <img src="/brand/ui/crescent-preview.png" alt="" style={{ width: 56, height: 56, margin: '4px auto 8px', objectFit: 'contain', animation: 'float 6s ease-in-out infinite' }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Moon in Cancer</p>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', margin: '3px 0 0', lineHeight: 1.4, flexShrink: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {guidance?.moon_note ?? 'Emotional clarity · intuition · home'}
        </p>
      </PreviewCard>

      <PreviewCard label="Style Preview" icon={<Scissors style={{ width: 9, height: 9 }} />} href="/creative" linkText="Open Atelier">
        <StyleVisual />
        <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Soft power dressing</p>
        <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.40)', margin: '3px 0 0', lineHeight: 1.3, flexShrink: 0 }}>Neutrals · Structure · Effortless</p>
      </PreviewCard>

      <PreviewCard label="Money Preview" icon={
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: 'white', lineHeight: 1 }}>$</span>
        </div>
      } href="/money/transactions" linkText="View">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 5, paddingBottom: 3 }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>2 bills due<br />this week</p>
          <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.32)', margin: '6px 0 1px' }}>Total</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: '#4ADE80', margin: 0 }}>$320.00</p>
        </div>
      </PreviewCard>

      <PreviewCard label="Night Preview" icon={<Moon style={{ width: 9, height: 9 }} />} href="/night" linkText="View">
        <img src="/brand/ui/night-cloud.png" alt="" style={{ width: 84, height: 50, margin: '4px auto 8px', objectFit: 'contain', animation: 'float 7s ease-in-out infinite' }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Protect tomorrow.</p>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', margin: '3px 0 0', lineHeight: 1.4, flexShrink: 0 }}>Wind down. Rest. Reset.</p>
      </PreviewCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Wellness & Energy  (gauge + flow chart + journal prompt, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const ENERGY_STATS = [
  { icon: Moon,        label: 'Sleep',       value: '7h 42m',   status: 'Good',        delta: '↑ 12%', color: '#6BE38B' },
  { icon: Droplet,     label: 'Hydration',   value: '1.6 L',    status: 'On Track',    delta: '↑ 8%',  color: '#B7AED6' },
  { icon: Flame,       label: 'Movement',    value: '6,421 steps', status: 'Good',     delta: '↑ 15%', color: '#6BE38B' },
  { icon: TrendingUp,  label: 'Energy Peak', value: '4:00 – 6:00 PM', status: 'Later Today', delta: 'Prepare for flow', color: '#E6B84A' },
]

function EnergyGauge({ pct = 78, size = 108 }: { pct?: number; size?: number }) {
  const stroke = size * 0.09
  const r = (size - stroke) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, animation: 'breathe 5s ease-in-out infinite' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(139,111,184,0.16)" strokeWidth={stroke} />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke="#8D5CFF" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(141,92,255,0.55))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color: 'white', lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: size * 0.085, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Good Energy</span>
        <span style={{ fontSize: size * 0.09, marginTop: 2, color: '#E6B84A' }}>✦</span>
      </div>
    </div>
  )
}

function TodaysFlowChart() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{
        position: 'absolute', left: '46%', top: -6, transform: 'translateX(-50%)',
        padding: '3px 9px', borderRadius: 10, background: 'rgba(139,111,184,0.22)',
        border: '1px solid rgba(196,169,232,0.35)', whiteSpace: 'nowrap', zIndex: 2,
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: '#C4A9E8' }}>Peak 4–6 PM</span>
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
          <span key={t} style={{ fontSize: 8, color: 'rgba(255,255,255,0.32)', fontWeight: 600 }}>{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'rgba(196,169,232,0.6)', display: 'flex', alignItems: 'center', gap: 3 }}><Moon style={{ width: 9, height: 9 }} />Rest</span>
        <span style={{ fontSize: 9, color: 'rgba(230,184,74,0.7)', display: 'flex', alignItems: 'center', gap: 3 }}><Sun style={{ width: 9, height: 9 }} />Focus</span>
        <span style={{ fontSize: 9, color: 'rgba(196,169,232,0.6)', display: 'flex', alignItems: 'center', gap: 3 }}><Moon style={{ width: 9, height: 9 }} />Wind Down</span>
      </div>
    </div>
  )
}

function Slide3() {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* 1. Wellness & Energy */}
      <div style={{ ...G, borderRadius: 26, padding: '14px 15px', flexShrink: 0 }}>
        <div style={LBL}><Heart style={{ width: 10, height: 10 }} />Wellness &amp; Energy</div>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.42)', margin: '-4px 0 10px' }}>Your mind, body &amp; spirit today</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <EnergyGauge pct={78} size={104} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ENERGY_STATS.map(({ icon: Icon, label, value, status, delta, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'rgba(139,111,184,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 11, height: 11, color: '#C4A9E8' }} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.2 }}>{label}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.40)', margin: 0, lineHeight: 1.2 }}>{value}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 9.5, fontWeight: 700, color, margin: 0, lineHeight: 1.2 }}>{status}</p>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.32)', margin: 0, lineHeight: 1.2 }}>{delta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Today's Flow */}
      <div style={{ ...G, borderRadius: 22, padding: '13px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...LBL, marginBottom: 4 }}><Waves style={{ width: 10, height: 10 }} />Today's Flow</div>
          <Link href="/health" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 9.5, color: '#8B6FB8', fontWeight: 600 }}>See full day →</span>
          </Link>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', margin: '0 0 10px' }}>Energy throughout your day</p>
        <TodaysFlowChart />
      </div>

      {/* 3. Daily Journal Prompt */}
      <Link href="/journal" style={{ textDecoration: 'none', flex: 1, minHeight: 0, display: 'flex' }}>
        <div style={{
          ...G, borderRadius: 22, padding: '13px 14px', flex: 1, minHeight: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(140deg, rgba(40,14,90,0.55) 0%, rgba(16,5,44,0.72) 100%)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={LBL}><PenLine style={{ width: 10, height: 10 }} />Daily Journal Prompt</div>
            <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)', margin: '-4px 0 8px' }}>For your reflection</p>
            <p style={{ fontSize: 12, color: 'rgba(196,169,232,0.88)', fontStyle: 'italic', lineHeight: 1.45, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
          <BookOpen style={{ width: 44, height: 44, color: 'rgba(196,169,232,0.55)', flexShrink: 0, animation: 'breathe 9s ease-in-out infinite' }} strokeWidth={1.3} />
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

function Slide4() {
  const [activeMode, setActiveMode] = useState<string | null>(null)
  const [bodyDone,   setBodyDone]   = useState<Set<string>>(new Set())
  const [focusDone,  setFocusDone]  = useState(false)
  const [homeDone,   setHomeDone]   = useState(false)

  function toggleBody(item: string) {
    setBodyDone(prev => { const n = new Set(prev); n.has(item) ? n.delete(item) : n.add(item); return n })
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* 1. Energy Read Card — large main card */}
      <div style={{
        ...G,
        background: 'linear-gradient(140deg, rgba(50,25,100,0.75) 0%, rgba(20,10,55,0.82) 100%)',
        border: '1px solid rgba(139,111,184,0.22)',
        borderRadius: 24, padding: '12px 14px',
        flexShrink: 0, boxShadow: '0 0 28px rgba(100,50,200,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}>
        <div style={LBL}><Zap style={{ width: 9, height: 9 }} />ENERGY READ</div>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'white', margin: '0 0 4px', lineHeight: 1.25 }}>
          Scattered but capable
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', lineHeight: 1.55, margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          Your mind is moving faster than your body. Start with grounding, then choose one clean action.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {[['Mood', '🫧 scattered'], ['Energy', 'medium'], ['Sleep', '7h 24m'], ['Support', 'grounding']].map(([k, v]) => (
            <div key={k} style={{ padding: '3px 8px', borderRadius: 24, background: 'rgba(139,111,184,0.14)', border: '1px solid rgba(139,111,184,0.22)' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>{k}: </span>
              <span style={{ fontSize: 9, color: '#C4A9E8', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2+3. Body Basics + Focus Reset — side by side row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        {/* Body Basics */}
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px' }}>
          <div style={LBL}><Sparkles style={{ width: 9, height: 9 }} />BODY BASICS</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', margin: '0 0 7px', lineHeight: 1.4 }}>
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
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', margin: '0 0 4px', lineHeight: 1.4 }}>
            One 25-min block. No multitasking.
          </p>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#C4A9E8', margin: '0 0 auto', lineHeight: 1.35 }}>
            Reply to priority client email
          </p>
          <button onClick={() => setFocusDone(!focusDone)} style={{ marginTop: 7, padding: '5px 6px', borderRadius: 13, border: `1px solid ${focusDone ? 'rgba(138,184,138,0.38)' : 'rgba(139,111,184,0.32)'}`, background: focusDone ? 'rgba(138,184,138,0.12)' : 'rgba(139,111,184,0.12)', color: focusDone ? '#8AB88A' : '#C4A9E8', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>
            {focusDone ? '✓ Done' : 'Start focus block →'}
          </button>
        </div>
      </div>

      {/* 4. Choose Reset Mode — compact 4-button card */}
      <div style={{ ...G, borderRadius: 22, padding: '10px 12px', flexShrink: 0 }}>
        <div style={LBL}><Moon style={{ width: 9, height: 9 }} />CHOOSE RESET MODE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {RESET_MODES.map(({ label, mode }) => (
            <button key={mode} onClick={() => setActiveMode(activeMode === mode ? null : mode)} style={{ padding: '6px 8px', borderRadius: 14, border: `1px solid ${activeMode === mode ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.08)'}`, background: activeMode === mode ? 'rgba(139,111,184,0.18)' : 'rgba(255,255,255,0.03)', color: activeMode === mode ? '#C4A9E8' : 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3 }}>
              {label}
            </button>
          ))}
        </div>
        {activeMode && (
          <p style={{ fontSize: 10, color: 'rgba(196,169,232,0.55)', margin: '6px 0 0', lineHeight: 1.4 }}>
            {activeMode === 'recovery' ? '🌿 Recovery Mode: gentle, slow, restore.' :
             activeMode === 'rush'     ? '⚡ Rush Mode: single task, protect energy.' :
             activeMode === 'ground'   ? '🌍 Grounding: breathe, body first, then one step.' :
             '🌸 Soft Start: permission to be slow and still get it done.'}
          </p>
        )}
      </div>

      {/* 5. Home Energy Card */}
      <div style={{ ...G, borderRadius: 22, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={LBL}><Star style={{ width: 9, height: 9 }} />HOME ENERGY</div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.80)', margin: '0 0 1px' }}>Small reset. Big energy.</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Start one load of laundry</p>
        </div>
        <button onClick={() => setHomeDone(!homeDone)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 14, border: `1px solid ${homeDone ? 'rgba(138,184,138,0.38)' : 'rgba(139,111,184,0.30)'}`, background: homeDone ? 'rgba(138,184,138,0.12)' : 'rgba(139,111,184,0.12)', color: homeDone ? '#8AB88A' : '#C4A9E8', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {homeDone ? '✓ Done' : 'Start task →'}
        </button>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — Weekly / Growth  (5 cards, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const PARKED = ['Fashion line ideas', 'Website polish', 'Content concepts']

function Slide5({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Weekly Focus — redesigned hero tile */}
      <div style={{
        borderRadius: 26, padding: '14px 16px 12px',
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(148deg, rgba(58,18,115,0.90) 0%, rgba(28,8,78,0.94) 50%, rgba(10,4,38,0.97) 100%)',
        border: '1px solid rgba(196,169,232,0.20)',
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
          <div style={{ padding: '3px 10px', borderRadius: 24, background: 'rgba(139,111,184,0.22)', border: '1px solid rgba(196,169,232,0.24)' }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#C4A9E8', letterSpacing: '0.08em' }}>
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
        <p style={{ fontSize: 11, color: 'rgba(196,169,232,0.68)', margin: '0 0 auto', lineHeight: 1.6, textAlign: 'center', fontStyle: 'italic', position: 'relative', zIndex: 1, flexShrink: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
                <div style={{ width: isToday ? 9 : 6, height: isToday ? 9 : 6, borderRadius: '50%', background: isToday ? '#C4A9E8' : isPast ? 'rgba(139,111,184,0.58)' : 'rgba(255,255,255,0.10)', boxShadow: isToday ? '0 0 8px rgba(196,169,232,0.60)' : 'none', transition: 'all 0.2s' }} />
                <span style={{ fontSize: 7.5, fontWeight: 700, color: isToday ? '#C4A9E8' : isPast ? 'rgba(196,169,232,0.38)' : 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>{day}</span>
              </div>
            )
          })}
        </div>

        {/* Theme pills */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10, flexShrink: 0, position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {['Refinement', 'Visibility', 'Momentum'].map((theme, i) => (
            <div key={theme} style={{ padding: '3px 10px', borderRadius: 24, background: `rgba(139,111,184,${0.12 + i * 0.04})`, border: '1px solid rgba(196,169,232,0.16)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(196,169,232,0.62)', letterSpacing: '0.04em' }}>{theme}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lesson + Upcoming row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px' }}>
          <div style={LBL}><BookOpen style={{ width: 9, height: 9 }} />LESSON</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0, fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            {guidance?.shadow_question ?? 'Recognition over chasing. Speak clearly, then let the right doors open.'}
          </p>
        </div>
        <div style={{ ...G, borderRadius: 22, padding: '10px 11px' }}>
          <div style={LBL}><Calendar style={{ width: 9, height: 9 }} />UPCOMING ENERGY</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            This week favors refinement, planning, and one brave visible step.
          </p>
        </div>
      </div>

      {/* Parked Priorities */}
      <div style={{ ...G, borderRadius: 22, padding: '10px 12px', flexShrink: 0 }}>
        <div style={LBL}><Star style={{ width: 9, height: 9 }} />PARKED PRIORITIES</div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 7px' }}>Your ideas are safe here.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PARKED.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B6FB8', flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.58)', margin: 0, lineHeight: 1.3 }}>{p}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Reset button */}
      <Link href="/luna" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{
          ...G,
          borderRadius: 22, padding: '12px 16px',
          background: 'rgba(139,111,184,0.14)', border: '1px solid rgba(139,111,184,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 0 18px rgba(100,50,200,0.08)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#C4A9E8' }}>Plan my week →</span>
          <Star style={{ width: 14, height: 14, color: 'rgba(196,169,232,0.45)' }} />
        </div>
      </Link>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TAB_TO_SLIDE: Record<string, number> = { today: 0, previews: 1, wellness: 2, energy: 3, weekly: 4 }

function HomePageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [activeSlide, setActiveSlide] = useState(TAB_TO_SLIDE[initialTab ?? ''] ?? 0)
  const [hour,       setHour]       = useState(new Date().getHours())
  const [guidance,   setGuidance]   = useState<GuidanceData | null>(null)
  const [gLoading,   setGLoading]   = useState(true)
  const [calEvents,  setCalEvents]  = useState<HomeCalEvent[]>([])
  const [topTasks,   setTopTasks]   = useState<HomeTask[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
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
    fetch('/api/home/summary')
      .then(r => r.json())
      .then(d => {
        if (d.calendar?.today) setCalEvents(d.calendar.today)
        if (d.tasks?.top)      setTopTasks(d.tasks.top)
      }).catch(() => {}).finally(() => setDataLoaded(true))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const moon     = getMoonPhase()
  const greeting = getGreeting(hour)

  const pages = [
    {
      id: 'today', label: 'Today', noScroll: true,
      content: <Slide1 greeting={greeting} moon={moon} guidance={guidance} gLoading={gLoading} topTasks={topTasks} calEvents={calEvents} dataLoaded={dataLoaded} />,
    },
    { id: 'previews', label: 'Previews', noScroll: true, content: <Slide2 guidance={guidance} /> },
    { id: 'wellness', label: 'Wellness', noScroll: true, content: <Slide3 /> },
    { id: 'energy',   label: 'Energy',   noScroll: true, content: <Slide4 /> },
    { id: 'weekly',   label: 'Weekly',   noScroll: true, content: <Slide5 guidance={guidance} /> },
  ]

  return (
    <SwipeContainer
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
    >
      <DesktopSidebar />
      <DesktopHeader />

      <div className="lg:hidden" style={{ flexShrink: 0 }}>
        <MobileTopBar />
      </div>

      <main
        style={{
          flex: 1, minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          paddingBottom: 'calc(max(34px, env(safe-area-inset-bottom, 0px)) + 78px)',
        }}
        className="w-full lg:pt-16 lg:pl-56"
      >
        <div
          style={{
            flex: 1, minHeight: 0, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            paddingLeft: 16, paddingRight: 16,
          }}
          className="mx-auto w-full max-w-[1120px]"
        >
          <CategoryPager pages={pages} hidePills accentColor="#8B6FB8" activeIndex={activeSlide} onChangeIndex={setActiveSlide} />
        </div>
      </main>

      <BottomNav />
    </SwipeContainer>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  )
}
