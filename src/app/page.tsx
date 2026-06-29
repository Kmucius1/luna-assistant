'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SwipeContainer } from '@/components/layout/SwipeContainer'
import { BottomNav } from '@/components/layout/BottomNav'
import { DesktopHeader } from '@/components/layout/DesktopHeader'
import { DesktopTabBar } from '@/components/layout/DesktopTabBar'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { CategoryPager } from '@/components/ui/CategoryPager'
import {
  Star, Moon, Sparkles, Target, Calendar, DollarSign,
  Mic, Brain, CheckSquare, Zap, Check, Loader2,
  BookOpen, Scissors, ChevronRight, ArrowRight,
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

// ─── Shared styles ────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 28,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
}

const PAGE: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  padding: '6px 0 0',
  gap: 10,
}

// ─── Moon visual ──────────────────────────────────────────────────────────────
function CSSMoon({ size = 130 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -24, right: -24, bottom: -24, left: -24, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,130,60,0.14) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 36%, #fce8a8 0%, #e0b84a 22%, #b07820 52%, #7a5010 76%, #3c2408 100%)', boxShadow: '0 0 40px rgba(200,145,50,0.28), 0 0 80px rgba(160,100,20,0.12)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: ['radial-gradient(circle at 28% 68%, rgba(0,0,0,0.18) 0%, transparent 18%)', 'radial-gradient(circle at 62% 32%, rgba(255,255,255,0.07) 0%, transparent 22%)', 'radial-gradient(circle at 50% 55%, rgba(0,0,0,0.12) 0%, transparent 16%)'].join(', ') }} />
      </div>
    </div>
  )
}

// ─── Star sigil ───────────────────────────────────────────────────────────────
function StarSigil({ size = 72 }: { size?: number }) {
  const c = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {[c * 0.95, c * 0.72, c * 0.48, c * 0.26].map((r, i) => (
        <div key={i} style={{ position: 'absolute', top: `${c - r}px`, right: `${c - r}px`, bottom: `${c - r}px`, left: `${c - r}px`, borderRadius: '50%', border: `0.5px solid rgba(139,111,184,${0.12 + i * 0.1})` }} />
      ))}
      <svg style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 8px rgba(196,169,232,0.7))' }} viewBox={`0 0 ${size} ${size}`}>
        <path d={`M${c} ${c * 0.07} L${c + c * 0.045} ${c - c * 0.045} L${c * 1.93} ${c} L${c + c * 0.045} ${c + c * 0.045} L${c} ${c * 1.93} L${c - c * 0.045} ${c + c * 0.045} L${c * 0.07} ${c} L${c - c * 0.045} ${c - c * 0.045} Z`} fill="rgba(220,200,255,0.92)" />
        <circle cx={c} cy={c} r={c * 0.065} fill="white" opacity="0.95" />
      </svg>
    </div>
  )
}

// ─── Tile label ───────────────────────────────────────────────────────────────
function TileLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.45)', margin: 0, flexShrink: 0 }}>
      {children}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 1 · HERO
// ─────────────────────────────────────────────────────────────────────────────
function TileHero({ greeting, moon }: { greeting: string; moon: typeof MOON_PHASES[0] }) {
  return (
    <div style={{ ...PAGE, gap: 6 }}>
      <div style={{
        flex: 1,
        background: 'linear-gradient(145deg, rgba(45,15,100,0.80) 0%, rgba(18,6,48,0.90) 60%, rgba(8,4,26,0.95) 100%)',
        border: '1px solid rgba(139,111,184,0.22)',
        borderRadius: 32,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 12px 60px rgba(60,20,130,0.35), inset 0 1px 0 rgba(255,255,255,0.09)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '28px 26px',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'radial-gradient(ellipse at 25% 15%, rgba(139,111,184,0.18) 0%, transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -12, right: -14, pointerEvents: 'none' }}>
          <CSSMoon size={155} />
        </div>
        <div style={{ position: 'absolute', top: 60, right: -20, width: 180, height: 80, background: 'radial-gradient(ellipse, rgba(80,40,140,0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: 'white', lineHeight: 1.15, margin: 0, marginBottom: 10 }}>
            {greeting},<br />Zoe ✦
          </h1>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#B39AE0', lineHeight: 1.5, margin: 0, marginBottom: 20 }}>
            You are not behind.<br />You are becoming.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,0,0,0.25)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 14 }}>{moon.emoji}</span>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 }}>{moon.name} · {moon.pct}% illuminated</p>
              <p style={{ fontSize: 10, color: 'rgba(196,169,232,0.5)', margin: 0 }}>Illuminating your next step</p>
            </div>
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>swipe to explore →</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 2 · LUNA'S MESSAGE
// ─────────────────────────────────────────────────────────────────────────────
function TileLunaMessage({ guidance, loading }: { guidance: GuidanceData | null; loading: boolean }) {
  return (
    <div style={{ ...PAGE }}>
      <TileLabel>Luna's Message</TileLabel>
      <div style={{ flex: 1, ...GLASS, background: 'rgba(20,10,52,0.72)', border: '1px solid rgba(139,111,184,0.18)', borderRadius: 28, padding: '22px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 11 }}>✦</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#8B6FB8', textTransform: 'uppercase' }}>Luna's Message</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[100, 100, 100, 65].map((w, i) => (
                  <div key={i} style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.07)', width: `${w}%` }} />
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', lineHeight: 1.75, margin: 0 }}>
                {guidance?.energy ?? 'Your energy needs structure before speed. Pick one priority, answer the message that unlocks work, and protect your body before you start spiraling.'}
              </p>
            )}
          </div>
          <StarSigil size={76} />
        </div>
        {guidance?.crystal && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(139,111,184,0.10)', borderRadius: 14, border: '1px solid rgba(139,111,184,0.18)' }}>
            <p style={{ fontSize: 11, color: 'rgba(196,169,232,0.65)', margin: 0 }}>
              Crystal today: <span style={{ color: '#C4A9E8', fontWeight: 700 }}>{guidance.crystal}</span>
            </p>
          </div>
        )}
        <Link href="/luna" style={{ textDecoration: 'none', marginTop: 16, flexShrink: 0 }}>
          <div style={{ padding: '14px 20px', background: 'rgba(139,111,184,0.15)', border: '1px solid rgba(139,111,184,0.28)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#C4A9E8' }}>Tell me more</span>
            <ArrowRight style={{ width: 14, height: 14, color: '#8B6FB8' }} />
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 3 · TODAY'S TOP 3
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_TASKS = [
  { id: 'f1', title: 'Reply to priority client email', source: 'Work'     },
  { id: 'f2', title: 'Finish DRYP task',               source: 'DRYPHub' },
  { id: 'f3', title: 'Plan one clear work block',       source: 'Calendar'},
]
function TileTopThree({ tasks, loaded }: { tasks: HomeTask[]; loaded: boolean }) {
  const display = loaded && tasks.length > 0 ? tasks.slice(0, 3) : FALLBACK_TASKS
  return (
    <div style={{ ...PAGE }}>
      <TileLabel>Today's Top 3</TileLabel>
      <div style={{ flex: 1, ...GLASS, borderRadius: 28, padding: '22px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexShrink: 0 }}>
          <Target style={{ width: 16, height: 16, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Today's Top 3</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {display.map((t, i) => (
            <div key={'id' in t ? t.id : i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'rgba(139,111,184,0.18)', border: '1px solid rgba(139,111,184,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#C4A9E8' }}>{i + 1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0, marginTop: 2 }}>{'source' in t ? t.source : 'Work'}</p>
              </div>
            </div>
          ))}
        </div>
        <Link href="/tasks" style={{ textDecoration: 'none', marginTop: 16, flexShrink: 0 }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#8B6FB8', fontWeight: 600 }}>View all tasks</span>
            <ArrowRight style={{ width: 12, height: 12, color: '#8B6FB8' }} />
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 4 · NEXT EVENT
// ─────────────────────────────────────────────────────────────────────────────
function TileNextEvent({ events, loaded }: { events: HomeCalEvent[]; loaded: boolean }) {
  const ev = events[0] ?? null
  return (
    <div style={{ ...PAGE }}>
      <TileLabel>Next Event</TileLabel>
      <div style={{ flex: 1, ...GLASS, background: 'rgba(15,8,40,0.70)', border: '1px solid rgba(139,111,184,0.16)', borderRadius: 28, padding: '24px 22px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexShrink: 0 }}>
          <Calendar style={{ width: 16, height: 16, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Next Event</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {!loaded ? (
            <div style={{ height: 40, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }} />
          ) : (
            <>
              <p style={{ fontSize: 30, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.15, marginBottom: 12 }}>{ev?.title ?? 'Client Call'}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#8B6FB8', margin: 0, marginBottom: 10 }}>Today · {ev?.startTime ?? '1:30 PM'}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.40)', margin: 0, lineHeight: 1.6 }}>Prep 15 minutes before. Review any notes in advance.</p>
            </>
          )}
        </div>
        <Link href="/calendar" style={{ textDecoration: 'none', marginTop: 24, flexShrink: 0 }}>
          <div style={{ padding: '14px', background: 'rgba(139,111,184,0.14)', border: '1px solid rgba(139,111,184,0.25)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#C4A9E8' }}>View details</span>
            <ArrowRight style={{ width: 14, height: 14, color: '#8B6FB8' }} />
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 5 · DAILY PREVIEWS
// ─────────────────────────────────────────────────────────────────────────────
function TilePreviews({ guidance }: { guidance: GuidanceData | null }) {
  const cards = [
    { emoji: '🌙', label: 'Astrology', sub: guidance?.moon_note ?? 'Moon in Cancer · Emotional clarity · intuition', color: '#A890D0', href: '/astrology' },
    { emoji: '✂️', label: 'Style',     sub: 'Soft power dressing. Neutrals · Structure · Effortless',                color: '#D4A8C4', href: '/creative' },
    { emoji: '💰', label: 'Money',     sub: '2 bills due this week. Total $320.00',                                  color: '#8AB88A', href: '/money/transactions' },
    { emoji: '🌙', label: 'Night',     sub: 'Protect tomorrow. Wind down. Rest. Reset.',                             color: '#A890D0', href: '/night' },
  ]
  return (
    <div style={{ ...PAGE }}>
      <TileLabel>Today's Previews</TileLabel>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10 }}>
        {cards.map(c => (
          <Link key={c.label} href={c.href} style={{ textDecoration: 'none' }}>
            <div style={{ ...GLASS, borderRadius: 24, padding: '18px 16px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <span style={{ fontSize: 26, marginBottom: 10 }}>{c.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: c.color, textTransform: 'uppercase', marginBottom: 7 }}>{c.label}</span>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, flex: 1, margin: 0 }}>{c.sub}</p>
              <span style={{ fontSize: 11, color: c.color, fontWeight: 600, marginTop: 10 }}>Open →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 6 · QUICK ACTIONS
// ─────────────────────────────────────────────────────────────────────────────
function TileQuickActions() {
  const actions = [
    { icon: Mic,         label: 'Dictate',      href: '/luna?tab=dictate', color: '#C4A9E8' },
    { icon: Brain,       label: 'Brain Dump',   href: '/brain-dump',       color: '#A890D0' },
    { icon: Calendar,    label: 'Plan My Day',  href: '/plan-my-day',      color: '#A8C4DA' },
    { icon: CheckSquare, label: 'New Task',     href: '/tasks',            color: '#8AB88A' },
    { icon: Moon,        label: 'Astrology',    href: '/astrology',        color: '#B39AE0' },
    { icon: Sparkles,    label: 'Ask LUNA',     href: '/luna',             color: '#C4A9E8' },
  ]
  return (
    <div style={{ ...PAGE }}>
      <TileLabel>Quick Actions</TileLabel>
      <div style={{ flex: 1, ...GLASS, borderRadius: 28, padding: '22px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexShrink: 0 }}>
          <Zap style={{ width: 16, height: 16, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Quick Actions</span>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 10 }}>
          {actions.map(({ icon: Icon, label, href, color }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ ...GLASS, borderRadius: 20, padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', boxSizing: 'border-box', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 13, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon style={{ width: 18, height: 18, color }} strokeWidth={1.6} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.58)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 7 · ENERGY CHECK-IN
// ─────────────────────────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '🌙', label: 'Calm'      },
  { emoji: '🔥', label: 'Driven'    },
  { emoji: '🌸', label: 'Soft'      },
  { emoji: '⚡', label: 'Bold'      },
  { emoji: '🌿', label: 'Grounded'  },
  { emoji: '✨', label: 'Flowing'   },
  { emoji: '🫧', label: 'Scattered' },
  { emoji: '💗', label: 'Open'      },
]
const MODES = [
  { id: 'normal'   as const, label: '✦ Normal',   bg: 'rgba(139,111,184,0.14)', border: 'rgba(139,111,184,0.35)', color: '#C4A9E8' },
  { id: 'recovery' as const, label: '🌿 Recovery', bg: 'rgba(90,138,90,0.14)',   border: 'rgba(90,138,90,0.35)',   color: '#8AB88A' },
  { id: 'rush'     as const, label: '⚡ Rush',      bg: 'rgba(201,165,60,0.14)', border: 'rgba(201,165,60,0.35)', color: '#C9A96E' },
]

function TileEnergy() {
  const [mode,   setMode]   = useState<'normal'|'recovery'|'rush'>('normal')
  const [energy, setEnergy] = useState<number|null>(null)
  const [mood,   setMood]   = useState<string|null>(null)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function save() {
    if (!energy && !mood) return
    setSaving(true)
    try {
      await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'midday', energyRating: energy, feeling: [mood].filter(Boolean).join(', ') || null, supportNeed: mode !== 'normal' ? mode : null }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ ...PAGE }}>
      <TileLabel>Energy Check-in</TileLabel>
      <div style={{ flex: 1, ...GLASS, borderRadius: 28, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Zap style={{ width: 16, height: 16, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Energy Check-in</span>
        </div>

        {/* Mode */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>Mode</p>
          <div style={{ display: 'flex', gap: 7 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '9px 4px', borderRadius: 14, border: `1px solid ${mode === m.id ? m.border : 'rgba(255,255,255,0.08)'}`, background: mode === m.id ? m.bg : 'transparent', color: mode === m.id ? m.color : 'rgba(255,255,255,0.32)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Energy level */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>Energy Level</p>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: energy !== null && n <= energy ? `rgba(139,111,184,${0.18 + (n/10)*0.55})` : 'rgba(255,255,255,0.06)', color: energy !== null && n <= energy ? 'white' : 'rgba(255,255,255,0.28)', transition: 'all 0.12s' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, marginTop: 0 }}>Mood</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
            {MOODS.map(m => (
              <button key={m.label} onClick={() => setMood(mood === m.label ? null : m.label)} style={{ padding: '10px 4px', borderRadius: 12, border: `1px solid ${mood === m.label ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.07)'}`, background: mood === m.label ? 'rgba(139,111,184,0.16)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 20 }}>{m.emoji}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: mood === m.label ? '#C4A9E8' : 'rgba(255,255,255,0.35)' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button onClick={save} disabled={saving} style={{ flexShrink: 0, padding: '13px', borderRadius: 18, border: `1px solid ${saved ? 'rgba(138,184,138,0.35)' : 'rgba(139,111,184,0.3)'}`, background: saved ? 'rgba(138,184,138,0.16)' : 'rgba(139,111,184,0.16)', color: saved ? '#8AB88A' : '#C4A9E8', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {saving ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />Saving…</> : saved ? <><Check style={{ width: 15, height: 15 }} />Saved to LUNA</> : 'Save Check-in'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TILE 8 · WEEKLY
// ─────────────────────────────────────────────────────────────────────────────
const GOALS = [
  'Scale DRYP to $15k/mo',
  'Graduate USF on time',
  'Launch crystal swimwear drop',
  'Build a morning routine that holds',
]

function TileWeekly({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ ...PAGE }}>
      <TileLabel>This Week</TileLabel>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ ...GLASS, background: 'rgba(50,30,90,0.12)', border: '1px solid rgba(139,111,184,0.18)', borderRadius: 24, padding: '18px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <BookOpen style={{ width: 14, height: 14, color: '#C4A9E8' }} strokeWidth={1.6} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.6)' }}>Weekly Lesson</span>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            {guidance?.shadow_question ?? 'What pattern keeps showing up this week — and what is it trying to teach you?'}
          </p>
        </div>
        <div style={{ ...GLASS, borderRadius: 24, padding: '18px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Star style={{ width: 14, height: 14, color: '#C9A96E' }} strokeWidth={1.6} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)' }}>Big Goals</span>
          </div>
          {GOALS.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < GOALS.length - 1 ? 9 : 0 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B6FB8', flexShrink: 0, marginTop: 5 }} />
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 1.4, margin: 0 }}>{g}</p>
            </div>
          ))}
        </div>
        <Link href="/luna" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Weekly Reset with LUNA</span>
            <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
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
      })
      .catch(() => {}).finally(() => setDataLoaded(true))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const moon     = getMoonPhase()
  const greeting = getGreeting(hour)

  const pages = [
    { id: 'hero',     label: 'Hello',    content: <TileHero greeting={greeting} moon={moon} /> },
    { id: 'message',  label: 'Message',  content: <TileLunaMessage guidance={guidance} loading={gLoading} /> },
    { id: 'top3',     label: 'Top 3',    content: <TileTopThree tasks={topTasks} loaded={dataLoaded} /> },
    { id: 'event',    label: 'Event',    content: <TileNextEvent events={calEvents} loaded={dataLoaded} /> },
    { id: 'previews', label: 'Previews', content: <TilePreviews guidance={guidance} /> },
    { id: 'actions',  label: 'Actions',  content: <TileQuickActions /> },
    { id: 'energy',   label: 'Energy',   content: <TileEnergy /> },
    { id: 'weekly',   label: 'Weekly',   content: <TileWeekly guidance={guidance} /> },
  ]

  return (
    <SwipeContainer
      style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
    >
      <DesktopHeader />

      <div className="lg:hidden" style={{ flexShrink: 0 }}>
        <MobileTopBar />
      </div>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '0 16px',
          // Clear the fixed dock + safe-area inset so dots are never hidden behind it
          paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom, 0px)) + 84px)',
        }}
        className="mx-auto w-full max-w-[1120px]"
      >
        <CategoryPager
          pages={pages}
          hidePills
          pageNoScroll
          accentColor="#8B6FB8"
        />
      </main>

      <BottomNav />
      <DesktopTabBar />
    </SwipeContainer>
  )
}
