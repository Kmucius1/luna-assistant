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
  BookOpen, Scissors, ChevronRight, ArrowRight, Plus,
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

// ─── Shared glass card ────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(20,12,50,0.72)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 24,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}

// ─── CSS Moon (for hero card) ─────────────────────────────────────────────────
function CSSMoon({ size = 140 }: { size?: number }) {
  const half = size / 2
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* atmosphere glow */}
      <div style={{ position: 'absolute', top: -20, right: -20, bottom: -20, left: -20, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,130,60,0.15) 0%, transparent 70%)' }} />
      {/* moon body */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 36%, #fce8a8 0%, #e0b84a 22%, #b07820 52%, #7a5010 76%, #3c2408 100%)', boxShadow: `0 0 ${half * 0.6}px rgba(200,145,50,0.28)` }}>
        {/* surface */}
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(circle at 28% 68%, rgba(0,0,0,0.18) 0%, transparent 18%), radial-gradient(circle at 62% 32%, rgba(255,255,255,0.07) 0%, transparent 22%)' }} />
      </div>
    </div>
  )
}

// ─── Star sigil ───────────────────────────────────────────────────────────────
function StarSigil() {
  const size = 80; const c = 40
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {[38, 29, 20, 11].map((r, i) => (
        <div key={i} style={{ position: 'absolute', top: `${c - r}px`, right: `${c - r}px`, bottom: `${c - r}px`, left: `${c - r}px`, borderRadius: '50%', border: `0.5px solid rgba(139,111,184,${0.1 + i * 0.08})` }} />
      ))}
      <svg style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 8px rgba(196,169,232,0.7))' }} viewBox="0 0 80 80">
        <path d="M40 3 L41.8 38.2 L77 40 L41.8 41.8 L40 77 L38.2 41.8 L3 40 L38.2 38.2 Z" fill="rgba(220,200,255,0.92)" />
        <path d="M40 14 L41.2 38.8 L66 14 L41.2 41.2 L66 66 L38.8 41.2 L14 66 L38.8 38.8 L14 14 L41.2 38.8 Z" fill="rgba(139,111,184,0.3)" />
        <circle cx="40" cy="40" r="2.5" fill="white" opacity="0.95" />
      </svg>
    </div>
  )
}

// ─── CSS Crescent Moon (Astrology preview) ────────────────────────────────────
function CrescentMoon() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '10px 0' }}>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <div style={{ position: 'absolute', top: -14, right: -14, bottom: -14, left: -14, borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,60,200,0.25) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'linear-gradient(135deg, #B080E0 0%, #7840C0 45%, #4820A0 80%)', boxShadow: '0 0 28px rgba(140,80,220,0.45), 0 0 60px rgba(100,40,180,0.18)' }}>
          {/* crescent cutout */}
          <div style={{ position: 'absolute', top: -12, right: -12, width: 80, height: 80, borderRadius: '50%', background: '#0f0824' }} />
        </div>
      </div>
    </div>
  )
}

// ─── CSS Purple Cloud (Night preview) ────────────────────────────────────────
function PurpleCloud() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '8px 0' }}>
      <div style={{ position: 'relative', width: 120, height: 80 }}>
        {/* glow under cloud */}
        <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 110, height: 30, background: 'radial-gradient(ellipse, rgba(110,45,190,0.45) 0%, transparent 70%)' }} />
        {/* main cloud body */}
        <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', width: 96, height: 52, borderRadius: '46% 46% 40% 40%', background: 'radial-gradient(ellipse at 44% 28%, #9055C8 0%, #6030A8 42%, #381878 80%, #1A0848 100%)', boxShadow: '0 0 30px rgba(120,50,200,0.4)' }} />
        {/* bumps */}
        <div style={{ position: 'absolute', bottom: 34, left: '28%', width: 42, height: 42, borderRadius: '50%', background: 'radial-gradient(circle, #9055C8 0%, #6030A8 70%)', boxShadow: '0 0 14px rgba(120,50,200,0.3)' }} />
        <div style={{ position: 'absolute', bottom: 32, left: '45%', width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle, #A065D8 0%, #7040B8 70%)', boxShadow: '0 0 16px rgba(140,70,220,0.3)' }} />
      </div>
    </div>
  )
}

// ─── Style visual placeholder ─────────────────────────────────────────────────
function StyleVisual() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #2c2018 0%, #1a150d 100%)', borderRadius: '16px 16px 0 0', position: 'relative', overflow: 'hidden', minHeight: 100 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'radial-gradient(ellipse at 70% 30%, rgba(220,190,140,0.08) 0%, transparent 60%)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.7 }}>
        <Scissors style={{ width: 28, height: 28, color: 'rgba(220,190,140,0.5)' }} strokeWidth={1.2} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 22, height: 38, borderRadius: 4, background: 'rgba(30,25,18,0.9)', border: '1px solid rgba(220,190,140,0.15)' }} />
          <div style={{ width: 28, height: 22, borderRadius: 4, background: 'rgba(30,25,18,0.9)', border: '1px solid rgba(220,190,140,0.15)', marginTop: 8 }} />
          <div style={{ width: 14, height: 28, borderRadius: 3, background: 'rgba(30,25,18,0.9)', border: '1px solid rgba(220,190,140,0.15)', marginTop: 4 }} />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Scrollable stack (Hero + Message + Top3/Event + QuickActions)
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
  const displayTasks = (dataLoaded && topTasks.length > 0) ? topTasks.slice(0, 3) : FALLBACK_TASKS
  const nextEvent    = calEvents[0] ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>

      {/* ── Hero card ──────────────────────────────────────────────── */}
      <div style={{
        ...GLASS,
        background: 'linear-gradient(140deg, rgba(40,14,90,0.80) 0%, rgba(16,5,44,0.90) 65%, rgba(8,3,22,0.95) 100%)',
        border: '1px solid rgba(139,111,184,0.20)',
        borderRadius: 24,
        padding: '22px 20px 18px',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        minHeight: 148,
        boxShadow: '0 6px 40px rgba(50,15,120,0.30)',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, background: 'radial-gradient(ellipse at 22% 18%, rgba(120,80,180,0.18) 0%, transparent 55%)', pointerEvents: 'none' }} />
        {/* Text */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, paddingRight: 6 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1.2, margin: 0, marginBottom: 8 }}>
            {greeting}, Zoe ✦
          </h1>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#A98FE8', lineHeight: 1.4, margin: 0, marginBottom: 14 }}>
            You are not behind.<br />You are becoming.
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{moon.emoji}</span>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.4 }}>
                {moon.name} · {moon.pct}% illuminated
              </p>
              <p style={{ fontSize: 10, color: 'rgba(196,169,232,0.45)', margin: 0, lineHeight: 1.4 }}>
                Illuminating your next step
              </p>
            </div>
          </div>
        </div>
        {/* Moon */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: -8, marginRight: -8 }}>
          <CSSMoon size={130} />
        </div>
      </div>

      {/* ── LUNA'S MESSAGE ────────────────────────────────────────── */}
      <div style={{
        ...GLASS, borderRadius: 24, padding: '18px 18px 16px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: '#8B6FB8' }}>✦</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#8B6FB8', textTransform: 'uppercase' }}>
              LUNA'S MESSAGE
            </span>
          </div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[100, 100, 90, 65].map((w, i) => (
                <div key={i} style={{ height: 11, borderRadius: 5, background: 'rgba(255,255,255,0.07)', width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0, marginBottom: 12 }}>
              {guidance?.energy ?? 'Your energy needs structure before speed. Pick one priority, answer the message that unlocks work, and protect your body before you start spiraling.'}
            </p>
          )}
          <Link href="/luna" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8B6FB8' }}>Tell me more →</span>
          </Link>
        </div>
        <StarSigil />
      </div>

      {/* ── TODAY'S TOP 3 + NEXT EVENT ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Top 3 */}
        <div style={{ ...GLASS, borderRadius: 20, padding: '14px 14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
            <Target style={{ width: 13, height: 13, color: '#8B6FB8' }} strokeWidth={2} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#8B6FB8', textTransform: 'uppercase' }}>
              Today's Top 3
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 10 }}>
            {displayTasks.map((t, i) => (
              <div key={'id' in t ? t.id : i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: 'rgba(139,111,184,0.22)', border: '1px solid rgba(139,111,184,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#C4A9E8' }}>{i + 1}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{t.title}</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', margin: 0, marginTop: 1 }}>{'source' in t ? t.source : 'Work'}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/tasks" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600 }}>View all tasks →</span>
          </Link>
        </div>

        {/* Next Event */}
        <div style={{ ...GLASS, borderRadius: 20, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
            <Calendar style={{ width: 13, height: 13, color: '#8B6FB8' }} strokeWidth={2} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#8B6FB8', textTransform: 'uppercase' }}>
              Next Event
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.2, marginBottom: 6 }}>
              {nextEvent?.title ?? 'Client Call'}
            </p>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#8B6FB8', margin: 0, marginBottom: 5 }}>
              Today · {nextEvent?.startTime ?? '1:30 PM'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, lineHeight: 1.4 }}>
              Prep 15 minutes before.
            </p>
          </div>
          <Link href="/calendar" style={{ textDecoration: 'none', marginTop: 10 }}>
            <div style={{ padding: '8px 0', background: 'rgba(139,111,184,0.12)', border: '1px solid rgba(139,111,184,0.22)', borderRadius: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600 }}>View details →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────── */}
      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <Zap style={{ width: 13, height: 13, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: '#8B6FB8', textTransform: 'uppercase' }}>
            Quick Actions
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { icon: Mic,      label: 'Dictate',    href: '/luna?tab=dictate' },
            { icon: Brain,    label: 'Brain Dump', href: '/brain-dump'       },
            { icon: Calendar, label: 'Plan My Day',href: '/plan-my-day'      },
            { icon: Plus,     label: 'New Task',   href: '/tasks'            },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Icon style={{ width: 18, height: 18, color: 'rgba(196,169,232,0.75)' }} strokeWidth={1.6} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — 2×2 Preview grid (no scroll)
// ─────────────────────────────────────────────────────────────────────────────
function PreviewCard({
  label, icon, href, linkLabel, children, iconBg,
}: {
  label: string; icon: React.ReactNode; href: string; linkLabel: string
  children: React.ReactNode; iconBg?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'flex' }}>
      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexShrink: 0 }}>
          {icon}
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', color: '#8B6FB8', textTransform: 'uppercase', lineHeight: 1.3 }}>
            {label}
          </span>
        </div>
        {children}
        <span style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600, marginTop: 8, flexShrink: 0 }}>{linkLabel} →</span>
      </div>
    </Link>
  )
}

function Slide2({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{
      height: '100%', overflow: 'hidden',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
      gap: 10, padding: '4px 0 0',
    }}>

      {/* Astrology */}
      <PreviewCard label={'Astrology\nPreview'} icon={<Moon style={{ width: 18, height: 18, color: '#8B6FB8' }} strokeWidth={1.5} />} href="/astrology" linkLabel="Open Astrology">
        <CrescentMoon />
        <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: 0, marginBottom: 3, flexShrink: 0, lineHeight: 1.2 }}>
          Moon in Cancer
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5, flexShrink: 0 }}>
          {guidance?.moon_note ?? 'Emotional clarity · intuition · home'}
        </p>
      </PreviewCard>

      {/* Style */}
      <PreviewCard label={'Style\nPreview'} icon={<Scissors style={{ width: 18, height: 18, color: '#8B6FB8' }} strokeWidth={1.5} />} href="/creative" linkLabel="Open Atelier">
        <StyleVisual />
        <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: 0, marginTop: 8, marginBottom: 3, flexShrink: 0, lineHeight: 1.2 }}>
          Soft power dressing
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5, flexShrink: 0 }}>
          Neutrals · Structure · Effortless
        </p>
      </PreviewCard>

      {/* Money */}
      <PreviewCard label={'Money\nPreview'} icon={
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'white' }}>$</span>
        </div>
      } href="/money/transactions" linkLabel="View">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 6 }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'white', margin: 0, lineHeight: 1.25, marginBottom: 10 }}>
            2 bills due<br />this week
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, marginBottom: 2 }}>Total</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#4ADE80', margin: 0 }}>$320.00</p>
        </div>
      </PreviewCard>

      {/* Night */}
      <PreviewCard label={'Night\nPreview'} icon={<Moon style={{ width: 18, height: 18, color: '#8B6FB8' }} strokeWidth={1.5} />} href="/night" linkLabel="View">
        <PurpleCloud />
        <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: 0, marginBottom: 3, flexShrink: 0, lineHeight: 1.2 }}>
          Protect tomorrow.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5, flexShrink: 0 }}>
          Wind down.<br />Rest. Reset.
        </p>
      </PreviewCard>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — Energy check-in (no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '🌙', label: 'Calm'      }, { emoji: '🔥', label: 'Driven'    },
  { emoji: '🌸', label: 'Soft'      }, { emoji: '⚡', label: 'Bold'      },
  { emoji: '🌿', label: 'Grounded'  }, { emoji: '✨', label: 'Flowing'   },
  { emoji: '🫧', label: 'Scattered' }, { emoji: '💗', label: 'Open'      },
]
const MODES = [
  { id: 'normal'   as const, label: '✦ Normal',   bg: 'rgba(139,111,184,0.14)', border: 'rgba(139,111,184,0.35)', color: '#C4A9E8' },
  { id: 'recovery' as const, label: '🌿 Recovery', bg: 'rgba(90,138,90,0.14)',   border: 'rgba(90,138,90,0.35)',   color: '#8AB88A' },
  { id: 'rush'     as const, label: '⚡ Rush',      bg: 'rgba(201,165,60,0.14)', border: 'rgba(201,165,60,0.35)', color: '#C9A96E' },
]

function Slide3() {
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
        body: JSON.stringify({ type: 'midday', energyRating: energy, feeling: mood ?? undefined, supportNeed: mode !== 'normal' ? mode : null }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 3500)
    } finally { setSaving(false) }
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 0' }}>
      <div style={{ ...GLASS, borderRadius: 22, padding: '18px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Zap style={{ width: 15, height: 15, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>Energy Check-in</span>
        </div>
        {/* Mode */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 7px' }}>Mode</p>
          <div style={{ display: 'flex', gap: 7 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 12, border: `1px solid ${mode === m.id ? m.border : 'rgba(255,255,255,0.08)'}`, background: mode === m.id ? m.bg : 'transparent', color: mode === m.id ? m.color : 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {/* Energy level */}
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 7px' }}>Energy Level</p>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, height: 32, borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', background: energy !== null && n <= energy ? `rgba(139,111,184,${0.16 + (n/10)*0.6})` : 'rgba(255,255,255,0.06)', color: energy !== null && n <= energy ? 'white' : 'rgba(255,255,255,0.25)', transition: 'all 0.1s' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        {/* Mood */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 7px' }}>Mood</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {MOODS.map(m => (
              <button key={m.label} onClick={() => setMood(mood === m.label ? null : m.label)} style={{ padding: '8px 4px', borderRadius: 11, border: `1px solid ${mood === m.label ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.07)'}`, background: mood === m.label ? 'rgba(139,111,184,0.16)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 19 }}>{m.emoji}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: mood === m.label ? '#C4A9E8' : 'rgba(255,255,255,0.32)' }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Save */}
        <button onClick={save} disabled={saving} style={{ flexShrink: 0, padding: '12px', borderRadius: 16, border: `1px solid ${saved ? 'rgba(138,184,138,0.35)' : 'rgba(139,111,184,0.3)'}`, background: saved ? 'rgba(138,184,138,0.16)' : 'rgba(139,111,184,0.16)', color: saved ? '#8AB88A' : '#C4A9E8', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          {saving ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />Saving…</> : saved ? <><Check style={{ width: 14, height: 14 }} />Saved to LUNA</> : 'Save Check-in'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Weekly (no scroll)
// ─────────────────────────────────────────────────────────────────────────────
const GOALS = ['Scale DRYP to $15k/mo', 'Graduate USF on time', 'Launch crystal swimwear drop', 'Build a morning routine that holds']

function Slide4({ guidance }: { guidance: GuidanceData | null }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 0' }}>
      <div style={{ ...GLASS, background: 'rgba(40,22,80,0.12)', border: '1px solid rgba(139,111,184,0.16)', borderRadius: 22, padding: '16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <BookOpen style={{ width: 14, height: 14, color: '#C4A9E8' }} strokeWidth={1.6} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.55)' }}>Weekly Lesson</span>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
          {guidance?.shadow_question ?? 'What pattern keeps showing up this week — and what is it trying to teach you?'}
        </p>
      </div>
      <div style={{ ...GLASS, borderRadius: 22, padding: '16px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Star style={{ width: 14, height: 14, color: '#C9A96E' }} strokeWidth={1.6} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.55)' }}>Big Goals</span>
        </div>
        {GOALS.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < GOALS.length - 1 ? 10 : 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B6FB8', flexShrink: 0, marginTop: 5 }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.66)', lineHeight: 1.4, margin: 0 }}>{g}</p>
          </div>
        ))}
      </div>
      <Link href="/luna" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ ...GLASS, borderRadius: 18, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)' }}>Weekly Reset with LUNA</span>
          <ChevronRight style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.18)' }} />
        </div>
      </Link>
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
      .then(r => r.json()).then(d => setGuidance(d))
      .catch(() =>
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
      id: 'home', label: 'Home',
      content: <Slide1 greeting={greeting} moon={moon} guidance={guidance} gLoading={gLoading} topTasks={topTasks} calEvents={calEvents} dataLoaded={dataLoaded} />,
    },
    { id: 'previews', label: 'Previews', noScroll: true, content: <Slide2 guidance={guidance} /> },
    { id: 'energy',   label: 'Energy',   noScroll: true, content: <Slide3 /> },
    { id: 'weekly',   label: 'Weekly',   noScroll: true, content: <Slide4 guidance={guidance} /> },
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
          flex: 1, minHeight: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          padding: '0 16px',
          paddingBottom: 'calc(max(16px, env(safe-area-inset-bottom, 0px)) + 84px)',
        }}
        className="mx-auto w-full max-w-[1120px]"
      >
        <CategoryPager pages={pages} hidePills accentColor="#8B6FB8" />
      </main>

      <BottomNav />
      <DesktopTabBar />
    </SwipeContainer>
  )
}
