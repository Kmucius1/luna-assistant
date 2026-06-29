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
  Star, Moon, Sparkles, Target, Calendar,
  Mic, Brain, Zap, Check, Loader2,
  BookOpen, Scissors, Plus,
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

// ─── CSS Moon ─────────────────────────────────────────────────────────────────
function CSSMoon({ size = 100 }: { size?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -14, right: -14, bottom: -14, left: -14, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,130,60,0.12) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 36%, #fce8a8 0%, #e0b84a 22%, #b07820 52%, #7a5010 76%, #3c2408 100%)', boxShadow: `0 0 ${size * 0.3}px rgba(200,145,50,0.20)` }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(circle at 28% 68%, rgba(0,0,0,0.16) 0%, transparent 18%), radial-gradient(circle at 62% 32%, rgba(255,255,255,0.07) 0%, transparent 22%)' }} />
      </div>
    </div>
  )
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

// ─── Crescent moon (Astrology preview) ────────────────────────────────────────
function CrescentMoon({ size = 54 }: { size?: number }) {
  const cut = size * 0.84
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '5px auto 7px' }}>
      <div style={{ position: 'absolute', top: -8, right: -8, bottom: -8, left: -8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,200,0.20) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #B080E0 0%, #7840C0 45%, #4820A0 80%)', boxShadow: '0 0 18px rgba(140,80,220,0.38)' }}>
        <div style={{ position: 'absolute', top: -size * 0.14, right: -size * 0.14, width: cut, height: cut, borderRadius: '50%', background: '#0f0824' }} />
      </div>
    </div>
  )
}

// ─── Purple cloud (Night preview) ────────────────────────────────────────────
function PurpleCloud() {
  return (
    <div style={{ position: 'relative', width: 80, height: 48, margin: '5px auto 7px' }}>
      <div style={{ position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 80, height: 18, background: 'radial-gradient(ellipse, rgba(110,45,190,0.35) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', width: 68, height: 34, borderRadius: '46% 46% 40% 40%', background: 'radial-gradient(ellipse at 44% 28%, #9055C8 0%, #6030A8 42%, #381878 80%)', boxShadow: '0 0 18px rgba(120,50,200,0.32)' }} />
      <div style={{ position: 'absolute', bottom: 22, left: '26%', width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(circle, #9055C8 0%, #6030A8 70%)' }} />
      <div style={{ position: 'absolute', bottom: 20, left: '44%', width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(circle, #A065D8 0%, #7040B8 70%)' }} />
    </div>
  )
}

// ─── Style visual placeholder ─────────────────────────────────────────────────
function StyleVisual() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '5px auto 7px', gap: 7 }}>
      <Scissors style={{ width: 18, height: 18, color: 'rgba(220,190,140,0.42)' }} strokeWidth={1.2} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ width: 16, height: 24, borderRadius: 3, background: 'rgba(220,190,140,0.10)', border: '1px solid rgba(220,190,140,0.10)' }} />
        <div style={{ width: 20, height: 14, borderRadius: 3, background: 'rgba(220,190,140,0.07)' }} />
      </div>
      <div style={{ width: 8, height: 20, borderRadius: 2, background: 'rgba(220,190,140,0.08)' }} />
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, height: '100%', overflow: 'hidden' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div style={{
        ...G,
        background: 'linear-gradient(140deg, rgba(40,14,90,0.78) 0%, rgba(16,5,44,0.88) 100%)',
        border: '1px solid rgba(139,111,184,0.18)',
        borderRadius: 20, padding: '12px 14px 10px',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'radial-gradient(ellipse at 22% 18%, rgba(120,80,180,0.14) 0%, transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, flex: 1, paddingRight: 6 }}>
          <p style={{ fontSize: 17, fontWeight: 900, color: 'white', lineHeight: 1.2, margin: '0 0 5px' }}>
            {greeting}, Zoe ✦
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#A98FE8', lineHeight: 1.4, margin: '0 0 8px' }}>
            You are not behind.<br />You are becoming.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>{moon.emoji}</span>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', margin: 0, lineHeight: 1.3 }}>
              {moon.name} · {moon.pct}%
            </p>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, marginTop: -4, marginRight: -2, opacity: 0.88 }}>
          <CSSMoon size={96} />
        </div>
      </div>

      {/* ── LUNA's Message ────────────────────────────────────────────── */}
      <div style={{ ...G, borderRadius: 20, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 9, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={LBL}><span>✦</span>LUNA'S MESSAGE</div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[100, 100, 82].map((w, i) => (
                <div key={i} style={{ height: 9, borderRadius: 4, background: 'rgba(255,255,255,0.07)', width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.6, margin: '0 0 6px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {guidance?.energy ?? 'Your energy needs structure before speed. Pick one priority and protect your body before you start spiraling.'}
            </p>
          )}
          <Link href="/luna" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#8B6FB8' }}>Tell me more →</span>
          </Link>
        </div>
        <StarSigil size={50} />
      </div>

      {/* ── Today's Top 3 + Next Event ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        {/* Top 3 */}
        <div style={{ ...G, borderRadius: 18, padding: '10px 11px' }}>
          <div style={LBL}><Target style={{ width: 10, height: 10 }} />Top 3</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
            {tasks.map((t, i) => (
              <div key={'id' in t ? t.id : i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, background: 'rgba(139,111,184,0.18)', border: '1px solid rgba(139,111,184,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <span style={{ fontSize: 7.5, fontWeight: 800, color: '#C4A9E8' }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.title}</p>
              </div>
            ))}
          </div>
          <Link href="/tasks" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 10, color: '#8B6FB8', fontWeight: 600 }}>View all →</span>
          </Link>
        </div>

        {/* Next Event */}
        <div style={{ ...G, borderRadius: 18, padding: '10px 11px', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Calendar style={{ width: 10, height: 10 }} />Event</div>
          <p style={{ fontSize: 15, fontWeight: 900, color: 'white', margin: '0 0 3px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nextEvent?.title ?? 'Client Call'}
          </p>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8B6FB8', margin: '0 0 3px' }}>
            Today · {nextEvent?.startTime ?? '1:30 PM'}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', margin: '0 0 auto', lineHeight: 1.4 }}>
            Prep 15 min before.
          </p>
          <Link href="/calendar" style={{ textDecoration: 'none', marginTop: 7 }}>
            <div style={{ padding: '5px', background: 'rgba(139,111,184,0.10)', border: '1px solid rgba(139,111,184,0.18)', borderRadius: 9, textAlign: 'center' }}>
              <span style={{ fontSize: 10, color: '#8B6FB8', fontWeight: 600 }}>View →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div style={{ ...G, borderRadius: 18, padding: '9px 12px', flexShrink: 0 }}>
        <div style={LBL}><Zap style={{ width: 10, height: 10 }} />Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
          {[
            { icon: Mic,      label: 'Dictate',  href: '/luna?tab=dictate' },
            { icon: Brain,    label: 'Brain Dump', href: '/brain-dump'     },
            { icon: Calendar, label: 'Plan Day', href: '/plan-my-day'      },
            { icon: Plus,     label: 'New Task', href: '/tasks'            },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '7px 2px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon style={{ width: 14, height: 14, color: 'rgba(196,169,232,0.68)' }} strokeWidth={1.6} />
                <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.42)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
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
      <div style={{ ...G, borderRadius: 20, padding: '10px 11px 8px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={LBL}>{icon}{label}</div>
        {children}
        <span style={{ fontSize: 10, color: '#8B6FB8', fontWeight: 600, marginTop: 4, flexShrink: 0 }}>{linkText} →</span>
      </div>
    </Link>
  )
}

function Slide2({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 7 }}>
      <PreviewCard label="Astrology" icon={<Moon style={{ width: 9, height: 9 }} />} href="/astrology" linkText="Open">
        <CrescentMoon size={52} />
        <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Moon in Cancer</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', margin: '2px 0 0', lineHeight: 1.4, flexShrink: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {guidance?.moon_note ?? 'Emotional clarity · intuition'}
        </p>
      </PreviewCard>

      <PreviewCard label="Style" icon={<Scissors style={{ width: 9, height: 9 }} />} href="/creative" linkText="Atelier">
        <StyleVisual />
        <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Soft power dressing</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', margin: '2px 0 0', lineHeight: 1.4, flexShrink: 0 }}>Neutrals · Effortless</p>
      </PreviewCard>

      <PreviewCard label="Money" icon={
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: 'white', lineHeight: 1 }}>$</span>
        </div>
      } href="/money/transactions" linkText="View">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 4, paddingBottom: 2 }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.3 }}>2 bills due<br />this week</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.30)', margin: '5px 0 1px' }}>Total</p>
          <p style={{ fontSize: 17, fontWeight: 900, color: '#4ADE80', margin: 0 }}>$320.00</p>
        </div>
      </PreviewCard>

      <PreviewCard label="Night" icon={<Moon style={{ width: 9, height: 9 }} />} href="/night" linkText="View">
        <PurpleCloud />
        <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2, flexShrink: 0 }}>Protect tomorrow.</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.40)', margin: '2px 0 0', lineHeight: 1.4, flexShrink: 0 }}>Wind down. Reset.</p>
      </PreviewCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Energy Reset  (decision flow: 5 compact cards, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const RESET_MODES = [
  { label: 'I woke up late',     mode: 'recovery' },
  { label: "I'm rushing",        mode: 'rush'     },
  { label: 'I feel overwhelmed', mode: 'ground'   },
  { label: 'I need softness',    mode: 'soft'     },
]

function Slide3() {
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
        borderRadius: 20, padding: '12px 14px',
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
            <div key={k} style={{ padding: '3px 8px', borderRadius: 20, background: 'rgba(139,111,184,0.14)', border: '1px solid rgba(139,111,184,0.22)' }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.38)', fontWeight: 600 }}>{k}: </span>
              <span style={{ fontSize: 9, color: '#C4A9E8', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2+3. Body Basics + Focus Reset — side by side row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        {/* Body Basics */}
        <div style={{ ...G, borderRadius: 18, padding: '10px 11px' }}>
          <div style={LBL}><Sparkles style={{ width: 9, height: 9 }} />BODY BASICS</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', margin: '0 0 7px', lineHeight: 1.4 }}>
            You need water + food before decisions.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['💧 Water', '🍽 Food', '🚿 Shower', '☀️ Sunlight'].map(item => (
              <button key={item} onClick={() => toggleBody(item)} style={{ padding: '3px 7px', borderRadius: 7, border: `1px solid ${bodyDone.has(item) ? 'rgba(138,184,138,0.45)' : 'rgba(255,255,255,0.09)'}`, background: bodyDone.has(item) ? 'rgba(138,184,138,0.14)' : 'rgba(255,255,255,0.04)', color: bodyDone.has(item) ? '#8AB88A' : 'rgba(255,255,255,0.50)', fontSize: 9, fontWeight: 600, cursor: 'pointer', textDecoration: bodyDone.has(item) ? 'line-through' : 'none' }}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Reset */}
        <div style={{ ...G, borderRadius: 18, padding: '10px 11px', display: 'flex', flexDirection: 'column' }}>
          <div style={LBL}><Target style={{ width: 9, height: 9 }} />FOCUS RESET</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', margin: '0 0 4px', lineHeight: 1.4 }}>
            One 25-min block. No multitasking.
          </p>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#C4A9E8', margin: '0 0 auto', lineHeight: 1.35 }}>
            Reply to priority client email
          </p>
          <button onClick={() => setFocusDone(!focusDone)} style={{ marginTop: 7, padding: '5px 6px', borderRadius: 9, border: `1px solid ${focusDone ? 'rgba(138,184,138,0.38)' : 'rgba(139,111,184,0.32)'}`, background: focusDone ? 'rgba(138,184,138,0.12)' : 'rgba(139,111,184,0.12)', color: focusDone ? '#8AB88A' : '#C4A9E8', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>
            {focusDone ? '✓ Done' : 'Start focus block →'}
          </button>
        </div>
      </div>

      {/* 4. Choose Reset Mode — compact 4-button card */}
      <div style={{ ...G, borderRadius: 18, padding: '10px 12px', flexShrink: 0 }}>
        <div style={LBL}><Moon style={{ width: 9, height: 9 }} />CHOOSE RESET MODE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {RESET_MODES.map(({ label, mode }) => (
            <button key={mode} onClick={() => setActiveMode(activeMode === mode ? null : mode)} style={{ padding: '6px 8px', borderRadius: 10, border: `1px solid ${activeMode === mode ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.08)'}`, background: activeMode === mode ? 'rgba(139,111,184,0.18)' : 'rgba(255,255,255,0.03)', color: activeMode === mode ? '#C4A9E8' : 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, cursor: 'pointer', textAlign: 'left', lineHeight: 1.3 }}>
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
      <div style={{ ...G, borderRadius: 18, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={LBL}><Star style={{ width: 9, height: 9 }} />HOME ENERGY</div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.80)', margin: '0 0 1px' }}>Small reset. Big energy.</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', margin: 0 }}>Start one load of laundry</p>
        </div>
        <button onClick={() => setHomeDone(!homeDone)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 10, border: `1px solid ${homeDone ? 'rgba(138,184,138,0.38)' : 'rgba(139,111,184,0.30)'}`, background: homeDone ? 'rgba(138,184,138,0.12)' : 'rgba(139,111,184,0.12)', color: homeDone ? '#8AB88A' : '#C4A9E8', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {homeDone ? '✓ Done' : 'Start task →'}
        </button>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Weekly / Growth  (5 cards, no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const PARKED = ['Fashion line ideas', 'Website polish', 'Content concepts']

function Slide4({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Weekly Focus */}
      <div style={{ ...G, borderRadius: 18, padding: '11px 13px', flexShrink: 0 }}>
        <div style={LBL}><Target style={{ width: 9, height: 9 }} />WEEKLY FOCUS</div>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'white', margin: '0 0 3px', lineHeight: 1.2 }}>
          One lane gets your energy this week.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {guidance?.affirmation ?? 'Finish what unlocks momentum.'}
        </p>
      </div>

      {/* Lesson + Upcoming row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        <div style={{ ...G, borderRadius: 18, padding: '10px 11px' }}>
          <div style={LBL}><BookOpen style={{ width: 9, height: 9 }} />LESSON</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0, fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            {guidance?.shadow_question ?? 'Recognition over chasing. Speak clearly, then let the right doors open.'}
          </p>
        </div>
        <div style={{ ...G, borderRadius: 18, padding: '10px 11px' }}>
          <div style={LBL}><Calendar style={{ width: 9, height: 9 }} />UPCOMING ENERGY</div>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' }}>
            This week favors refinement, planning, and one brave visible step.
          </p>
        </div>
      </div>

      {/* Parked Priorities */}
      <div style={{ ...G, borderRadius: 18, padding: '10px 12px', flexShrink: 0 }}>
        <div style={LBL}><Star style={{ width: 9, height: 9 }} />PARKED PRIORITIES</div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '0 0 7px' }}>Your ideas are safe here.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {PARKED.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
          borderRadius: 18, padding: '12px 16px',
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
    { id: 'energy',   label: 'Energy',   noScroll: true, content: <Slide3 /> },
    { id: 'weekly',   label: 'Weekly',   noScroll: true, content: <Slide4 guidance={guidance} /> },
  ]

  return (
    <SwipeContainer
      style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
    >
      <DesktopHeader />

      <div className="lg:hidden" style={{ flexShrink: 0 }}>
        <MobileTopBar />
      </div>

      <main
        style={{
          flex: 1, minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          padding: '0 16px',
          paddingBottom: 'calc(max(10px, env(safe-area-inset-bottom, 0px)) + 78px)',
        }}
        className="mx-auto w-full max-w-[1120px] lg:pt-16"
      >
        <CategoryPager pages={pages} hidePills accentColor="#8B6FB8" />
      </main>

      <BottomNav />
      <DesktopTabBar />
    </SwipeContainer>
  )
}
