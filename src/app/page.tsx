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
  Star, Moon, Sparkles, ChevronRight, Target, Calendar,
  DollarSign, Mic, Brain, CheckSquare, Zap, Check, Loader2,
  RotateCcw, BookOpen, Heart, Scissors, Clock,
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
  { name: 'New Moon', emoji: '🌑', pct: 0 },
  { name: 'Waxing Crescent', emoji: '🌒', pct: 14 },
  { name: 'First Quarter', emoji: '🌓', pct: 28 },
  { name: 'Waxing Gibbous', emoji: '🌔', pct: 82 },
  { name: 'Full Moon', emoji: '🌕', pct: 100 },
  { name: 'Waning Gibbous', emoji: '🌖', pct: 72 },
  { name: 'Last Quarter', emoji: '🌗', pct: 50 },
  { name: 'Waning Crescent', emoji: '🌘', pct: 18 },
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

// ─── Glass card base ──────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 24,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
}

// ─── Moon visual (CSS) ────────────────────────────────────────────────────────
function CSSMoon() {
  return (
    <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
      {/* Outer atmospheric glow */}
      <div style={{
        position: 'absolute', inset: -20, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,130,60,0.18) 0%, transparent 70%)',
      }} />
      {/* Moon body */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'radial-gradient(ellipse at 38% 36%, #fce8a8 0%, #e0b84a 22%, #b07820 52%, #7a5010 76%, #3c2408 100%)',
        boxShadow: '0 0 40px rgba(200,145,50,0.28), 0 0 80px rgba(160,100,20,0.12)',
      }}>
        {/* Surface texture */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: [
            'radial-gradient(circle at 28% 68%, rgba(0,0,0,0.18) 0%, transparent 18%)',
            'radial-gradient(circle at 62% 32%, rgba(255,255,255,0.07) 0%, transparent 22%)',
            'radial-gradient(circle at 50% 55%, rgba(0,0,0,0.12) 0%, transparent 16%)',
            'radial-gradient(circle at 74% 64%, rgba(0,0,0,0.10) 0%, transparent 12%)',
          ].join(', '),
        }} />
      </div>
      {/* Purple moonlit haze at bottom of card */}
      <div style={{
        position: 'absolute', bottom: -40, left: -40, right: -40, height: 60,
        background: 'radial-gradient(ellipse, rgba(80,40,140,0.35) 0%, transparent 70%)',
      }} />
    </div>
  )
}

// ─── Star sigil visual ────────────────────────────────────────────────────────
function StarSigil() {
  return (
    <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      {/* Ripple rings */}
      {[42, 32, 22, 12].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          inset: `${42 - r}px`,
          borderRadius: '50%',
          border: `0.5px solid rgba(139,111,184,${0.15 + i * 0.08})`,
        }} />
      ))}
      {/* SVG 8-pointed star */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 0 8px rgba(196,169,232,0.7))' }}
        viewBox="0 0 84 84"
      >
        <path
          d="M42 6 L43.8 40.2 L78 42 L43.8 43.8 L42 78 L40.2 43.8 L6 42 L40.2 40.2 Z"
          fill="rgba(220,200,255,0.92)"
        />
        <path
          d="M42 18 L43.2 40.8 L66 18 L43.2 43.2 L66 66 L40.8 43.2 L18 66 L40.8 40.8 L18 18 L43.2 40.8 Z"
          fill="rgba(139,111,184,0.35)"
        />
        <circle cx="42" cy="42" r="2.5" fill="white" opacity="0.95" />
      </svg>
    </div>
  )
}

// ─── PAGE 1: TODAY ────────────────────────────────────────────────────────────
function PageToday({
  greeting, moon, guidance, gLoading, topTasks, calEvents, dataLoaded,
}: {
  greeting: string; moon: typeof MOON_PHASES[0]
  guidance: GuidanceData | null; gLoading: boolean
  topTasks: HomeTask[]; calEvents: HomeCalEvent[]; dataLoaded: boolean
}) {
  const nextEvent = calEvents[0] ?? null

  const TASK_FALLBACKS = [
    { id: 'f1', title: 'Reply to priority client email', source: 'Work' },
    { id: 'f2', title: 'Finish DRYP task', source: 'DRYPHub' },
    { id: 'f3', title: 'Plan one clear work block', source: 'Calendar' },
  ]

  const TASK_SOURCES: Record<string, string> = {
    'f1': 'Work', 'f2': 'DRYPHub', 'f3': 'Calendar',
  }

  const displayTasks = topTasks.length > 0 ? topTasks.slice(0, 3) : TASK_FALLBACKS

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>

      {/* Hero greeting card */}
      <div style={{
        ...GLASS,
        background: 'linear-gradient(135deg, rgba(40,15,90,0.75) 0%, rgba(20,8,55,0.85) 100%)',
        border: '1px solid rgba(139,111,184,0.20)',
        borderRadius: 28,
        padding: '20px 20px 18px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        boxShadow: '0 8px 40px rgba(60,20,120,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        minHeight: 118,
      }}>
        {/* Stars bg */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4, background: 'radial-gradient(ellipse at 20% 20%, rgba(139,111,184,0.3) 0%, transparent 50%)' }} />
        {/* Text */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, paddingRight: 8 }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 6 }}>
            {greeting}, Zoe ✦
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#A98FE8', lineHeight: 1.4, marginBottom: 2 }}>
            You are not behind.
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#A98FE8', lineHeight: 1.4, marginBottom: 10 }}>
            You are becoming.
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ fontSize: 13 }}>{moon.emoji}</span>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                {moon.name} · {moon.pct}% illuminated
              </p>
              <p style={{ fontSize: 10, color: 'rgba(196,169,232,0.55)', lineHeight: 1.4 }}>
                Illuminating your next step
              </p>
            </div>
          </div>
        </div>
        {/* Moon */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <CSSMoon />
        </div>
      </div>

      {/* LUNA'S MESSAGE */}
      <div style={{
        ...GLASS,
        background: 'rgba(20,10,50,0.7)',
        border: '1px solid rgba(139,111,184,0.15)',
        borderRadius: 24,
        padding: '16px 18px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10 }}>✦</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#8B6FB8', textTransform: 'uppercase' }}>
              LUNA'S MESSAGE
            </span>
          </div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 11, borderRadius: 5, background: 'rgba(255,255,255,0.07)', width: i === 3 ? '65%' : '100%' }} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: 10 }}>
              {guidance?.energy ?? 'Your energy needs structure before speed. Pick one priority, answer the message that unlocks work, and protect your body before you start spiraling.'}
            </p>
          )}
          <Link href="/luna" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#8B6FB8' }}>Tell me more →</span>
          </Link>
        </div>
        <StarSigil />
      </div>

      {/* Today's Top 3 + Next Event */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Top 3 */}
        <div style={{ ...GLASS, borderRadius: 22, padding: '14px 14px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
            <Target style={{ width: 12, height: 12, color: '#8B6FB8' }} strokeWidth={2} />
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#8B6FB8', textTransform: 'uppercase' }}>
              Today's Top 3
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
            {(!dataLoaded ? TASK_FALLBACKS : displayTasks).map((t, i) => (
              <div key={'id' in t ? t.id : i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(139,111,184,0.25)', border: '1px solid rgba(139,111,184,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#C4A9E8' }}>{i + 1}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.title}
                  </p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
                    {'source' in t ? t.source : 'Work'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/work" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600 }}>View all tasks →</span>
          </Link>
        </div>

        {/* Next Event */}
        <div style={{ ...GLASS, borderRadius: 22, padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
              <Calendar style={{ width: 12, height: 12, color: '#8B6FB8' }} strokeWidth={2} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#8B6FB8', textTransform: 'uppercase' }}>
                Next Event
              </span>
            </div>
            {!dataLoaded ? (
              <div style={{ height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
            ) : nextEvent ? (
              <>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 4 }}>
                  {nextEvent.title}
                </p>
                <p style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600, marginBottom: 4 }}>
                  Today · {nextEvent.startTime}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                  Prep 15 minutes before.
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: 4 }}>
                  Client Call
                </p>
                <p style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600, marginBottom: 4 }}>
                  Today · 1:30 PM
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                  Prep 15 minutes before.
                </p>
              </>
            )}
          </div>
          <Link href="/calendar" style={{ textDecoration: 'none' }}>
            <div style={{ marginTop: 10, padding: '7px 0', background: 'rgba(255,255,255,0.05)', borderRadius: 12, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: '#8B6FB8', fontWeight: 600 }}>View details →</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 4 Preview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
        {/* Astrology */}
        <Link href="/astrology" style={{ textDecoration: 'none' }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(196,169,232,0.6)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              ASTROLOGY{'\n'}PREVIEW
            </span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6B4F9E, #2D1A5E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon style={{ width: 16, height: 16, color: '#C4A9E8' }} strokeWidth={1.5} />
              </div>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>Moon in Cancer</p>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.4 }}>Emotional clarity · intuition · home</p>
            <span style={{ fontSize: 9, color: '#8B6FB8', fontWeight: 600, textAlign: 'center' }}>Open →</span>
          </div>
        </Link>

        {/* Style */}
        <Link href="/creative" style={{ textDecoration: 'none' }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(196,169,232,0.6)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              STYLE{'\n'}PREVIEW
            </span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3D2860, #1A0E35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Scissors style={{ width: 16, height: 16, color: '#C4A9E8' }} strokeWidth={1.5} />
              </div>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>Soft power dressing</p>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.4 }}>Neutrals · Structure · Effortless</p>
            <span style={{ fontSize: 9, color: '#8B6FB8', fontWeight: 600, textAlign: 'center' }}>Open →</span>
          </div>
        </Link>

        {/* Money */}
        <Link href="/money/transactions" style={{ textDecoration: 'none' }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(196,169,232,0.6)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              MONEY{'\n'}PREVIEW
            </span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1A4A20, #0D2810)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign style={{ width: 16, height: 16, color: '#4ADE80' }} strokeWidth={1.5} />
              </div>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>2 bills due this week</p>
            <p style={{ fontSize: 8, color: '#4ADE80', textAlign: 'center', lineHeight: 1.4, fontWeight: 600 }}>$320.00</p>
            <span style={{ fontSize: 9, color: '#8B6FB8', fontWeight: 600, textAlign: 'center' }}>View →</span>
          </div>
        </Link>

        {/* Night */}
        <Link href="/night" style={{ textDecoration: 'none' }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(196,169,232,0.6)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.3 }}>
              NIGHT{'\n'}PREVIEW
            </span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1A1050, #0A0828)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Moon style={{ width: 16, height: 16, color: '#A890D0' }} strokeWidth={1.5} />
              </div>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'white', textAlign: 'center', lineHeight: 1.2 }}>Protect tomorrow.</p>
            <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.4 }}>Wind down. Rest. Reset.</p>
            <span style={{ fontSize: 9, color: '#8B6FB8', fontWeight: 600, textAlign: 'center' }}>View →</span>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div style={{ ...GLASS, borderRadius: 22, padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Zap style={{ width: 13, height: 13, color: '#8B6FB8' }} strokeWidth={2} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', color: '#8B6FB8', textTransform: 'uppercase' }}>
            Quick Actions
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {[
            { icon: Mic,         label: 'Dictate',     href: '/luna?tab=dictate' },
            { icon: Brain,       label: 'Brain Dump',  href: '/luna?tab=journal' },
            { icon: Calendar,    label: 'Plan My Day', href: '/plan-my-day' },
            { icon: CheckSquare, label: 'New Task',    href: '/tasks' },
          ].map(({ icon: Icon, label, href }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                padding: '10px 4px', borderRadius: 16,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <Icon style={{ width: 18, height: 18, color: 'rgba(196,169,232,0.75)' }} strokeWidth={1.6} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.2 }}>
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─── PAGE 2: ENERGY ───────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '🌙', label: 'Calm' }, { emoji: '🔥', label: 'Driven' },
  { emoji: '🌸', label: 'Soft' }, { emoji: '⚡', label: 'Bold' },
  { emoji: '🌿', label: 'Grounded' }, { emoji: '✨', label: 'Flowing' },
  { emoji: '🫧', label: 'Scattered' }, { emoji: '💗', label: 'Open' },
]
const BODY_NEEDS = ['Rest', 'Water', 'Movement', 'Sunlight', 'Food', 'Quiet', 'Connection', 'Focus']
const MODES = [
  { id: 'normal' as const,   label: '✦ Normal',   bg: 'rgba(139,111,184,0.12)', border: 'rgba(139,111,184,0.3)', color: '#C4A9E8', hint: '' },
  { id: 'recovery' as const, label: '🌿 Recovery', bg: 'rgba(90,138,90,0.12)',   border: 'rgba(90,138,90,0.3)',   color: '#8AB88A', hint: 'Rest first. Protect your energy. Do only what truly matters.' },
  { id: 'rush' as const,     label: '⚡ Rush',      bg: 'rgba(201,120,60,0.12)',  border: 'rgba(201,120,60,0.3)',  color: '#C9A96E', hint: 'High output mode. Triage ruthlessly. Block distractions. Move fast.' },
]

function PageEnergy() {
  const [mood, setMood] = useState<string | null>(null)
  const [body, setBody] = useState<string[]>([])
  const [energy, setEnergy] = useState<number | null>(null)
  const [mode, setMode] = useState<'normal' | 'recovery' | 'rush'>('normal')
  const [feeling, setFeeling] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveErr, setSaveErr] = useState(false)

  const activeMode = MODES.find(m => m.id === mode)!

  function toggleBody(n: string) {
    setBody(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setSaveErr(false)
    try {
      const res = await fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'midday', energyRating: energy,
          feeling: [mood, ...body].filter(Boolean).join(', ') || feeling || null,
          onMind: feeling || null,
          supportNeed: mode !== 'normal' ? mode : null,
          aiResponse: { mode, mood, bodyNeeds: body, energyLevel: energy, feeling },
        }),
      })
      if (!res.ok) throw new Error('failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch {
      setSaveErr(true)
      setTimeout(() => setSaveErr(false), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Today's Mode</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 12, border: `1px solid ${mode === m.id ? m.border : 'rgba(255,255,255,0.08)'}`, background: mode === m.id ? m.bg : 'transparent', color: mode === m.id ? m.color : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>
        {activeMode.hint && <p style={{ fontSize: 11, color: activeMode.color + 'B3', marginTop: 8, lineHeight: 1.5 }}>{activeMode.hint}</p>}
      </div>

      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Energy Level</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, height: 32, borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none', background: energy !== null && n <= energy ? `rgba(139,111,184,${0.2 + (n/10)*0.55})` : 'rgba(255,255,255,0.06)', color: energy !== null && n <= energy ? 'white' : 'rgba(255,255,255,0.28)' }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Mood</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
          {MOODS.map(m => (
            <button key={m.label} onClick={() => setMood(mood === m.label ? null : m.label)} style={{ padding: '9px 4px', borderRadius: 12, border: `1px solid ${mood === m.label ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.07)'}`, background: mood === m.label ? 'rgba(139,111,184,0.14)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 18 }}>{m.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: mood === m.label ? '#C4A9E8' : 'rgba(255,255,255,0.38)' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Body Needs</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {BODY_NEEDS.map(n => (
            <button key={n} onClick={() => toggleBody(n)} style={{ padding: '6px 12px', borderRadius: 18, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${body.includes(n) ? 'rgba(168,196,218,0.4)' : 'rgba(255,255,255,0.08)'}`, background: body.includes(n) ? 'rgba(168,196,218,0.12)' : 'transparent', color: body.includes(n) ? '#A8C4DA' : 'rgba(255,255,255,0.38)' }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, borderRadius: 22, padding: '14px 16px' }}>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>What's on your mind?</p>
        <input value={feeling} onChange={e => setFeeling(e.target.value)} placeholder="Anything taking up space…" style={{ width: '100%', padding: '9px 13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      <button onClick={handleSave} disabled={saving} style={{ padding: '13px 24px', borderRadius: 18, border: `1px solid ${saved ? 'rgba(138,184,138,0.3)' : saveErr ? 'rgba(224,94,94,0.25)' : 'rgba(139,111,184,0.3)'}`, background: saved ? 'rgba(138,184,138,0.18)' : saveErr ? 'rgba(224,94,94,0.15)' : 'rgba(139,111,184,0.18)', color: saved ? '#8AB88A' : saveErr ? '#E05E5E' : '#C4A9E8', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        {saving ? <><Loader2 style={{ width: 15, height: 15 }} className="animate-spin" /> Saving…</> : saved ? <><Check style={{ width: 15, height: 15 }} /> Saved to LUNA memory</> : saveErr ? 'Tap to retry' : 'Save check-in'}
      </button>
    </div>
  )
}

// ─── PAGE 3: DAILY PREVIEWS ───────────────────────────────────────────────────
function PagePreviews({ guidance }: { guidance: GuidanceData | null }) {
  const previews = [
    { emoji: '✨', label: 'Astrology', sub: guidance?.horoscope?.slice(0, 60) ?? 'Your Scorpio Sun is activated today.', color: '#C4A9E8', href: '/astrology' },
    { emoji: '✂️', label: 'Style',     sub: 'Soft power dressing. Neutrals & structure.', color: '#C9A96E', href: '/creative' },
    { emoji: '💰', label: 'Money',     sub: '2 bills due this week. Total $320.00', color: '#8AB88A', href: '/money/transactions' },
    { emoji: '🌙', label: 'Night',     sub: 'Protect tomorrow. Wind down. Rest. Reset.', color: '#A890D0', href: '/night' },
    { emoji: '💼', label: 'Career',    sub: 'DRYP tasks need attention. Check your pipeline.', color: '#A8C4DA', href: '/work' },
    { emoji: '🏠', label: 'Home Reset', sub: 'Refresh your space. Clear the energy.', color: '#D4A8C4', href: '/luna' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {previews.map(p => (
          <Link key={p.label} href={p.href} style={{ textDecoration: 'none' }}>
            <div style={{ ...GLASS, borderRadius: 22, padding: '16px 14px', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{p.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: p.color, textTransform: 'uppercase' }}>{p.label}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55 }}>{p.sub}</p>
              <p style={{ fontSize: 11, color: p.color, fontWeight: 600, marginTop: 8 }}>Open →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── PAGE 4: WEEKLY ───────────────────────────────────────────────────────────
function PageWeekly({ guidance }: { guidance: GuidanceData | null }) {
  const [parked, setParked] = useState(['Review DRYP client proposals', 'Plan content calendar', 'Sewing project: crystal bikini set'])
  const [newItem, setNewItem] = useState('')
  const goals = ['Scale DRYP to $15k/mo', 'Graduate USF on time', 'Launch crystal swimwear drop', 'Build a morning routine that holds']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0 8px' }}>
      <div style={{ ...GLASS, borderRadius: 22, padding: '16px 18px', background: 'rgba(60,40,100,0.10)', border: '1px solid rgba(139,111,184,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <BookOpen style={{ width: 14, height: 14, color: '#C4A9E8' }} strokeWidth={1.6} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.65)' }}>Weekly Lesson</span>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontStyle: 'italic' }}>
          {guidance?.shadow_question ?? 'What pattern keeps showing up this week — and what is it trying to teach you?'}
        </p>
      </div>

      <div style={{ ...GLASS, borderRadius: 22, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Star style={{ width: 14, height: 14, color: '#C9A96E' }} strokeWidth={1.6} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.65)' }}>Big Goals</span>
        </div>
        {goals.map((g, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8B6FB8', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.3 }}>{g}</p>
          </div>
        ))}
      </div>

      <div style={{ ...GLASS, borderRadius: 22, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Sparkles style={{ width: 14, height: 14, color: '#A8C4DA' }} strokeWidth={1.6} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(168,196,218,0.65)' }}>Parked Ideas</span>
        </div>
        {parked.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(168,196,218,0.45)' }}>◦</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', flex: 1, lineHeight: 1.4 }}>{item}</p>
            <button onClick={() => setParked(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && newItem.trim() && (setParked(p => [...p, newItem.trim()]), setNewItem(''))} placeholder="Park an idea…" style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'white', fontSize: 12, outline: 'none' }} />
          <button onClick={() => newItem.trim() && (setParked(p => [...p, newItem.trim()]), setNewItem(''))} style={{ padding: '8px 14px', borderRadius: 12, border: 'none', background: 'rgba(139,111,184,0.18)', color: '#C4A9E8', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <Link href="/luna" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, borderRadius: 22, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.35)' }} strokeWidth={1.6} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Weekly Reset with LUNA</span>
          </div>
          <ChevronRight style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.2)' }} />
        </div>
      </Link>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [hour,       setHour]       = useState(new Date().getHours())
  const [guidance,   setGuidance]   = useState<GuidanceData | null>(null)
  const [gLoading,   setGLoading]   = useState(true)
  const [calEvents,  setCalEvents]  = useState<HomeCalEvent[]>([])
  const [topTasks,   setTopTasks]   = useState<HomeTask[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  const moon     = getMoonPhase()
  const greeting = getGreeting(hour)

  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(() => {
    setGLoading(true)
    fetch('/api/astrology/daily-guidance')
      .then(r => r.json()).then(d => setGuidance(d))
      .catch(() => fetch('/api/ai/spiritual-guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).then(r => r.json()).then(d => setGuidance(d)).catch(() => {}))
      .finally(() => setGLoading(false))
    fetch('/api/home/summary')
      .then(r => r.json())
      .then(d => {
        if (d.calendar?.today) setCalEvents(d.calendar.today)
        if (d.tasks?.top) setTopTasks(d.tasks.top)
      })
      .catch(() => {}).finally(() => setDataLoaded(true))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const homePages = [
    {
      id: 'today', label: 'Today',
      content: <PageToday greeting={greeting} moon={moon} guidance={guidance} gLoading={gLoading} topTasks={topTasks} calEvents={calEvents} dataLoaded={dataLoaded} />,
    },
    { id: 'energy',   label: 'Energy',   content: <PageEnergy /> },
    { id: 'previews', label: 'Previews', content: <PagePreviews guidance={guidance} /> },
    { id: 'weekly',   label: 'Weekly',   content: <PageWeekly guidance={guidance} /> },
  ]

  return (
    <SwipeContainer
      style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      className="bg-app"
    >
      {/* Desktop header (hidden on mobile) */}
      <DesktopHeader />

      {/* Mobile top bar (hidden on desktop) */}
      <div className="lg:hidden" style={{ flexShrink: 0 }}>
        <MobileTopBar />
      </div>

      {/* Content pager */}
      <main
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 16px' }}
        className="mx-auto w-full max-w-[1120px]"
      >
        <CategoryPager pages={homePages} hidePills accentColor="#8B6FB8" />
      </main>

      {/* Bottom nav + desktop tab bar */}
      <BottomNav />
      <DesktopTabBar />
    </SwipeContainer>
  )
}
