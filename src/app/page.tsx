'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import {
  Calendar, ChevronRight, Sparkles, Star, Scissors, DollarSign, Moon, Target,
  BookOpen, Brain, RotateCcw, MessageSquare, Briefcase, Heart, Gem, Feather,
  Clock, BarChart2, CreditCard, Users, Mail, CheckSquare, Zap, Sunset,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GuidanceData {
  horoscope?: string
  energy?: string
  affirmation?: string
  shadow_question?: string
  moon_note?: string
  crystal?: string
  energy_today?: string
}
interface HomeTask     { id: string; title: string; urgency_level?: string }
interface HomeCalEvent { id: string; title: string; startTime: string; allDay: boolean }

// ─── Moon phase (fast approximation) ─────────────────────────────────────────
const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', energy: 'Seed something new'        },
  { name: 'Waxing Crescent', emoji: '🌒', energy: 'Take the first step'       },
  { name: 'First Quarter',   emoji: '🌓', energy: 'Push through resistance'   },
  { name: 'Waxing Gibbous',  emoji: '🌔', energy: 'Fine-tune your vision'     },
  { name: 'Full Moon',       emoji: '🌕', energy: 'Let go and illuminate'     },
  { name: 'Waning Gibbous',  emoji: '🌖', energy: 'Receive and be grateful'   },
  { name: 'Last Quarter',    emoji: '🌗', energy: 'Clear what no longer fits' },
  { name: 'Waning Crescent', emoji: '🌘', energy: 'Restore and reflect'       },
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
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

function Shimmer({ h = 12, w = '100%' }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
}

// ─── PAGE 1: TODAY (with daily horoscope) ────────────────────────────────────
function PageToday({ greeting, moon, guidance, gLoading, topTasks, calEvents, dataLoaded }: {
  greeting: string; moon: typeof MOON_PHASES[0]
  guidance: GuidanceData | null; gLoading: boolean
  topTasks: HomeTask[]; calEvents: HomeCalEvent[]; dataLoaded: boolean
}) {
  const nextEvent = calEvents[0] ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Greeting hero */}
      <div style={{ ...GLASS, padding: '20px 20px 18px', background: 'linear-gradient(135deg, rgba(139,111,184,0.15), rgba(90,63,136,0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg, #8B6FB8, #5A3F88)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(139,111,184,0.4)', flexShrink: 0 }}>
            <Moon className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{greeting}, Zoe ✦</p>
            <p style={{ fontSize: 12, color: 'rgba(196,169,232,0.75)' }}>{moon.emoji} {moon.name} · {moon.energy}</p>
          </div>
        </div>
        {gLoading
          ? <><Shimmer h={13} w="92%" /><div style={{ height: 5 }} /><Shimmer h={13} w="75%" /></>
          : <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', lineHeight: 1.65 }}>
              {guidance?.affirmation ?? 'I move with grace. I do not chase the day — I guide it.'}
            </p>
        }
      </div>

      {/* Daily Horoscope */}
      <Link href="/astrology" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '16px 18px', background: 'rgba(60,40,100,0.12)', border: '1px solid rgba(139,111,184,0.22)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Star className="h-4 w-4" style={{ color: '#C4A9E8' }} strokeWidth={1.6} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.7)' }}>Daily Horoscope</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 18 }}>{moon.emoji}</span>
              <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
            </div>
          </div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Shimmer h={13} /><Shimmer h={13} w="90%" /><Shimmer h={13} w="70%" />
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.80)', lineHeight: 1.65 }}>
                {guidance?.horoscope
                  ? guidance.horoscope.slice(0, 220) + (guidance.horoscope.length > 220 ? '…' : '')
                  : guidance?.energy_today ?? 'Tap to open your full daily reading in Astrology.'}
              </p>
              {guidance?.crystal && (
                <p style={{ fontSize: 11, color: 'rgba(168,196,218,0.65)', marginTop: 8 }}>✦ Crystal: {guidance.crystal}</p>
              )}
            </>
          )}
        </div>
      </Link>

      {/* LUNA Now */}
      <Link href="/luna" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '14px 18px', background: 'rgba(106,79,155,0.12)', border: '1px solid rgba(139,111,184,0.18)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Sparkles className="h-4 w-4" style={{ color: '#C4A9E8' }} strokeWidth={1.6} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.7)' }}>Talk to LUNA</span>
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
          {!gLoading && guidance?.energy && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginTop: 8 }}>
              {guidance.energy.slice(0, 120)}{guidance.energy.length > 120 ? '…' : ''}
            </p>
          )}
        </div>
      </Link>

      {/* Top 3 Tasks */}
      <Link href="/work" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '16px 18px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Target className="h-4 w-4" style={{ color: '#C9A96E' }} strokeWidth={1.6} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.7)' }}>Today's Top 3</span>
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
          {!dataLoaded
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1, 2, 3].map(i => <Shimmer key={i} h={11} />)}</div>
            : topTasks.length === 0
              ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No open tasks — add some in Work</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {topTasks.slice(0, 3).map((t, i) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid rgba(139,111,184,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(196,169,232,0.6)' }}>{i + 1}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.3, flex: 1 }}>{t.title}</p>
                    </div>
                  ))}
                </div>
          }
        </div>
      </Link>

      {/* Next Event */}
      <Link href="/work" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '14px 18px', background: 'rgba(90,138,168,0.07)', border: '1px solid rgba(168,196,218,0.15)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar className="h-4 w-4" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(168,196,218,0.6)' }}>Next Event</span>
                {!dataLoaded
                  ? <div style={{ marginTop: 3 }}><Shimmer h={11} w={140} /></div>
                  : nextEvent
                    ? <p style={{ fontSize: 14, fontWeight: 600, color: 'white', marginTop: 2 }}>{nextEvent.title} <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.45)' }}>· {nextEvent.startTime}</span></p>
                    : <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', marginTop: 2 }}>No more events today</p>
                }
              </div>
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
      </Link>
    </div>
  )
}

// ─── PAGE 2: APPS (all shortcuts) ────────────────────────────────────────────
const APP_SECTIONS = [
  {
    label: 'LUNA', color: '#C4A9E8',
    apps: [
      { icon: Sparkles,    label: 'Chat',         href: '/luna',              color: '#C4A9E8' },
      { icon: Feather,     label: 'Journal',       href: '/luna?tab=journal',  color: '#C4A9E8' },
      { icon: BookOpen,    label: 'Highest Self',  href: '/luna?tab=self',     color: '#A890D0' },
      { icon: MessageSquare, label: 'Messages',   href: '/luna?tab=messages', color: '#9880C0' },
    ],
  },
  {
    label: 'WORK', color: '#A8C4DA',
    apps: [
      { icon: Zap,         label: 'Command',       href: '/work',             color: '#A8C4DA' },
      { icon: Calendar,    label: 'Calendar',      href: '/work?tab=calendar',color: '#8AAEC8' },
      { icon: Mail,        label: 'Email',         href: '/work?tab=email',   color: '#7A9EB8' },
      { icon: CheckSquare, label: 'Tasks',         href: '/work?tab=tasks',   color: '#6A8EA8' },
      { icon: Users,       label: 'Clients',       href: '/work?tab=clients', color: '#5A7E98' },
      { icon: DollarSign,  label: 'Money',         href: '/work?tab=money',   color: '#C9A96E' },
    ],
  },
  {
    label: 'ASTROLOGY', color: '#B090D8',
    apps: [
      { icon: Star,        label: 'Cosmic',        href: '/astrology',           color: '#C4A9E8' },
      { icon: Moon,        label: 'Moon',          href: '/astrology?tab=moon',  color: '#B090D0' },
      { icon: Zap,         label: 'Transits',      href: '/astrology?tab=transits', color: '#A080C0' },
      { icon: BarChart2,   label: 'Forecasts',     href: '/astrology?tab=forecasts', color: '#9070B0' },
      { icon: Heart,       label: 'Love',          href: '/astrology?tab=love',  color: '#D090A8' },
      { icon: Gem,         label: 'Crystals',      href: '/astrology?tab=crystals', color: '#80A0D0' },
    ],
  },
  {
    label: 'CREATIVE', color: '#C9A96E',
    apps: [
      { icon: Scissors,    label: 'Style',         href: '/creative',              color: '#C9A96E' },
      { icon: Sunset,      label: 'Inspiration',   href: '/creative?tab=inspiration', color: '#B8906E' },
      { icon: Gem,         label: 'Wishlist',      href: '/creative?tab=wishlist', color: '#A87868' },
    ],
  },
  {
    label: 'MONEY', color: '#8AB88A',
    apps: [
      { icon: CreditCard,  label: 'Transactions',  href: '/money/transactions',   color: '#8AB88A' },
      { icon: BarChart2,   label: 'Subscriptions', href: '/money/subscriptions',  color: '#7AA87A' },
      { icon: Briefcase,   label: 'Business',      href: '/money/business-expenses', color: '#6A986A' },
      { icon: Clock,       label: 'Bills',         href: '/money/bills',          color: '#C9A96E' },
    ],
  },
]

function PageApps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {APP_SECTIONS.map(section => (
        <div key={section.label}>
          <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: section.color + '90', marginBottom: 10, paddingLeft: 2 }}>
            {section.label}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {section.apps.map(app => {
              const Icon = app.icon
              return (
                <Link key={app.href} href={app.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '14px 6px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 16,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: `${app.color}20`,
                      border: `1px solid ${app.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon style={{ width: 18, height: 18, color: app.color }} strokeWidth={1.6} />
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.2 }}>
                      {app.label}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── PAGE 3: ENERGY ──────────────────────────────────────────────────────────
const MOODS = [
  { emoji: '🌙', label: 'Calm'      }, { emoji: '🔥', label: 'Driven'    },
  { emoji: '🌸', label: 'Soft'      }, { emoji: '⚡', label: 'Bold'      },
  { emoji: '🌿', label: 'Grounded'  }, { emoji: '✨', label: 'Flowing'   },
  { emoji: '🫧', label: 'Scattered' }, { emoji: '💗', label: 'Open'      },
]
const BODY_NEEDS = ['Rest', 'Water', 'Movement', 'Sunlight', 'Food', 'Quiet', 'Connection', 'Focus']

function PageEnergy() {
  const [mood,   setMood]   = useState<string | null>(null)
  const [body,   setBody]   = useState<string | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [mode,   setMode]   = useState<'normal' | 'recovery' | 'rush'>('normal')

  const MODES = [
    { id: 'normal'   as const, label: '✦ Normal',   bg: 'rgba(139,111,184,0.12)', border: 'rgba(139,111,184,0.3)', color: '#C4A9E8' },
    { id: 'recovery' as const, label: '🌿 Recovery', bg: 'rgba(90,138,90,0.12)',   border: 'rgba(90,138,90,0.3)',   color: '#8AB88A' },
    { id: 'rush'     as const, label: '⚡ Rush',      bg: 'rgba(201,120,60,0.12)',  border: 'rgba(201,120,60,0.3)',  color: '#C9A96E' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...GLASS, padding: '14px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Today's Mode</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: '8px 4px', borderRadius: 12, border: `1px solid ${mode === m.id ? m.border : 'rgba(255,255,255,0.08)'}`, background: mode === m.id ? m.bg : 'transparent', color: mode === m.id ? m.color : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'recovery' && <p style={{ fontSize: 12, color: 'rgba(138,184,138,0.7)', marginTop: 8, lineHeight: 1.5 }}>Rest first. Protect your energy. Do only what truly matters.</p>}
        {mode === 'rush'     && <p style={{ fontSize: 12, color: 'rgba(201,169,110,0.7)', marginTop: 8, lineHeight: 1.5 }}>High output mode. Triage ruthlessly. Block distractions. Move fast.</p>}
      </div>

      <div style={{ ...GLASS, padding: '14px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Energy Level</p>
        <div style={{ display: 'flex', gap: 5 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', background: energy !== null && n <= energy ? `rgba(139,111,184,${0.18 + (n / 10) * 0.6})` : 'rgba(255,255,255,0.06)', color: energy !== null && n <= energy ? 'white' : 'rgba(255,255,255,0.28)', transition: 'all 0.15s' }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, padding: '14px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Mood</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {MOODS.map(m => (
            <button key={m.label} onClick={() => setMood(m.label)} style={{ padding: '10px 4px', borderRadius: 12, border: `1px solid ${mood === m.label ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.08)'}`, background: mood === m.label ? 'rgba(139,111,184,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20 }}>{m.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: mood === m.label ? '#C4A9E8' : 'rgba(255,255,255,0.4)' }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, padding: '14px 18px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>Body Needs</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BODY_NEEDS.map(n => (
            <button key={n} onClick={() => setBody(body === n ? null : n)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${body === n ? 'rgba(168,196,218,0.4)' : 'rgba(255,255,255,0.09)'}`, background: body === n ? 'rgba(168,196,218,0.12)' : 'transparent', color: body === n ? '#A8C4DA' : 'rgba(255,255,255,0.4)' }}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE 4: WEEKLY ───────────────────────────────────────────────────────────
function PageWeekly({ guidance, gLoading }: { guidance: GuidanceData | null; gLoading: boolean }) {
  const [parked, setParked] = useState(['Review DRYP client proposals', 'Plan content calendar', 'Sewing project: crystal bikini set'])
  const [newItem, setNewItem] = useState('')
  const goals = ['Scale DRYP to $15k/mo', 'Graduate USF on time', 'Launch crystal swimwear drop', 'Build a morning routine that holds']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...GLASS, padding: '16px 18px', background: 'rgba(60,40,100,0.10)', border: '1px solid rgba(139,111,184,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <BookOpen className="h-4 w-4" style={{ color: '#C4A9E8' }} strokeWidth={1.6} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.65)' }}>Weekly Lesson</span>
        </div>
        {gLoading
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Shimmer h={12} /><Shimmer h={12} w="80%" /></div>
          : <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, fontStyle: 'italic' }}>{guidance?.shadow_question ?? 'What pattern keeps showing up this week — and what is it trying to teach you?'}</p>
        }
      </div>

      <div style={{ ...GLASS, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Target className="h-4 w-4" style={{ color: '#C9A96E' }} strokeWidth={1.6} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.65)' }}>Big Goals</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8B6FB8', flexShrink: 0 }} />
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.3 }}>{g}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...GLASS, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <Brain className="h-4 w-4" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(168,196,218,0.65)' }}>Parked Ideas</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {parked.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 12, color: 'rgba(168,196,218,0.5)' }}>◦</span>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4, flex: 1 }}>{item}</p>
              <button onClick={() => setParked(p => p.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 6px' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && newItem.trim() && (setParked(p => [...p, newItem.trim()]), setNewItem(''))} placeholder="Park an idea…" style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 13, outline: 'none' }} />
          <button onClick={() => newItem.trim() && (setParked(p => [...p, newItem.trim()]), setNewItem(''))} style={{ padding: '8px 14px', borderRadius: 12, border: 'none', background: 'rgba(139,111,184,0.2)', color: '#C4A9E8', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+</button>
        </div>
      </div>

      <Link href="/luna" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.35)' }} strokeWidth={1.6} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Weekly Reset with LUNA</span>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.2)' }} />
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
    // Try daily-guidance for horoscope first, fall back to spiritual-guidance
    fetch('/api/astrology/daily-guidance', { method: 'GET' })
      .then(r => r.json())
      .then(d => setGuidance(d))
      .catch(() =>
        fetch('/api/ai/spiritual-guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
          .then(r => r.json()).then(d => setGuidance(d)).catch(() => {})
      )
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
    {
      id: 'apps', label: 'Apps',
      content: <PageApps />,
    },
    {
      id: 'energy', label: 'Energy',
      content: <PageEnergy />,
    },
    {
      id: 'weekly', label: 'Weekly',
      content: <PageWeekly guidance={guidance} gLoading={gLoading} />,
    },
  ]

  return (
    <AppLayout>
      <CategoryPager pages={homePages} />
    </AppLayout>
  )
}
