'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { format } from 'date-fns'
import {
  Heart, Zap, Moon, BriefcaseIcon, Sparkles, Compass,
  Star, Calendar, ChevronRight, ArrowRight, Sun, Plus,
  MessageCircle, MoreHorizontal, MapPin, Clock, CheckCircle2, Circle
} from 'lucide-react'
import Link from 'next/link'

// ─── Static data ────────────────────────────────────────────
const AFFIRMATIONS = [
  'I move with grace. I do not chase the day — I guide it.',
  'My ideas are safe. My energy is sacred. I choose what matters.',
  'I am not here to do everything. I am here to do what is mine.',
  'I trust my own voice. Clarity comes when I speak my truth.',
  'I am becoming the woman I see in my future.',
  'Rest is productive. Peace is power. Softness is strength.',
  'I lead with recognition, not reaction.',
]

const SPIRIT_MESSAGES = [
  'Rest is not a reward. It is part of the work.',
  'You are most powerful when you pause before you speak.',
  'Not everything that calls your name deserves your energy.',
  'Your intuition already knows. Give it space to be heard.',
  'What you tend to quietly will grow the loudest.',
  'Receive before you give. Fill before you pour.',
]

const CRYSTALS = [
  { name: 'Amethyst',        tags: 'Calm · Clarity · Protection',      color: '#8B6FB8', emoji: '🔮' },
  { name: 'Labradorite',     tags: 'Intuition · Magic · Vision',        color: '#4A7FB8', emoji: '✨' },
  { name: 'Rose Quartz',     tags: 'Self-love · Healing · Softness',    color: '#E8B4B8', emoji: '💗' },
  { name: 'Citrine',         tags: 'Abundance · Motivation · Clarity',  color: '#E8C97A', emoji: '⭐' },
  { name: 'Black Tourmaline',tags: 'Protection · Grounding · Safety',   color: '#3D3547', emoji: '🖤' },
  { name: 'Selenite',        tags: 'Clarity · Higher guidance · Peace', color: '#B8C4D8', emoji: '🌙' },
  { name: 'Moonstone',       tags: 'Intuition · Cycles · Feminine flow',color: '#C4D0E8', emoji: '🌕' },
]

const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', keyword: 'Intentions' },
  { name: 'Waxing Crescent', emoji: '🌒', keyword: 'Growth'     },
  { name: 'First Quarter',   emoji: '🌓', keyword: 'Action'     },
  { name: 'Waxing Gibbous',  emoji: '🌔', keyword: 'Refine'     },
  { name: 'Full Moon',       emoji: '🌕', keyword: 'Release'    },
  { name: 'Waning Gibbous',  emoji: '🌖', keyword: 'Gratitude'  },
  { name: 'Last Quarter',    emoji: '🌗', keyword: 'Let go'     },
  { name: 'Waning Crescent', emoji: '🌘', keyword: 'Rest'       },
]

function getTodayIndex<T>(arr: T[]) { return new Date().getDate() % arr.length }

function getMoonPhase(): (typeof MOON_PHASES)[0] {
  const known = new Date('2024-01-11').getTime()
  const days = (Date.now() - known) / (1000 * 60 * 60 * 24)
  return MOON_PHASES[Math.floor(((days % 29.53) / 29.53) * 8)] ?? MOON_PHASES[0]
}

function getTimeGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Donut ring ──────────────────────────────────────────────
function Ring({ pct, size = 64, stroke = 6, color = '#8B6FB8', label }: {
  pct: number; size?: number; stroke?: number; color?: string; label?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      {label && (
        <>
          <text x={size/2} y={size/2 - 4} textAnchor="middle" fill="white" style={{ fontSize: size*0.22, fontWeight: 700 }}>{pct}%</text>
          <text x={size/2} y={size/2 + size*0.17} textAnchor="middle" fill="rgba(255,255,255,0.5)" style={{ fontSize: size*0.13 }}>{label}</text>
        </>
      )}
    </svg>
  )
}

// ─── Sparkline ──────────────────────────────────────────────
function Sparkline({ values, color = '#8B6FB8' }: { values: number[]; color?: string }) {
  const w = 120, h = 36
  const max = Math.max(...values), min = Math.min(...values)
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h * 0.8 - h * 0.1
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Mobile stat card ────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl p-3 flex flex-col items-center gap-2"
      style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(139,111,184,0.08)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mist)' }}>{label}</p>
      <div className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `${color}18`, border: `2px solid ${color}40` }}>
        {icon}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold" style={{ color: 'var(--depth)' }}>{value}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--mist)' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── Dark card wrapper ───────────────────────────────────────
function DCard({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  return (
    <div className={`dark-card p-5 ${className}`} style={style}>
      {children}
    </div>
  )
}

// ─── Dark card label ─────────────────────────────────────────
function DLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{children}</p>
}

export default function SanctuaryPage() {
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Finalize client proposal', sub: 'High impact', done: true  },
    { id: 2, title: 'Workout & movement',        sub: 'Build energy', done: true  },
    { id: 3, title: 'Deep work block',           sub: '90 minutes',  done: false },
  ])

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const hour        = new Date().getHours()
  const today       = format(new Date(), 'EEEE, MMMM d')
  const greeting    = getTimeGreeting(hour)
  const affirmation = AFFIRMATIONS[getTodayIndex(AFFIRMATIONS)]
  const crystal     = CRYSTALS[getTodayIndex(CRYSTALS)]
  const spiritMsg   = SPIRIT_MESSAGES[getTodayIndex(SPIRIT_MESSAGES)]
  const moon        = getMoonPhase()

  const toggleTask = (id: number) =>
    setTasks(t => t.map(task => task.id === id ? { ...task, done: !task.done } : task))

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          MOBILE / TABLET  — light cream sanctuary theme
      ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #EDE8F5 0%, #F5F0FC 30%, #FDF8F3 70%)' }}>

        {/* Background orbs */}
        <div className="fixed -top-32 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(184,159,216,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="fixed top-40 -left-20 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(168,196,218,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <AppLayout noPad>
          <div className="px-4 pt-12 pb-nav space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--mist)' }}>{today}</p>
                <h1 className="font-display text-[2rem] font-bold leading-tight" style={{ color: 'var(--depth)' }}>
                  {greeting}, Zoe ✨
                </h1>
                <p className="text-sm mt-1 font-display italic" style={{ color: 'var(--violet)' }}>
                  You are not behind. You are returning.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 ml-3 flex-shrink-0">
                <div className="text-3xl opacity-80">{moon.emoji}</div>
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))', border: '2px solid white' }}>
                  <span className="text-white text-sm font-bold">Z</span>
                </div>
              </div>
            </div>

            {/* 4-stat row */}
            <div className="flex gap-2">
              <StatCard icon={<Heart className="h-4 w-4" style={{ color: '#8B6FB8' }} />} label="Mood" value="Calm" sub="7/10" color="#8B6FB8" />
              <StatCard icon={<Zap className="h-4 w-4" style={{ color: '#C9A96E' }} />} label="Energy" value="Steady" sub="6/10" color="#C9A96E" />
              <StatCard icon={<Moon className="h-4 w-4" style={{ color: '#6A4F9B' }} />} label="Sleep" value="Good" sub="7.5 hrs" color="#6A4F9B" />
              <StatCard icon={<span className="text-base">{moon.emoji}</span>} label="Moon" value={moon.keyword} sub={moon.name.split(' ').slice(-1)[0]} color="#A8C4DA" />
            </div>

            {/* Affirmation */}
            <div className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.1)' }}>
              <span className="text-4xl flex-shrink-0">🔮</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--mist)' }}>Daily Affirmation</p>
                <p className="text-sm font-semibold leading-relaxed" style={{ color: 'var(--depth)' }}>{affirmation}</p>
              </div>
            </div>

            {/* Next Meeting + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mist)' }}>Next Meeting</p>
                  <Calendar className="h-3.5 w-3.5" style={{ color: 'var(--mist)' }} />
                </div>
                <p className="text-lg font-bold mb-0.5" style={{ color: 'var(--depth)' }}>11:00 AM</p>
                <p className="text-xs leading-snug mb-3" style={{ color: 'var(--mid)' }}>DRYP Weekly Strategy</p>
                <Link href="/today">
                  <div className="px-3 py-1.5 rounded-xl text-center text-xs font-semibold"
                    style={{ background: 'rgba(139,111,184,0.1)', color: 'var(--violet)' }}>Prep</div>
                </Link>
              </div>
              <div className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.1)' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--mist)' }}>Priority</p>
                  <Star className="h-3.5 w-3.5" style={{ color: '#C9A96E' }} />
                </div>
                <p className="text-sm font-bold leading-snug mb-1" style={{ color: 'var(--depth)' }}>Review client website plan</p>
                <p className="text-[10px]" style={{ color: 'var(--mist)' }}>This unlocks everything.</p>
              </div>
            </div>

            {/* Spirit + Crystal + Career */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.08)' }}>
                <div className="text-base mb-2">🪷</div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--mist)' }}>Spirit</p>
                <p className="text-[11px] leading-snug mb-2" style={{ color: 'var(--mid)' }}>{spiritMsg}</p>
                <Link href="/spirit"><p className="text-[11px] font-semibold" style={{ color: 'var(--violet)' }}>Read →</p></Link>
              </div>
              <div className="rounded-2xl p-3 flex flex-col items-center text-center"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.08)' }}>
                <div className="text-base mb-2">🔮</div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--mist)' }}>Crystal</p>
                <p className="text-[11px] font-bold mb-1" style={{ color: 'var(--depth)' }}>{crystal.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--mid)' }}>{crystal.tags}</p>
              </div>
              <div className="rounded-2xl p-3"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.08)' }}>
                <div className="text-base mb-2">🧭</div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--mist)' }}>Career</p>
                <p className="text-[11px] leading-snug mb-2" style={{ color: 'var(--mid)' }}>Align work with recognition.</p>
                <Link href="/career"><p className="text-[11px] font-semibold" style={{ color: 'var(--violet)' }}>Open →</p></Link>
              </div>
            </div>

            {/* Mode buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/late-mode">
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(201,169,110,0.2)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,169,110,0.12)' }}>
                    <Sun className="h-5 w-5" style={{ color: '#C9A96E' }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--depth)' }}>I Woke Up Late</p>
                    <p className="text-[10px]" style={{ color: 'var(--mist)' }}>Reset without guilt</p>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: 'var(--faint)' }} />
                </div>
              </Link>
              <Link href="/rush-mode">
                <div className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(139,111,184,0.15)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,111,184,0.1)' }}>
                    <Zap className="h-5 w-5" style={{ color: 'var(--violet)' }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--depth)' }}>I&apos;m Rushing</p>
                    <p className="text-[10px]" style={{ color: 'var(--mist)' }}>Sacred minimum</p>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: 'var(--faint)' }} />
                </div>
              </Link>
            </div>

            {/* Tonight strip */}
            <Link href="/night">
              <div className="rounded-2xl px-4 py-3.5 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(139,111,184,0.12)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌙</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--violet)' }}>Tonight&apos;s Protection</p>
                    <p className="text-[11px]" style={{ color: 'var(--mist)' }}>Start wind-down by 9:30 PM</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" style={{ color: 'var(--violet)' }} />
              </div>
            </Link>
          </div>
        </AppLayout>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — dark CarPlay / Apple glass UI
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen"
        style={{ background: 'linear-gradient(180deg, #1E1A38 0%, #141030 40%, #0D0B1E 100%)' }}>

        {/* Ambient orbs */}
        <div className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(139,111,184,0.15) 0%, transparent 60%)', filter: 'blur(40px)' }} />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] pointer-events-none"
          style={{ background: 'radial-gradient(circle at 20% 80%, rgba(90,120,180,0.1) 0%, transparent 60%)', filter: 'blur(40px)' }} />

        <AppLayout noPad>
          <div className="pt-20 pb-[110px] px-8">

            {/* ── HERO BANNER ── */}
            <div className="relative rounded-3xl overflow-hidden mb-5"
              style={{
                background: 'linear-gradient(135deg, #1A1535 0%, #241D4A 50%, #1A1535 100%)',
                border: '1px solid rgba(139,111,184,0.2)',
                minHeight: 160,
              }}>
              {/* Moon glow */}
              <div className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none">
                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(200,190,240,0.9) 30%, rgba(150,130,220,0.4) 60%, transparent 80%)',
                    boxShadow: '0 0 60px 20px rgba(180,160,240,0.25)',
                  }} />
                {/* Crescent shadow */}
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 35% 50%, rgba(14,12,32,0.7) 0%, transparent 55%)',
                  }} />
              </div>

              {/* Stars */}
              {[
                { top: '15%', right: '38%', size: 3 },
                { top: '70%', right: '52%', size: 2 },
                { top: '25%', right: '60%', size: 2 },
                { top: '55%', right: '65%', size: 3 },
                { top: '40%', right: '42%', size: 2 },
              ].map((s, i) => (
                <div key={i} className="absolute rounded-full" style={{
                  top: s.top, right: s.right,
                  width: s.size, height: s.size,
                  background: 'rgba(255,255,255,0.8)',
                }} />
              ))}

              <div className="relative z-10 px-10 py-10">
                <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{today}</p>
                <h1 className="font-display text-5xl font-bold mb-2" style={{ color: 'white' }}>
                  ✦ {greeting}, Zoe ✦
                </h1>
                <p className="text-lg mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  You are not behind. You are returning.
                </p>
                <Link href="/morning">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      backdropFilter: 'blur(12px)',
                    }}>
                    Let&apos;s begin ✦
                  </button>
                </Link>
              </div>
            </div>

            {/* ── ROW 1: 4 main cards ── */}
            <div className="grid grid-cols-4 gap-4 mb-4">

              {/* Today's Priorities */}
              <DCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" style={{ color: '#8B6FB8' }} strokeWidth={2} />
                    <span className="text-sm font-semibold text-white">Today&apos;s Priorities</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(139,111,184,0.2)', color: '#C4A9E8' }}>
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tasks.map(task => (
                    <button key={task.id} onClick={() => toggleTask(task.id)}
                      className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {task.done
                        ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#8B6FB8' }} />
                        : <Circle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      }
                      <div className="min-w-0">
                        <p className="text-xs font-medium" style={{ color: task.done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)', textDecoration: task.done ? 'line-through' : 'none' }}>
                          {task.title}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{task.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button className="flex items-center gap-2 mt-3 text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Plus className="h-3.5 w-3.5" /> Add a priority
                </button>
              </DCard>

              {/* Messages */}
              <DCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" style={{ color: '#8B6FB8' }} strokeWidth={2} />
                    <span className="text-sm font-semibold text-white">Messages</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(139,111,184,0.2)', color: '#C4A9E8' }}>4</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Mom',        msg: 'Proud of you. Thinking of you.',  time: '8:30 AM',   dot: true  },
                    { name: 'Jasmine Lee',msg: "Can't wait to see the deck!",      time: '7:45 AM',   dot: true  },
                    { name: 'Marcus',     msg: 'Coffee this week?',                time: 'Yesterday', dot: false },
                    { name: 'LUNA',       msg: 'Your evening reflection is ready.',time: 'Yesterday', dot: false },
                  ].map(m => (
                    <div key={m.name} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: m.name === 'LUNA' ? 'linear-gradient(135deg,#8B6FB8,#6A4F9B)' : 'rgba(139,111,184,0.2)', color: 'white' }}>
                        {m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{m.name}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{m.time}</p>
                            {m.dot && <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#8B6FB8' }} />}
                          </div>
                        </div>
                        <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{m.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/messages">
                  <button className="w-full mt-3 text-xs text-center py-2 rounded-xl transition-all"
                    style={{ color: 'rgba(139,111,184,0.9)', background: 'rgba(139,111,184,0.08)' }}>
                    View all messages
                  </button>
                </Link>
              </DCard>

              {/* Next Event */}
              <DCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" style={{ color: '#8B6FB8' }} strokeWidth={2} />
                    <span className="text-sm font-semibold text-white">Next Event</span>
                  </div>
                  <MoreHorizontal className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
                </div>
                {/* Event card */}
                <div className="rounded-2xl p-4 mb-3"
                  style={{ background: 'rgba(139,111,184,0.12)', border: '1px solid rgba(139,111,184,0.2)' }}>
                  <p className="text-sm font-bold mb-1" style={{ color: '#A98FD8' }}>11:00 AM</p>
                  <p className="text-xl font-bold text-white mb-3">DRYP Weekly Sync</p>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Clock className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>45 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Google Meet</span>
                  </div>
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Up next</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>1:00 PM</p>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>Client Call</p>
                  <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>📹 Zoom</span>
                </div>
              </DCard>

              {/* Spirit Guidance */}
              <DCard style={{
                background: 'linear-gradient(135deg, rgba(30,20,60,0.9) 0%, rgba(50,30,80,0.9) 100%)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Lotus glow */}
                <div className="absolute top-4 right-4 w-24 h-24 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(180,140,240,0.3) 0%, transparent 70%)', filter: 'blur(8px)' }} />
                <div className="absolute top-6 right-6 text-5xl opacity-60">🪷</div>

                <div className="flex items-center gap-2 mb-auto">
                  <Sparkles className="h-4 w-4" style={{ color: '#C4A9E8' }} strokeWidth={2} />
                  <span className="text-sm font-semibold text-white">Spirit Guidance</span>
                </div>

                <div className="mt-16">
                  <p className="text-lg font-display font-semibold leading-snug mb-4 text-white">{spiritMsg}</p>
                  <Link href="/spirit">
                    <button className="text-xs px-4 py-2 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Tap for guidance
                    </button>
                  </Link>
                </div>
              </DCard>
            </div>

            {/* ── ROW 2: Work Brief + Moon + Energy + Sleep ── */}
            <div className="grid grid-cols-4 gap-4">

              {/* Work Brief */}
              <DCard>
                <div className="flex items-center gap-2 mb-4">
                  <BriefcaseIcon className="h-4 w-4" style={{ color: '#8B6FB8' }} strokeWidth={2} />
                  <span className="text-sm font-semibold text-white">Work Brief</span>
                </div>
                <DLabel>Top Focus</DLabel>
                <p className="text-2xl font-bold text-white mb-1">Q2 Launch</p>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#5A9E5A' }} />
                  <span className="text-xs" style={{ color: '#5A9E5A' }}>On track</span>
                </div>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>2 tasks due today</p>
                <div className="flex items-center justify-between">
                  <Link href="/work">
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: 'rgba(139,111,184,0.15)', color: '#C4A9E8', border: '1px solid rgba(139,111,184,0.2)' }}>
                      Review <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                  <Ring pct={72} size={56} stroke={5} color="#8B6FB8" label="72%" />
                </div>
              </DCard>

              {/* Energy / Moon */}
              <DCard style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Moon image placeholder */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(220,215,240,0.9) 20%, rgba(160,150,200,0.5) 55%, rgba(80,70,130,0.2) 80%, transparent 100%)',
                    boxShadow: '0 0 30px 8px rgba(180,160,240,0.2)',
                  }} />
                <div className="absolute top-2 right-2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>72%</div>

                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-4 w-4" style={{ color: '#8B6FB8' }} strokeWidth={2} />
                  <span className="text-sm font-semibold text-white">Energy / Moon</span>
                </div>
                <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{moon.name}</p>
                <p className="text-xl font-bold text-white mb-2">{moon.keyword}</p>
                <p className="text-xs leading-relaxed pr-24" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {affirmation.split('.')[0]}.
                </p>
              </DCard>

              {/* Energy stat */}
              <DCard>
                <DLabel>Energy</DLabel>
                <p className="text-5xl font-bold text-white mb-1">78%</p>
                <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Steady</p>
                <Sparkline values={[60, 65, 70, 62, 75, 78, 74, 80]} color="#8B6FB8" />
              </DCard>

              {/* Sleep / Movement / Mindfulness */}
              <DCard>
                <DLabel>Wellness</DLabel>
                <div className="space-y-4">
                  {[
                    { icon: Moon, label: 'Sleep',        value: '7h 32m', color: '#8B6FB8' },
                    { icon: Zap,  label: 'Movement',     value: '45m',    color: '#C9A96E' },
                    { icon: Heart,label: 'Mindfulness',  value: '12m',    color: '#B8C9B4' },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${color}20` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={1.8} />
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{value}</span>
                    </div>
                  ))}
                </div>
                <Link href="/profile">
                  <button className="w-full mt-4 text-xs py-2 rounded-xl transition-all"
                    style={{ color: 'rgba(139,111,184,0.8)', background: 'rgba(139,111,184,0.08)' }}>
                    View full breakdown
                  </button>
                </Link>
              </DCard>
            </div>

          </div>
        </AppLayout>
      </div>
    </>
  )
}
