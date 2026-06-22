'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GrowthAnalytics } from '@/components/ui/GrowthAnalytics'
import { useLocation } from '@/hooks/useLocation'
import { format } from 'date-fns'
import {
  Sparkles, Moon, BriefcaseIcon, Mic, MessageCircle,
  Scissors, Compass, Archive, DollarSign, ArrowRight,
  Heart, Zap, Droplets, Star
} from 'lucide-react'
import Link from 'next/link'

// ─── Moon phase ─────────────────────────────────────────────
const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑', keyword: 'Intentions', energy: 'Seed something new' },
  { name: 'Waxing Crescent', emoji: '🌒', keyword: 'Growth',     energy: 'Take the first step' },
  { name: 'First Quarter',   emoji: '🌓', keyword: 'Action',     energy: 'Push through resistance' },
  { name: 'Waxing Gibbous',  emoji: '🌔', keyword: 'Refine',     energy: 'Fine-tune your vision' },
  { name: 'Full Moon',       emoji: '🌕', keyword: 'Release',    energy: 'Let go and illuminate' },
  { name: 'Waning Gibbous',  emoji: '🌖', keyword: 'Gratitude',  energy: 'Receive what came through' },
  { name: 'Last Quarter',    emoji: '🌗', keyword: 'Let go',     energy: 'Clear what no longer fits' },
  { name: 'Waning Crescent', emoji: '🌘', keyword: 'Rest',       energy: 'Restore and reflect' },
]

function getMoonPhase() {
  const known = new Date('2024-01-11').getTime()
  const days = (Date.now() - known) / (1000 * 60 * 60 * 24)
  return MOON_PHASES[Math.floor(((days % 29.53) / 29.53) * 8)] ?? MOON_PHASES[0]
}

function getTimeGreeting(h: number) {
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getLunaNow(h: number, moon: typeof MOON_PHASES[0]) {
  if (h < 9) return {
    headline: 'Body first. Voice second. Work third.',
    body: 'Your Cancer Moon needs water, stillness, and a soft landing before the day asks anything of you. Drink something warm. Check in.',
    steps: ['🌊 Drink water', '🌙 Check your emotional weather', '🎙 Speak one intention aloud'],
    cta: 'Begin Morning Wake',
    href: '/morning',
  }
  if (h < 12) return {
    headline: 'Speak it first. Decide second.',
    body: `${moon.energy}. Your Self-Projected authority gives you clarity through your own voice — not through thinking harder.`,
    steps: ['🎙 Dictate what’s on your mind', '✦ Let one priority surface', '🛑 Park the rest safely'],
    cta: 'Open Dictation',
    href: '/dictation',
  }
  if (h < 15) return {
    headline: 'One lane. Full energy.',
    body: 'Your Gemini Rising wants to open every tab. Your Virgo Midheaven needs one clear system. Choose the work that moves a real needle.',
    steps: ['📋 Check your Work Brief', '🧭 Pick one lane to build today', '📵 Close the extra tabs'],
    cta: 'Open Work',
    href: '/work',
  }
  if (h < 18) return {
    headline: 'Recognition over chasing.',
    body: 'Projector energy peaks in focused bursts, not long grinds. If you\'re forcing something, pause. The right doors open when you\'re aligned.',
    steps: ['🪷 Check in on your energy', '💬 Review any messages with intention', '✨ One creative or spiritual thread'],
    cta: 'Check Astrology',
    href: '/astrology',
  }
  return {
    headline: 'Your morning starts tonight.',
    body: 'Tomorrow-you is asking for rest. Stop work at a clean boundary. Wind down. Let your nervous system decompress.',
    steps: ['🌙 Begin night protection', '📵 Set phone down earlier than feels right', '🛁 One ritual for your body'],
    cta: 'Night Protection',
    href: '/night',
  }
}

// ─── Moon sphere ─────────────────────────────────────────────
function MoonSphere({ size = 128, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: [
        'radial-gradient(circle at 58% 22%, rgba(155,150,172,0.95) 0%, rgba(135,130,155,0.5) 8%, transparent 13%)',
        'radial-gradient(circle at 26% 64%, rgba(140,135,162,0.85) 0%, transparent 10%)',
        'radial-gradient(circle at 73% 60%, rgba(150,145,168,0.75) 0%, transparent 9%)',
        'radial-gradient(circle at 44% 78%, rgba(125,120,148,0.9) 0%, transparent 13%)',
        'radial-gradient(ellipse at 38% 35%, rgba(252,250,255,1) 0%, rgba(228,224,240,1) 15%, rgba(196,192,212,1) 32%, rgba(162,158,180,1) 52%, rgba(124,120,145,1) 70%, rgba(88,84,108,1) 88%)',
      ].join(', '),
      boxShadow: [
        `inset ${size * 0.13}px ${size * 0.07}px ${size * 0.22}px rgba(0,0,0,0.32)`,
        glow ? `0 0 ${size * 0.3}px ${size * 0.1}px rgba(180,160,240,0.28)` : '',
      ].filter(Boolean).join(', '),
    }} />
  )
}

// ─── Soul State chip ─────────────────────────────────────────
function SoulChip({ label, value, color, emoji }: {
  label: string; value: string; color: string; emoji: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl flex-shrink-0"
      style={{ background: `${color}12`, border: `1px solid ${color}25`, minWidth: 72 }}>
      <span style={{ fontSize: 18 }}>{emoji}</span>
      <p style={{ fontSize: '0.65rem', color: `${color}cc`, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{value}</p>
    </div>
  )
}

// ─── App tile ────────────────────────────────────────────────
function Tile({
  href, icon, label, sub, color, gradient, badge, wide = false
}: {
  href: string; icon: React.ReactNode; label: string; sub: string
  color: string; gradient?: string; badge?: string | number; wide?: boolean
}) {
  return (
    <Link href={href} className={wide ? 'col-span-2' : 'col-span-1'}>
      <div className="relative rounded-[22px] p-5 h-full min-h-[130px] flex flex-col justify-between transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer overflow-hidden group"
        style={{ background: gradient ?? 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        {gradient && (
          <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-30"
            style={{ background: `radial-gradient(circle at 100% 0%, ${color}60 0%, transparent 60%)` }} />
        )}
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
            {icon}
          </div>
          <p className="font-bold text-base leading-tight" style={{ color: gradient ? 'white' : 'var(--text-1)' }}>{label}</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: gradient ? 'rgba(255,255,255,0.6)' : 'var(--text-3)' }}>{sub}</p>
        </div>
        {badge !== undefined && (
          <div className="absolute top-3 right-3 min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center font-bold text-white"
            style={{ background: color, fontSize: 10 }}>{badge}</div>
        )}
        <ArrowRight className="h-4 w-4 mt-3 transition-transform group-hover:translate-x-1"
          style={{ color: gradient ? 'rgba(255,255,255,0.5)' : `${color}99` }} />
      </div>
    </Link>
  )
}

export default function SanctuaryPage() {
  const [mounted, setMounted] = useState(false)
  const location = useLocation()
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const hour     = location.localHour   // always client's real local hour
  const today    = location.localDate ? location.localDate.split(',').slice(0,2).join(',') : format(new Date(), 'EEEE, MMMM d')
  const greeting = getTimeGreeting(hour)
  const moon     = getMoonPhase()
  const lunaNow  = getLunaNow(hour, moon)

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          MOBILE — State-first sanctuary
      ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-app">
        <div className="fixed -top-32 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(184,159,216,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <AppLayout noPad>
          <div className="px-4 pt-12 pb-nav space-y-4">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-4)' }}>{today}</p>
                <h1 className="font-display text-[1.9rem] font-bold leading-tight mt-0.5" style={{ color: 'var(--text-1)' }}>
                  {greeting}, Zoe
                </h1>
                <p className="text-sm mt-1 font-display italic" style={{ color: 'var(--violet)' }}>
                  You are not behind. You are returning.
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span style={{ fontSize: 28 }}>{moon.emoji}</span>
                <Link href="/profile">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))', border: '2px solid rgba(255,255,255,0.3)' }}>
                    <span className="text-white text-sm font-bold">Z</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Soul State row */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-4)' }}>Soul State</p>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <SoulChip label="Mood" value="Check in" color="#8B6FB8" emoji="🫀" />
                <SoulChip label="Energy" value="Check in" color="#C9A96E" emoji="⚡" />
                <SoulChip label="Sleep" value="Check in" color="#6A4F9B" emoji="🌙" />
                <SoulChip label="Body" value="Check in" color="#B8C9B4" emoji="🌿" />
                <SoulChip label="Moon" value={moon.keyword} color="#A8C4DA" emoji={moon.emoji} />
                <Link href="/morning">
                  <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl flex-shrink-0"
                    style={{ background: 'rgba(139,111,184,0.15)', border: '1px solid rgba(139,111,184,0.3)', minWidth: 72 }}>
                    <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                    <p style={{ fontSize: '0.65rem', color: 'var(--violet)', fontWeight: 700, letterSpacing: '0.08em' }}>WAKE</p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--violet)' }}>Open</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* LUNA Now */}
            <div className="relative rounded-[24px] p-5 overflow-hidden"
              style={{
                background: 'linear-gradient(155deg, #16133A 0%, #221B50 50%, #16133A 100%)',
                border: '1px solid rgba(139,111,184,0.28)',
              }}>
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 100% 0%, rgba(139,111,184,0.2) 0%, transparent 60%)', filter: 'blur(16px)' }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(139,111,184,0.25)', border: '1px solid rgba(139,111,184,0.4)' }}>
                    <Sparkles className="h-3.5 w-3.5" style={{ color: '#C4A9E8' }} />
                  </div>
                  <p className="font-bold text-sm text-white">LUNA Now</p>
                </div>
                <p className="font-display text-lg font-bold text-white leading-snug mb-2">
                  {lunaNow.headline}
                </p>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.58)' }}>
                  {lunaNow.body}
                </p>
                <div className="space-y-1.5 mb-4">
                  {lunaNow.steps.map(s => (
                    <div key={s} className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>{s}</p>
                    </div>
                  ))}
                </div>
                <Link href={lunaNow.href}>
                  <div className="py-2.5 rounded-2xl text-center font-semibold text-sm transition-all hover:opacity-90"
                    style={{ background: 'rgba(139,111,184,0.3)', border: '1px solid rgba(139,111,184,0.4)', color: 'rgba(255,255,255,0.92)' }}>
                    {lunaNow.cta} ✦
                  </div>
                </Link>
              </div>
            </div>

            {/* Cosmic State */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/astrology">
                <div className="relative rounded-[20px] p-4 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, rgba(28,18,56,0.97) 0%, rgba(40,26,72,0.97) 100%)', border: '1px solid rgba(180,140,240,0.2)' }}>
                  <div className="absolute right-2 top-2 opacity-40">
                    <MoonSphere size={40} glow={false} />
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(196,169,232,0.7)' }}>Astrology</p>
                  <p className="font-bold text-white text-base leading-tight">{moon.emoji} {moon.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{moon.energy}</p>
                  <p className="text-xs font-semibold mt-3" style={{ color: 'rgba(196,169,232,0.8)' }}>Tap to explore →</p>
                </div>
              </Link>
              <Link href="/morning">
                <div className="rounded-[20px] p-4"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <span style={{ fontSize: 22 }}>☀️</span>
                  <p className="font-bold text-base mt-2 mb-0.5" style={{ color: 'var(--text-1)' }}>Morning</p>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Begin your soul check-in</p>
                  <p className="text-xs font-semibold mt-3" style={{ color: 'var(--violet)' }}>Open →</p>
                </div>
              </Link>
            </div>

            {/* Main app tiles */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/work',    icon: <BriefcaseIcon className="h-5 w-5" style={{ color: '#8B6FB8' }} strokeWidth={1.6} />, label: 'Work', sub: 'DRYPHub · email · clients', color: '#8B6FB8' },
                { href: '/messages', icon: <MessageCircle className="h-5 w-5" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />, label: 'Messages', sub: 'Communication coach', color: '#A8C4DA', badge: 4 },
                { href: '/atelier', icon: <Scissors className="h-5 w-5" style={{ color: '#E8C0C2' }} strokeWidth={1.6} />, label: 'Atelier', sub: 'Style Oracle · outfit', color: '#E8C0C2' },
                { href: '/career',  icon: <Compass className="h-5 w-5" style={{ color: '#B8C9B4' }} strokeWidth={1.6} />, label: 'Career', sub: 'Compass · recognition', color: '#B8C9B4' },
                { href: '/vault',   icon: <Archive className="h-5 w-5" style={{ color: '#C9A96E' }} strokeWidth={1.6} />, label: 'Vault', sub: 'Ideas are safe here', color: '#C9A96E' },
                { href: '/money',   icon: <DollarSign className="h-5 w-5" style={{ color: '#B8C9B4' }} strokeWidth={1.6} />, label: 'Money', sub: 'Slow wealth · stability', color: '#B8C9B4' },
              ].map(t => (
                <Link key={t.href} href={t.href}>
                  <div className="relative rounded-[20px] p-4 transition-all hover:scale-[1.015]"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${t.color}14`, border: `1px solid ${t.color}22` }}>
                      {t.icon}
                    </div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{t.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{t.sub}</p>
                    {'badge' in t && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ background: t.color, fontSize: 9 }}>{t.badge}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Night strip */}
            <Link href="/night">
              <div className="rounded-[20px] px-5 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, rgba(20,14,40,0.95) 0%, rgba(30,20,58,0.95) 100%)', border: '1px solid rgba(139,111,184,0.2)' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 22 }}>🌙</span>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--violet)' }}>Night Protection</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Your morning starts tonight</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4" style={{ color: 'var(--violet)' }} />
              </div>
            </Link>

            {/* Growth compact widget */}
            <Link href="/growth">
              <GrowthAnalytics compact />
            </Link>
          </div>
        </AppLayout>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP — Apple OS / CarPlay style, state-first
      ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen bg-app">
        {/* Ambient orbs */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle at 75% 15%, rgba(139,111,184,0.1) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle at 20% 85%, rgba(90,120,180,0.07) 0%, transparent 65%)', filter: 'blur(70px)' }} />

        <AppLayout noPad>
          <div className="pt-20 pb-[130px] max-w-[1400px] mx-auto px-8">

            {/* ── HERO — dark emotional center ── */}
            <div className="relative rounded-[32px] overflow-hidden mb-5"
              style={{
                background: 'linear-gradient(135deg, #16133A 0%, #1F1848 45%, #16133A 100%)',
                border: '1px solid rgba(139,111,184,0.22)',
                minHeight: 200,
              }}>
              <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                <MoonSphere size={170} glow />
              </div>
              {[[12,40,3],[68,55,2],[22,62,2],[48,68,3],[35,44,1.5],[58,30,2]].map(([t,r,s],i) => (
                <div key={i} className="absolute rounded-full"
                  style={{ top:`${t}%`, right:`${r}%`, width:s, height:s, background:'rgba(255,255,255,0.7)' }} />
              ))}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-56 h-56 pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,111,184,0.16) 0%, transparent 70%)', filter: 'blur(24px)' }} />
              <div className="relative z-10 px-12 py-10 pr-72">
                <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>{today}</p>
                <h1 className="font-display text-4xl font-bold mb-2 leading-tight" style={{ color: 'white' }}>
                  {greeting}, Zoe ✦
                </h1>
                <p className="text-base mb-2 max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                  {moon.emoji} {moon.name} · {moon.energy}
                </p>
                <p className="text-sm font-display italic mb-6" style={{ color: 'rgba(196,169,232,0.75)' }}>
                  You are not behind. You are returning.
                </p>
                {/* Soul State inline */}
                <div className="flex items-center gap-2">
                  {[
                    { emoji: '🫀', label: 'Mood',   value: '—', color: '#8B6FB8' },
                    { emoji: '⚡', label: 'Energy', value: '—', color: '#C9A96E' },
                    { emoji: '🌙', label: 'Sleep',  value: '—', color: '#6A4F9B' },
                    { emoji: '🌿', label: 'Body',   value: '—', color: '#B8C9B4' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ fontSize: 13 }}>{s.emoji}</span>
                      <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                      <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{s.value}</span>
                    </div>
                  ))}
                  <Link href="/morning">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full font-semibold text-xs transition-all hover:scale-105"
                      style={{ background: 'rgba(139,111,184,0.3)', border: '1px solid rgba(139,111,184,0.45)', color: 'white' }}>
                      <Sparkles className="h-3.5 w-3.5" /> Check In
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* ── MAIN GRID ── */}
            <div className="grid grid-cols-12 gap-4 mb-4">

              {/* LUNA Now — col 5, tall */}
              <div className="col-span-5">
                <div className="relative rounded-[26px] p-7 h-full min-h-[320px] overflow-hidden flex flex-col"
                  style={{
                    background: 'linear-gradient(160deg, rgba(22,18,54,0.97) 0%, rgba(32,24,68,0.97) 100%)',
                    border: '1px solid rgba(139,111,184,0.28)',
                  }}>
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 90% 10%, rgba(139,111,184,0.18) 0%, transparent 55%)' }} />
                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(139,111,184,0.22)', border: '1px solid rgba(139,111,184,0.35)' }}>
                        <Sparkles className="h-4.5 w-4.5" style={{ color: '#C4A9E8' }} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-white font-bold">LUNA Now</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>Your next aligned move</p>
                      </div>
                    </div>
                    <p className="font-display text-2xl font-bold text-white leading-snug mb-3">
                      {lunaNow.headline}
                    </p>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.58)' }}>
                      {lunaNow.body}
                    </p>
                    <div className="space-y-2 mb-6 flex-1">
                      {lunaNow.steps.map(s => (
                        <div key={s} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>{s}</p>
                        </div>
                      ))}
                    </div>
                    <Link href={lunaNow.href}>
                      <div className="w-full py-3 rounded-2xl text-center font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.01]"
                        style={{ background: 'rgba(139,111,184,0.28)', border: '1px solid rgba(139,111,184,0.4)', color: 'rgba(255,255,255,0.92)' }}>
                        {lunaNow.cta} ✦
                      </div>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right 4 tiles — 2x2 grid in col 7 */}
              <div className="col-span-7 grid grid-cols-2 gap-4">

                {/* Morning Wake */}
                <Link href="/morning" className="group">
                  <div className="relative rounded-[24px] p-6 h-full min-h-[148px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-25"
                      style={{ background: 'radial-gradient(circle at 100% 0%, rgba(201,169,110,0.5) 0%, transparent 60%)' }} />
                    <div>
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'rgba(201,169,110,0.14)', border: '1px solid rgba(201,169,110,0.22)' }}>
                        <span style={{ fontSize: 20 }}>☀️</span>
                      </div>
                      <p className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>Morning Wake</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Soul check-in before the day asks</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: '#C9A96E' }}>Begin ritual</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" style={{ color: '#C9A96E' }} />
                    </div>
                  </div>
                </Link>

                {/* Astrology */}
                <Link href="/astrology" className="group">
                  <div className="relative rounded-[24px] p-6 h-full min-h-[148px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, rgba(26,18,52,0.97) 0%, rgba(38,26,68,0.97) 100%)', border: '1px solid rgba(180,140,240,0.22)' }}>
                    <div className="absolute right-3 top-3 pointer-events-none opacity-50">
                      <MoonSphere size={44} glow={false} />
                    </div>
                    <div>
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'rgba(180,140,240,0.18)', border: '1px solid rgba(180,140,240,0.25)' }}>
                        <Star className="h-5 w-5" style={{ color: '#C4A9E8' }} strokeWidth={1.6} />
                      </div>
                      <p className="font-bold text-lg text-white">Astrology</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{moon.emoji} {moon.name} · Transits · Chart</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'rgba(196,169,232,0.8)' }}>Explore →</p>
                  </div>
                </Link>

                {/* Work Brief */}
                <Link href="/work" className="group">
                  <div className="relative rounded-[24px] p-6 h-full min-h-[148px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none opacity-15"
                      style={{ background: 'radial-gradient(circle at 100% 0%, rgba(139,111,184,0.7) 0%, transparent 60%)' }} />
                    <div>
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'rgba(139,111,184,0.12)', border: '1px solid rgba(139,111,184,0.2)' }}>
                        <BriefcaseIcon className="h-5 w-5" style={{ color: 'var(--violet)' }} strokeWidth={1.6} />
                      </div>
                      <p className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>Work</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>DRYPHub · clients · email</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--violet)' }}>Open Brief →</p>
                  </div>
                </Link>

                {/* Messages */}
                <Link href="/messages" className="group">
                  <div className="relative rounded-[24px] p-6 h-full min-h-[148px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center font-bold text-white"
                      style={{ background: '#8B6FB8', fontSize: 10 }}>4</div>
                    <div>
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                        style={{ background: 'rgba(168,196,218,0.12)', border: '1px solid rgba(168,196,218,0.2)' }}>
                        <MessageCircle className="h-5 w-5" style={{ color: 'var(--lunar)' }} strokeWidth={1.6} />
                      </div>
                      <p className="font-bold text-lg" style={{ color: 'var(--text-1)' }}>Messages</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Communication Coach ready</p>
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--lunar)' }}>Coach me →</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* ── ROW 2: 4 equal tiles ── */}
            <div className="grid grid-cols-4 gap-4">

              <Link href="/atelier" className="group">
                <div className="relative rounded-[24px] p-6 min-h-[140px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none opacity-20"
                    style={{ background: 'radial-gradient(circle at 100% 0%, rgba(232,192,194,0.6) 0%, transparent 60%)' }} />
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: 'rgba(232,192,194,0.14)', border: '1px solid rgba(232,192,194,0.22)' }}>
                      <Scissors className="h-5 w-5" style={{ color: 'var(--blush)' }} strokeWidth={1.6} />
                    </div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Atelier</p>
                    <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--text-3)' }}>Style Oracle · LUNA Street Fairy</p>
                    <div className="px-2 py-1 rounded-lg inline-block"
                      style={{ background: 'rgba(139,111,184,0.1)', border: '1px solid rgba(139,111,184,0.15)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--violet)' }}>✨ Style me</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold mt-2" style={{ color: 'var(--blush)' }}>Open →</p>
                </div>
              </Link>

              <Link href="/career" className="group">
                <div className="relative rounded-[24px] p-6 min-h-[140px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: 'rgba(184,201,180,0.14)', border: '1px solid rgba(184,201,180,0.22)' }}>
                      <Compass className="h-5 w-5" style={{ color: 'var(--herb)' }} strokeWidth={1.6} />
                    </div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Career Compass</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Recognition · one lane · Virgo MC</p>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--herb)' }}>Navigate →</p>
                </div>
              </Link>

              <Link href="/vault" className="group">
                <div className="relative rounded-[24px] p-6 min-h-[140px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                  style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: 'rgba(201,169,110,0.14)', border: '1px solid rgba(201,169,110,0.22)' }}>
                      <Archive className="h-5 w-5" style={{ color: 'var(--golden)' }} strokeWidth={1.6} />
                    </div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-1)' }}>Vault</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Your ideas are safe here</p>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--golden)' }}>Park it →</p>
                </div>
              </Link>

              <Link href="/night" className="group">
                <div className="relative rounded-[24px] p-6 min-h-[140px] flex flex-col justify-between overflow-hidden transition-all duration-300 hover:scale-[1.015] hover:shadow-xl cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, rgba(18,13,36,0.97) 0%, rgba(26,18,52,0.97) 100%)', border: '1px solid rgba(139,111,184,0.2)' }}>
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: 'rgba(139,111,184,0.2)', border: '1px solid rgba(139,111,184,0.3)' }}>
                      <Moon className="h-5 w-5" style={{ color: '#C4A9E8' }} strokeWidth={1.6} />
                    </div>
                    <p className="font-bold text-base text-white">Night Protection</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Wind down · protect tomorrow</p>
                  </div>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(196,169,232,0.7)' }}>Begin ritual →</p>
                </div>
              </Link>

            </div>

            {/* ── Dictation FAB — desktop only ── */}
            <Link href="/dictation"
              className="fixed bottom-[100px] right-10 z-50 w-14 h-14 rounded-full hidden lg:flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, #8B6FB8 0%, #6A4F9B 100%)',
                boxShadow: '0 4px 24px rgba(139,111,184,0.5), 0 0 0 1px rgba(139,111,184,0.3)',
              }}>
              <Mic className="h-6 w-6 text-white" strokeWidth={1.8} />
            </Link>

          </div>
        </AppLayout>
      </div>
    </>
  )
}
