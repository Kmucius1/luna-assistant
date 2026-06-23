'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Bell, Moon, Home, BriefcaseIcon, MessageCircle,
  Star, Scissors, Archive, Sun, Sparkles, Calendar, Mail,
  CheckSquare, Mic, Brain, Zap, BookHeart,
  RotateCcw, Target, PenLine, Compass, ChevronRight,
} from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import { LunaSearchOverlay } from '@/components/ui/LunaSearch'

// ─── Moon data ────────────────────────────────────────────────────────────────
const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', energy: 'Seed something new',         keyword: 'Intentions'  },
  { name: 'Waxing Crescent', emoji: '🌒', energy: 'Take the first step',        keyword: 'Growth'      },
  { name: 'First Quarter',   emoji: '🌓', energy: 'Push through resistance',    keyword: 'Action'      },
  { name: 'Waxing Gibbous',  emoji: '🌔', energy: 'Fine-tune your vision',      keyword: 'Refine'      },
  { name: 'Full Moon',       emoji: '🌕', energy: 'Let go and illuminate',      keyword: 'Release'     },
  { name: 'Waning Gibbous',  emoji: '🌖', energy: 'Receive what came through',  keyword: 'Gratitude'   },
  { name: 'Last Quarter',    emoji: '🌗', energy: 'Clear what no longer fits',  keyword: 'Let go'      },
  { name: 'Waning Crescent', emoji: '🌘', energy: 'Restore and reflect',        keyword: 'Rest'        },
]
type Moon = typeof MOON_PHASES[0]

function getMoonPhase(): Moon {
  const known = new Date('2024-01-11').getTime()
  const days  = (Date.now() - known) / 86_400_000
  return MOON_PHASES[Math.floor(((days % 29.53) / 29.53) * 8)] ?? MOON_PHASES[0]
}

function getGreeting(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Shared types ─────────────────────────────────────────────────────────────
interface GuidanceData {
  energy_today?: string; crystal?: string; crystal_why?: string;
  moon_note?: string; chart_theme?: string; shadow_question?: string;
  gratitude_prompt?: string; affirmation?: string; intention?: string;
  quote?: string; highlights?: string[]; human_design_reminder?: string;
}
interface HomeTask { id: string; title: string; urgency_level?: string; priority_score?: number }
interface HomeCalEvent { id: string; title: string; startTime: string; calendar: string; allDay: boolean }
interface HomeEmail { connected: boolean; unread: number | null; needsReply: number | null; starred: number | null }

// ─── Quotes ───────────────────────────────────────────────────────────────────
const QUOTES = [
  { quote: '"Discipline is choosing between what you want now and what you want most."', author: '– Ray Dalio',     astro: 'First Quarter energy: one brave step, strategically timed. Mars in Libra — move with intention, not reaction.' },
  { quote: '"Move in silence. Only speak when it is time to say checkmate."',            author: '– Elite Focus',  astro: 'Scorpio Sun activates your power. Let results announce you. Cancer Moon protects the process.' },
  { quote: '"Your most valuable asset is not your skill — it is the clarity to know what to move toward."', author: '– LUNA', astro: 'Self-Projected Projector: wait for recognition, then give your full expertise. Nothing wasted.' },
]

// ─── Shared design token ──────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 18,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  overflow: 'hidden',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Card({ children, style, href }: { children: React.ReactNode; style?: React.CSSProperties; href?: string }) {
  const el = <div style={{ ...CARD, ...style }}>{children}</div>
  if (href) return <Link href={href} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', flex: 1 }}>{el}</Link>
  return el
}

function WL({ icon, text, action, onAction }: { icon: React.ReactNode; text: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>{text}</span>
      </div>
      {action && <button onClick={onAction} style={{ fontSize: 13, color: 'rgba(139,111,184,0.8)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{action}</button>}
    </div>
  )
}

function Shimmer({ h = 12, w = '100%' }: { h?: number; w?: string | number }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.07)' }} />
}

function MoonOrb({ size = 48 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: [
        'radial-gradient(circle at 58% 22%, rgba(155,150,172,0.95) 0%, transparent 13%)',
        'radial-gradient(ellipse at 38% 35%, rgba(252,250,255,1) 0%, rgba(228,224,240,1) 15%, rgba(196,192,212,1) 32%, rgba(162,158,180,1) 52%, rgba(124,120,145,1) 70%, rgba(88,84,108,1) 88%)',
      ].join(', '),
      boxShadow: `inset ${size*0.13}px ${size*0.07}px ${size*0.22}px rgba(0,0,0,0.32), 0 0 ${size*0.35}px ${size*0.12}px rgba(180,160,240,0.3)`,
    }} />
  )
}

// ─── TOP BAR ──────────────────────────────────────────────────────────────────
function TopBar({ timeStr, dateStr, moon, onSearch }: { timeStr: string; dateStr: string; moon: Moon; onSearch: () => void }) {
  const lastSpace = timeStr.lastIndexOf(' ')
  const timePart  = lastSpace > 0 ? timeStr.slice(0, lastSpace) : timeStr
  const ampm      = lastSpace > 0 ? timeStr.slice(lastSpace + 1) : ''
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 62, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
      background: 'rgba(8,4,26,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 100 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #8B6FB8, #5A3F88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Moon className="h-3 w-3 text-white" strokeWidth={2} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '0.22em', color: 'white' }}>LUNA</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>{timePart}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.52)' }}>{ampm}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{dateStr}</span>
          <span style={{ width: 1, height: 7, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>{moon.emoji} {moon.name}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 100, justifyContent: 'flex-end' }}>
        {[
          { icon: <Search className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.62)' }} />, onClick: onSearch },
          { icon: <Bell   className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.62)' }} />, onClick: undefined },
        ].map((btn, i) => (
          <button key={i} onClick={btn.onClick} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {btn.icon}
          </button>
        ))}
        <Link href="/profile" style={{ display: 'flex' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', border: '2px solid rgba(139,111,184,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>Z</span>
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─── DOCK ─────────────────────────────────────────────────────────────────────
function Dock({ activePage, onPageChange }: { activePage: number; onPageChange: (p: number) => void }) {
  const router = useRouter()
  const ITEMS = [
    { label: 'Home',      icon: <Home          className="h-5 w-5 text-white" strokeWidth={1.8} />, page: 0 },
    { label: 'Morning',   icon: <Sun           className="h-5 w-5 text-white" strokeWidth={1.8} />, href: '/morning'  },
    { label: 'Work',      icon: <BriefcaseIcon className="h-5 w-5 text-white" strokeWidth={1.8} />, page: 2 },
    { label: 'Messages',  icon: <MessageCircle className="h-5 w-5 text-white" strokeWidth={1.8} />, href: '/messages' },
    { label: 'Astrology', icon: <Star          className="h-5 w-5 text-white" strokeWidth={1.8} />, page: 3 },
    { label: 'Atelier',   icon: <Scissors      className="h-5 w-5 text-white" strokeWidth={1.8} />, href: '/atelier'  },
    { label: 'Vault',     icon: <Archive       className="h-5 w-5 text-white" strokeWidth={1.8} />, href: '/vault'    },
    { label: 'Night',     icon: <Moon          className="h-5 w-5 text-white" strokeWidth={1.8} />, href: '/night'    },
  ] as const

  return (
    <div style={{
      position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 30,
      background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 30, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '7px 12px', gap: 0,
      boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
      width: 'calc(100% - 28px)',
    }}>
      {ITEMS.map((item) => {
        const active = 'page' in item && item.page === activePage
        return (
          <button key={item.label}
            onClick={() => 'page' in item ? onPageChange(item.page) : router.push((item as { href: string }).href)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '4px 8px', borderRadius: 18, border: 'none', cursor: 'pointer',
              background: active ? 'rgba(139,111,184,0.25)' : 'transparent',
              boxShadow: active ? '0 0 18px rgba(139,111,184,0.28)' : 'none',
              transition: 'all 0.25s ease', minWidth: 48,
            }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: active ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${active ? 'rgba(196,169,232,0.4)' : 'rgba(255,255,255,0.09)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: active ? '0 0 20px rgba(139,111,184,0.5)' : 'none',
              transition: 'all 0.25s ease',
            }}>
              {item.icon}
            </div>
            <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'rgba(196,169,232,0.95)' : 'rgba(255,255,255,0.48)', lineHeight: 1 }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Page wrapper — no scroll ─────────────────────────────────────────────────
const PAGE: React.CSSProperties = {
  width: '100%', height: '100%', overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
  padding: '10px 14px 8px', boxSizing: 'border-box', gap: 8,
}

// ─── PAGE 1: Sanctuary (Home) ─────────────────────────────────────────────────
function Page1Sanctuary({ hour, moon, guidance, gLoading }: {
  hour: number; moon: Moon; guidance: GuidanceData | null; gLoading: boolean
}) {
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={PAGE}>
      {/* Hero */}
      <div style={{ ...CARD, padding: '14px 18px', flexShrink: 0, position: 'relative',
        background: `
          radial-gradient(circle at 82% 38%, rgba(255,252,240,0.85) 0%, rgba(220,205,185,0.45) 2.5%, rgba(175,135,255,0.15) 9%, transparent 22%),
          radial-gradient(ellipse 55% 18% at 82% 60%, rgba(110,75,200,0.35) 0%, transparent 70%),
          linear-gradient(180deg, #0c0430 0%, #180848 20%, #0f0535 45%, #07031e 75%, #040215 100%)
        `,
      }}>
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
          <MoonOrb size={60} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '72%' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 3 }}>{dateStr}</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, color: 'white', marginBottom: 3 }}>
            {getGreeting(hour)}, Zoe ✦
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(196,169,232,0.8)' }}>{moon.emoji} {moon.name} · {moon.energy}</p>
        </div>
      </div>

      {/* Plan My Day */}
      <Link href="/plan-my-day" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ ...CARD, padding: '12px 16px', background: 'rgba(139,111,184,0.09)', border: '1px solid rgba(139,111,184,0.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 15 }}>🗓</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.55)' }}>Plan My Day</span>
            </div>
            <ChevronRight className="h-3 w-3" style={{ color: 'rgba(196,169,232,0.4)' }} />
          </div>
          <div style={{ display: 'flex' }}>
            {[
              { emoji: '☀️', time: '7:30', label: 'Wake'  },
              { emoji: '💻', time: '10:00', label: 'Work'  },
              { emoji: '🍽️', time: '12:30', label: 'Lunch' },
              { emoji: '🏁', time: '6:00',  label: 'Done'  },
            ].map((a, i, arr) => (
              <div key={a.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i < arr.length - 1 && (
                  <div style={{ position: 'absolute', right: 0, top: '28%', width: '50%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
                )}
                <span style={{ fontSize: 14, marginBottom: 3 }}>{a.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{a.time}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{a.label}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '7px 12px', borderRadius: 10, background: 'rgba(139,111,184,0.18)', border: '1px solid rgba(139,111,184,0.28)', textAlign: 'center', color: 'rgba(196,169,232,0.9)', fontSize: 13, fontWeight: 600 }}>
            Build full schedule →
          </div>
        </div>
      </Link>

      {/* Energy + Crystal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ ...CARD, padding: 14, background: 'rgba(90,63,136,0.1)', border: '1px solid rgba(139,111,184,0.18)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(196,169,232,0.5)' }}>Energy</span>
          </div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Shimmer h={10} /><Shimmer h={10} w="85%" /><Shimmer h={10} w="70%" /></div>
          ) : (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
              {guidance?.energy_today ?? 'Scorpio depth meets Cancer nurture. A day for focused inner work.'}
            </p>
          )}
        </div>
        <div style={{ ...CARD, padding: 14, background: 'rgba(90,120,164,0.08)', border: '1px solid rgba(90,138,164,0.2)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>💎</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(120,180,210,0.55)' }}>Crystal</span>
          </div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Shimmer h={12} w="65%" /><Shimmer h={9} /><Shimmer h={9} w="80%" /></div>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 4 }}>{guidance?.crystal ?? 'Black Tourmaline'}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{guidance?.crystal_why ?? 'Protection and grounding for your Scorpio energy today.'}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE 2: Soul (Daily Guidance) ───────────────────────────────────────────
function Page2Soul({ moon, guidance, gLoading, topTask, quoteSlide, setQuoteSlide }: {
  moon: Moon; guidance: GuidanceData | null; gLoading: boolean;
  topTask: HomeTask | null; quoteSlide: number; setQuoteSlide: (i: number) => void
}) {
  const q = QUOTES[quoteSlide]

  return (
    <div style={PAGE}>
      {/* Horoscope */}
      <Link href="/astrology/daily" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ ...CARD, padding: '12px 16px', background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.18)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 14 }}>🔭</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.6)' }}>Daily Horoscope</span>
            </div>
            <ChevronRight className="h-3 w-3" style={{ color: 'rgba(201,169,110,0.35)' }} />
          </div>
          {gLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><Shimmer h={11} /><Shimmer h={11} w="90%" /></div>
          ) : (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
              {guidance?.moon_note ?? `${moon.emoji} ${moon.name} energy supports reflection and intentional action today.`}
              {guidance?.chart_theme && <span style={{ color: 'rgba(201,169,110,0.65)', fontStyle: 'italic' }}> {guidance.chart_theme}</span>}
            </p>
          )}
        </div>
      </Link>

      {/* Quote + Astrology 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {/* Quote */}
        <div style={{ ...CARD, padding: '14px 16px', position: 'relative', overflow: 'hidden',
          background: `
            radial-gradient(circle at 78% 36%, rgba(255,252,240,0.92) 0%, rgba(228,215,190,0.5) 2.5%, rgba(185,145,255,0.18) 9%, transparent 20%),
            radial-gradient(ellipse 50% 18% at 78% 60%, rgba(115,82,200,0.4) 0%, transparent 70%),
            linear-gradient(180deg, #0c0432 0%, #180948 20%, #0f0630 45%, #060220 72%, #030118 100%)
          `,
        }}>
          <WL icon={<Zap className="h-3 w-3" style={{ color: 'rgba(201,169,110,0.7)' }} />} text="Billionaire Mindset" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'white', lineHeight: 1.5, marginBottom: 4, maxWidth: '78%' }}>{q.quote}</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginBottom: 6 }}>{q.author}</p>
          <p style={{ fontSize: 12, color: 'rgba(196,169,232,0.6)', lineHeight: 1.5 }}>{q.astro}</p>
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {QUOTES.map((_, i) => (
              <button key={i} onClick={() => setQuoteSlide(i)} style={{ width: i === quoteSlide ? 14 : 4, height: 4, borderRadius: 2, background: i === quoteSlide ? 'rgba(196,169,232,0.85)' : 'rgba(255,255,255,0.22)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s ease' }} />
            ))}
          </div>
        </div>

        {/* Astrology Focus */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<Star className="h-3 w-3" style={{ color: 'rgba(184,159,216,0.65)' }} />} text="Astrology Focus" />
          {[
            { planet: 'Moon in Cancer', desc: 'Emotional clarity',       emoji: '🌙', c: '#5A8AA4' },
            { planet: 'Mars in Libra',  desc: 'Strategic action',         emoji: '🔴', c: '#C96B5A' },
            { planet: 'Scorpio Sun',    desc: 'Depth. Power.',            emoji: '☀️', c: '#8B6FB8' },
          ].map(it => (
            <div key={it.planet} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: `${it.c}22`, border: `1px solid ${it.c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>{it.emoji}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.3 }}>{it.planet}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 1 }}>{it.desc}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Top Task + Journal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
        <Link href="/work" style={{ textDecoration: 'none' }}>
          <div style={{ ...CARD, padding: 14, background: 'rgba(90,138,90,0.08)', border: '1px solid rgba(138,184,138,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(138,184,138,0.55)' }}>Top Task</span>
            </div>
            {topTask ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.4, marginBottom: 5 }}>{topTask.title}</p>
                {topTask.urgency_level && (
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(138,184,138,0.15)', color: '#8AB88A' }}>{topTask.urgency_level}</span>
                )}
              </>
            ) : (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                {gLoading ? <Shimmer h={11} /> : 'No open tasks'}
              </p>
            )}
          </div>
        </Link>
        <Link href="/journal" style={{ textDecoration: 'none' }}>
          <div style={{ ...CARD, padding: 14, background: 'rgba(160,130,90,0.08)', border: '1px solid rgba(201,169,110,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>📓</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.55)' }}>Journal</span>
            </div>
            {gLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><Shimmer h={10} /><Shimmer h={10} w="88%" /></div>
            ) : (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.55, fontStyle: 'italic' }}>
                {guidance?.shadow_question ?? guidance?.gratitude_prompt ?? 'What are you carrying that doesn\'t belong to today?'}
              </p>
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}

// ─── PAGE 3: Work ─────────────────────────────────────────────────────────────
function Page3Work({ calEvents, topTasks, emailStats, dataLoaded, onEmailRefresh }: {
  calEvents: HomeCalEvent[]; topTasks: HomeTask[];
  emailStats: HomeEmail; dataLoaded: boolean; onEmailRefresh: () => void
}) {
  const URGENCY_COLOR: Record<string, string> = { critical: '#E05E5E', high: '#D98878', medium: '#C9A96E', low: '#8AB88A' }
  const CAL_DOTS = ['#8B6FB8', '#5A8AA4', '#6A8A5A', '#C9A96E', '#C96B5A']

  return (
    <div style={PAGE}>
      {/* Row 1: Schedule + Priorities + Email */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {/* Schedule */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<Calendar className="h-3 w-3" style={{ color: 'rgba(168,196,218,0.7)' }} />} text="Today's Schedule" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10, flex: 1 }}>
            {!dataLoaded && [1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
            {dataLoaded && calEvents.length === 0 && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', lineHeight: 1.5 }}>No events today — connect Google Calendar in Settings</p>
            )}
            {dataLoaded && calEvents.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: CAL_DOTS[i % CAL_DOTS.length], flexShrink: 0, marginTop: 3 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{ev.startTime}</span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/calendar"><div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>View Full Calendar →</div></Link>
        </Card>

        {/* Priorities */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<Target className="h-3 w-3" style={{ color: 'rgba(201,169,110,0.7)' }} />} text="Top Priorities" action="+ Add" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
            {!dataLoaded && [1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
            {dataLoaded && topTasks.length === 0 && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No open tasks — add some in Tasks</p>
            )}
            {dataLoaded && topTasks.slice(0, 4).map(t => {
              const urg   = (t.urgency_level ?? 'medium').toLowerCase()
              const color = URGENCY_COLOR[urg] ?? '#C9A96E'
              return (
                <div key={t.id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.22)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: `${color}22`, color, flexShrink: 0 }}>{urg}</span>
                </div>
              )
            })}
          </div>
          <Link href="/tasks"><div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>View All Tasks →</div></Link>
        </Card>

        {/* Email */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<Mail className="h-3 w-3" style={{ color: 'rgba(168,196,218,0.7)' }} />} text="Email Overview" action="Sync" onAction={onEmailRefresh} />
          {!emailStats.connected && dataLoaded ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: 10 }}>Connect Gmail in Settings to see your inbox here</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 10 }}>
              {[
                { label: 'Needs Reply', count: emailStats.needsReply, c: '#C96B5A' },
                { label: 'Starred',     count: emailStats.starred,    c: '#C9A96E' },
                { label: 'Unread',      count: emailStats.unread,     c: 'rgba(255,255,255,0.4)' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{r.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: r.c }}>{!dataLoaded ? '—' : r.count === null ? '—' : r.count}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/email"><div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>Open Inbox →</div></Link>
        </Card>
      </div>

      {/* Row 2: DRYPHub + CommCoach + QuickActions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {/* DRYP Hub */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<div style={{ width: 16, height: 16, borderRadius: 4, background: 'linear-gradient(135deg, #8B6FB8, #5A3F88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>D</div>} text="DRYP Hub" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[{ v: '15', l: 'Active Projects' }, { v: '32', l: 'Open Tasks' }, { v: '6', l: 'Due Today' }, { v: '4', l: 'Due This Week' }].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1 }}>{s.v}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{s.l}</p>
              </div>
            ))}
          </div>
          <Link href="/work"><div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>Open DRYPHub →</div></Link>
        </Card>

        {/* Communication Coach */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<MessageCircle className="h-3 w-3" style={{ color: 'rgba(139,111,184,0.65)' }} />} text="Communication Coach" />
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55, marginBottom: 10, fontStyle: 'italic' }}>
            &ldquo;You&apos;re in a good place to lead today. Listen more, respond less, and speak only what moves the needle.&rdquo;
          </p>
          <Link href="/messages"><div style={{ padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center' }}>Open Messages →</div></Link>
        </Card>

        {/* Quick Actions */}
        <Card style={{ padding: 14, overflow: 'hidden' }}>
          <WL icon={<Zap className="h-3 w-3" style={{ color: 'rgba(201,169,110,0.65)' }} />} text="Quick Actions" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { l: 'New Email',   icon: <Mail           className="h-3.5 w-3.5" />, href: '/email'       },
              { l: 'New Task',    icon: <CheckSquare    className="h-3.5 w-3.5" />, href: '/tasks'       },
              { l: 'Voice Note',  icon: <Mic            className="h-3.5 w-3.5" />, href: '/dictation'   },
              { l: 'Client Note', icon: <PenLine        className="h-3.5 w-3.5" />, href: '/journal'     },
              { l: 'Brain Dump',  icon: <Brain          className="h-3.5 w-3.5" />, href: '/brain-dump'  },
              { l: 'Plan Day',    icon: <Sun            className="h-3.5 w-3.5" />, href: '/plan-my-day' },
            ].map(a => (
              <Link key={a.l} href={a.href}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ color: 'rgba(184,159,216,0.7)' }}>{a.icon}</div>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{a.l}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── PAGE 4: Astrology ────────────────────────────────────────────────────────
function Page4Astrology({ moon }: { moon: Moon }) {
  return (
    <div style={PAGE}>
      {/* Hero */}
      <div style={{ ...CARD, padding: '14px 18px', flexShrink: 0, position: 'relative',
        background: `
          radial-gradient(circle at 82% 30%, rgba(255,252,240,0.88) 0%, rgba(220,208,188,0.5) 2.5%, rgba(170,130,255,0.2) 10%, transparent 22%),
          radial-gradient(ellipse 60% 20% at 82% 56%, rgba(95,65,200,0.35) 0%, transparent 70%),
          linear-gradient(180deg, #0a0335 0%, #140840 18%, #0c0525 42%, #060218 75%, #020110 100%)
        `,
      }}>
        <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
          <MoonOrb size={60} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '75%' }}>
          <WL icon={<span style={{ fontSize: 14 }}>✦</span>} text="Today's Cosmic Weather" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'white', marginBottom: 3 }}>{moon.emoji} {moon.name}</p>
          <p style={{ fontSize: 13, color: 'rgba(196,169,232,0.82)' }}>{moon.energy}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {[
          { href: '/astrology/moon',        emoji: '🌕', label: 'Moon Portal',   sub: `${moon.name} · ${moon.keyword}` },
          { href: '/astrology/transits',    emoji: '🪐', label: 'Daily Transits', sub: 'Current sky · your chart' },
          { href: '/astrology/birth-chart', emoji: '🗺', label: 'Birth Chart',   sub: 'Your natal blueprint' },
        ].map(c => (
          <Card key={c.href} href={c.href} style={{ padding: 14, overflow: 'hidden' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.emoji}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{c.sub}</p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {[
          { href: '/astrology/crystals', emoji: '💎', label: 'Crystals',      sub: 'Guidance for your energy' },
          { href: '/astrology/rituals',  emoji: '🕯',  label: 'Daily Ritual',  sub: 'Aligned practice today'  },
          { href: '/journal',            emoji: '📓', label: 'Journal Prompt', sub: 'Write, reflect, release'  },
        ].map(c => (
          <Card key={c.href} href={c.href} style={{ padding: 14, overflow: 'hidden' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.emoji}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{c.sub}</p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flexShrink: 0 }}>
        {[
          { href: '/spirit',               emoji: '🔮', label: 'Spirit'      },
          { href: '/love',                  emoji: '💜', label: 'Love Energy' },
          { href: '/astrology/retrogrades', emoji: '↩️', label: 'Retrogrades' },
          { href: '/astrology/daily',       emoji: '📖', label: 'Deep Read'   },
        ].map(c => (
          <Card key={c.href} href={c.href} style={{ padding: 12, textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{c.emoji}</div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{c.label}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── PAGE 5: Growth ───────────────────────────────────────────────────────────
function Page5Growth() {
  return (
    <div style={PAGE}>
      <div style={{ ...CARD, padding: '14px 18px', flexShrink: 0, background: 'linear-gradient(155deg, #18103a 0%, #281560 40%, #14082e 100%)' }}>
        <WL icon={<span style={{ fontSize: 14 }}>✦</span>} text="Highest Self Mirror" />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 4 }}>What would the highest version of you do today?</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55, marginBottom: 10 }}>She moves with intention. She speaks only when it serves. She rests without guilt and leads without force.</p>
        <Link href="/highest-self">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, background: 'rgba(139,111,184,0.25)', border: '1px solid rgba(139,111,184,0.35)', color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
            Open Mirror <ChevronRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {[
          { href: '/growth',  icon: <Zap      className="h-5 w-5" style={{ color: 'rgba(184,201,180,0.7)' }} />, label: 'Growth',        sub: 'Analytics · patterns'  },
          { href: '/lessons', icon: <BookHeart className="h-5 w-5" style={{ color: 'rgba(232,192,194,0.7)' }} />, label: 'Lessons',       sub: 'Track your wisdom'     },
          { href: '/career',  icon: <Compass  className="h-5 w-5" style={{ color: 'rgba(184,201,180,0.7)' }} />, label: 'Career Compass', sub: 'Recognition · Virgo MC'},
        ].map(c => (
          <Card key={c.href} href={c.href} style={{ padding: 14, overflow: 'hidden' }}>
            <div style={{ marginBottom: 7 }}>{c.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{c.sub}</p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {[
          { href: '/memory', icon: <BookHeart className="h-5 w-5" style={{ color: 'rgba(184,159,216,0.7)' }} />, label: 'Memory',       sub: 'Day coaching · reflections' },
          { href: '/midday', emoji: '☀️',                                                                         label: 'Midday Reset', sub: 'Pause and recalibrate'     },
          { href: '/weekly', icon: <RotateCcw className="h-5 w-5" style={{ color: 'rgba(184,159,216,0.7)' }} />, label: 'Weekly Reset', sub: 'Zoom out · refocus'       },
        ].map((c, i) => (
          <Card key={i} href={c.href} style={{ padding: 14, overflow: 'hidden' }}>
            <div style={{ marginBottom: 7 }}>{'emoji' in c ? <span style={{ fontSize: 20 }}>{c.emoji}</span> : c.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{c.sub}</p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, flexShrink: 0 }}>
        {[
          { href: '/brain-dump',    emoji: '🧠', label: 'Brain Dump'   },
          { href: '/journal',       emoji: '📓', label: 'Journal'      },
          { href: '/plan-my-day',   emoji: '🗓', label: 'Plan Day'     },
          { href: '/relationships', emoji: '💜', label: 'Relationships' },
        ].map(c => (
          <Card key={c.href} href={c.href} style={{ padding: 12, textAlign: 'center', overflow: 'hidden' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{c.emoji}</div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{c.label}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── PAGE 6: Creation ─────────────────────────────────────────────────────────
function Page6Creation() {
  return (
    <div style={PAGE}>
      <div style={{ ...CARD, padding: '14px 18px', flexShrink: 0, background: 'linear-gradient(135deg, #28082a 0%, #38103e 35%, #180826 75%, #100618 100%)' }}>
        <WL icon={<Scissors className="h-3 w-3" style={{ color: 'rgba(232,192,194,0.65)' }} />} text="Today's Style" />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 4 }}>✂ Atelier Mode Active</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55, marginBottom: 10 }}>Cancer Moon calls for softness in fabric and form. Flowing lines, plush textures, colors that feel like safety.</p>
        <Link href="/atelier">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, background: 'rgba(200,140,160,0.2)', border: '1px solid rgba(200,140,160,0.3)', color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
            Open Atelier <ChevronRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {[
          { href: '/atelier', icon: <Scissors className="h-5 w-5" style={{ color: 'rgba(232,192,194,0.7)' }} />, label: 'Atelier Studio',    sub: 'Projects · Style Oracle'   },
          { href: '/atelier', emoji: '🎨',                                                                        label: 'Inspiration Board', sub: 'Visual mood · references'  },
          { href: '/atelier', emoji: '🧵',                                                                        label: 'Sewing Studio',     sub: 'Patterns · machine setup'  },
        ].map((c, i) => (
          <Card key={i} href={c.href} style={{ padding: 14, overflow: 'hidden' }}>
            <div style={{ marginBottom: 7 }}>{'emoji' in c ? <span style={{ fontSize: 20 }}>{c.emoji}</span> : c.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{c.sub}</p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, flex: 1, minHeight: 0 }}>
        {[
          { href: '/atelier',    emoji: '✨', label: 'Generated Looks',  sub: 'AI fashion line & outfit vision' },
          { href: '/vault',      icon: <Archive className="h-5 w-5" style={{ color: 'rgba(201,169,110,0.7)' }} />, label: 'Vault',         sub: 'Park ideas & save them'     },
          { href: '/brain-dump', icon: <Brain   className="h-5 w-5" style={{ color: 'rgba(139,111,184,0.7)' }} />, label: 'Creative Dump', sub: 'Clear the creative noise'   },
          { href: '/dictation',  icon: <Mic     className="h-5 w-5" style={{ color: 'rgba(139,111,184,0.7)' }} />, label: 'Dictation',     sub: 'Voice ideas instantly'      },
        ].map((c, i) => (
          <Card key={i} href={c.href} style={{ padding: 14, overflow: 'hidden' }}>
            <div style={{ marginBottom: 7 }}>{'emoji' in c ? <span style={{ fontSize: 20 }}>{c.emoji}</span> : c.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{c.label}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)' }}>{c.sub}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SanctuaryPage() {
  const [mounted,     setMounted]     = useState(false)
  const [activePage,  setActivePage]  = useState(0)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [quoteSlide,  setQuoteSlide]  = useState(0)
  const [isDesktop,   setIsDesktop]   = useState(false)

  // Shared state — lifted from page components
  const [guidance,    setGuidance]    = useState<GuidanceData | null>(null)
  const [gLoading,    setGLoading]    = useState(true)
  const [calEvents,   setCalEvents]   = useState<HomeCalEvent[]>([])
  const [topTasks,    setTopTasks]    = useState<HomeTask[]>([])
  const [emailStats,  setEmailStats]  = useState<HomeEmail>({ connected: false, unread: null, needsReply: null, starred: null })
  const [dataLoaded,  setDataLoaded]  = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const location  = useLocation()

  useEffect(() => {
    setMounted(true)
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)

    // Quote auto-rotate
    const id = setInterval(() => setQuoteSlide(i => (i + 1) % QUOTES.length), 6000)

    // Guidance — cached by day
    const today    = new Date().toISOString().slice(0, 10)
    const cacheKey = 'luna_daily_guidance_' + today
    const cached   = (() => { try { return localStorage.getItem(cacheKey) } catch { return null } })()
    if (cached) {
      try { setGuidance(JSON.parse(cached)) } catch {}
      setGLoading(false)
    } else {
      fetch('/api/ai/spiritual-guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then(r => r.json())
        .then(g => {
          setGuidance(g)
          try { localStorage.setItem(cacheKey, JSON.stringify(g)) } catch {}
        })
        .catch(() => {})
        .finally(() => setGLoading(false))
    }

    // Home summary
    fetch('/api/home/summary')
      .then(r => r.json())
      .then(d => {
        setCalEvents((d.calendar?.today ?? []).slice(0, 4))
        setTopTasks(d.tasks?.top ?? [])
        setEmailStats(d.email ?? { connected: false, unread: null, needsReply: null, starred: null })
        setDataLoaded(true)
      })
      .catch(() => setDataLoaded(true))

    return () => {
      clearInterval(id)
      window.removeEventListener('resize', checkDesktop)
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const w    = scrollRef.current.clientWidth || window.innerWidth
    const page = Math.round(scrollRef.current.scrollLeft / w)
    setActivePage(page)
  }, [])

  function goToPage(page: number) {
    const w = scrollRef.current?.clientWidth ?? window.innerWidth
    scrollRef.current?.scrollTo({ left: page * w, behavior: 'smooth' })
    setActivePage(page)
  }

  function refreshEmail() {
    fetch('/api/home/summary').then(r => r.json()).then(d => setEmailStats(d.email ?? emailStats))
  }

  if (!mounted) return null

  const moon    = getMoonPhase()
  const hour    = location.localHour
  const timeStr = location.localTime
  const dateStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())
  const topTask = topTasks[0] ?? null

  return (
    <div style={{
      position: 'fixed',
      top:    isDesktop ? 56  : 0,
      bottom: isDesktop ? 80  : 0,
      left:   isDesktop ? 0   : '50%',
      right:  isDesktop ? 0   : undefined,
      transform: isDesktop ? 'none' : 'translateX(-50%)',
      width: '100%',
      maxWidth: isDesktop ? '100%' : 860,
      overflow: 'hidden',
      background: 'linear-gradient(180deg, #1A1240 0%, #100C30 35%, #0A0820 65%, #060418 100%)',
    }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: isDesktop ? 600 : 300, height: isDesktop ? 600 : 300, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(139,111,184,0.13) 0%, transparent 70%)', filter: 'blur(45px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 100, left: -40, width: 240, height: 240, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(70,40,160,0.09) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }} />

      {/* Top bar — mobile only, desktop uses DesktopHeader */}
      {!isDesktop && <TopBar timeStr={timeStr} dateStr={dateStr} moon={moon} onSearch={() => setSearchOpen(true)} />}

      {/* Pages */}
      <div style={{
        position: 'absolute',
        top:    isDesktop ? 0  : 62,
        left:   0, right: 0,
        bottom: isDesktop ? 16 : 112,
        zIndex: 1,
      }}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            display: 'flex', width: '100%', height: '100%',
            overflowX: 'auto', overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none',
          }}>
          {[
            <Page1Sanctuary key="p1" hour={hour} moon={moon} guidance={guidance} gLoading={gLoading} />,
            <Page2Soul      key="p2" moon={moon} guidance={guidance} gLoading={gLoading} topTask={topTask} quoteSlide={quoteSlide} setQuoteSlide={setQuoteSlide} />,
            <Page3Work      key="p3" calEvents={calEvents} topTasks={topTasks} emailStats={emailStats} dataLoaded={dataLoaded} onEmailRefresh={refreshEmail} />,
            <Page4Astrology key="p4" moon={moon} />,
            <Page5Growth    key="p5" />,
            <Page6Creation  key="p6" />,
          ].map((page, i) => (
            <div key={i} style={{ flex: 'none', width: '100%', height: '100%', scrollSnapAlign: 'start', overflow: 'hidden' }}>
              {page}
            </div>
          ))}
        </div>
      </div>

      {/* Page dots */}
      <div style={{ position: 'absolute', bottom: isDesktop ? 4 : 102, left: 0, right: 0, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, zIndex: 2 }}>
        {[0,1,2,3,4,5].map(i => (
          <button key={i} onClick={() => goToPage(i)} style={{
            width: activePage === i ? 18 : 5, height: 5, borderRadius: 3, padding: 0, border: 'none', cursor: 'pointer',
            background: activePage === i ? 'rgba(196,169,232,0.9)' : 'rgba(255,255,255,0.22)',
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Dock — mobile only, desktop uses DesktopTabBar */}
      {!isDesktop && <Dock activePage={activePage} onPageChange={goToPage} />}

      {searchOpen && <LunaSearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
