'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'

interface DailyGuidance {
  horoscope:       string
  energy:          string
  do_today:        string[]
  dont_today:      string[]
  career:          string
  love:            string
  sex:             string
  money:           string
  friendship:      string
  family:          string
  self_reflection: string
  main_focus:      string
  highest_self:    string
  affirmation:     string
}

// ─── Shimmer placeholder card ─────────────────────────────────────────────────
function ShimmerCard({ height = 80 }: { height?: number }) {
  return (
    <div
      className="shimmer rounded-[20px] w-full"
      style={{ height, background: 'var(--surface)' }}
    />
  )
}

function LoadingState() {
  return (
    <div className="space-y-4 pb-32">
      <ShimmerCard height={120} />
      <ShimmerCard height={64} />
      <div className="grid grid-cols-2 gap-3">
        <ShimmerCard height={200} />
        <ShimmerCard height={200} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4,5,6].map(i => <ShimmerCard key={i} height={110} />)}
      </div>
      <ShimmerCard height={100} />
      <ShimmerCard height={80} />
      <ShimmerCard height={140} />
      <ShimmerCard height={80} />
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({
  children,
  style,
  className = '',
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={`rounded-[22px] p-5 ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-4)' }}>
      {children}
    </p>
  )
}

// ─── Life area card ───────────────────────────────────────────────────────────
function AreaCard({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div
      className="rounded-[18px] p-4 h-full"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{emoji}</span>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{title}</p>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{text}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DailyReadingPage() {
  const [data,    setData]    = useState<DailyGuidance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const location = useLocation()

  const today = location.localDate
    || new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  const fetchGuidance = useCallback(async (refresh = false) => {
    setLoading(true)
    setError(false)
    try {
      const tz   = encodeURIComponent(location.tz)
      const time = encodeURIComponent(location.localTime)
      const date = encodeURIComponent(location.localDate)
      const base = `/api/astrology/daily-guidance?tz=${tz}&time=${time}&date=${date}`
      const url  = refresh ? `${base}&refresh=1` : base
      const res  = await fetch(url)
      if (!res.ok) throw new Error('non-2xx')
      const json = await res.json() as DailyGuidance
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [location.tz, location.localTime, location.localDate])

  useEffect(() => {
    // Wait until we have the local time before fetching
    if (location.localTime) fetchGuidance()
  }, [location.localTime, fetchGuidance])

  return (
    <div className="min-h-screen bg-app">
      {/* Ambient orbs */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 75% 15%, rgba(139,111,184,0.13) 0%, transparent 65%)', filter: 'blur(60px)' }}
      />
      <div
        className="fixed bottom-0 left-0 w-[350px] h-[350px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 20% 85%, rgba(201,169,110,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }}
      />

      <AppLayout>
        {/* Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pt-2">
          <div>
            <h1
              className="font-display text-2xl font-bold leading-tight"
              style={{ color: 'var(--text-1)' }}
            >
              Your Reading 🌙
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{today}</p>
          </div>
          <button
            onClick={() => fetchGuidance(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[14px] text-xs font-semibold tap-scale"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              color: 'var(--text-2)',
              opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {/* Loading ─────────────────────────────────────────────────────────── */}
        {loading && <LoadingState />}

        {/* Error ───────────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="h-8 w-8" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm text-center" style={{ color: 'var(--text-2)' }}>
              Something went wrong — tap to retry
            </p>
            <button
              onClick={() => fetchGuidance()}
              className="px-6 py-3 rounded-[14px] text-sm font-semibold tap-scale"
              style={{
                background: 'rgba(139,111,184,0.15)',
                border: '1px solid rgba(139,111,184,0.3)',
                color: 'var(--violet)',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Content ─────────────────────────────────────────────────────────── */}
        {!loading && !error && data && (
          <div className="space-y-4 pb-32 animate-page-enter">

            {/* ── Daily Horoscope ─────────────────────────────────────────── */}
            <div
              className="rounded-[22px] p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(139,111,184,0.22) 0%, rgba(90,60,150,0.12) 100%)',
                border: '1px solid rgba(139,111,184,0.30)',
              }}
            >
              <Label>Daily Horoscope</Label>
              <p className="text-base leading-relaxed" style={{ color: 'var(--text-1)' }}>
                {data.horoscope}
              </p>
            </div>

            {/* ── Today's Energy ──────────────────────────────────────────── */}
            <SectionCard>
              <Label>Today&apos;s Energy</Label>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                {data.energy}
              </p>
            </SectionCard>

            {/* ── Do / Avoid ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Do Today */}
              <div
                className="rounded-[20px] p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
              >
                <Label>Do Today</Label>
                <div className="flex flex-col gap-2">
                  {data.do_today.map((item, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1.5 rounded-[10px] text-xs font-medium leading-snug"
                      style={{ background: 'rgba(90,138,122,0.15)', border: '1px solid rgba(90,138,122,0.25)', color: '#5A8A7A' }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Avoid Today */}
              <div
                className="rounded-[20px] p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
              >
                <Label>Avoid Today</Label>
                <div className="flex flex-col gap-2">
                  {data.dont_today.map((item, i) => (
                    <div
                      key={i}
                      className="px-2.5 py-1.5 rounded-[10px] text-xs font-medium leading-snug"
                      style={{ background: 'rgba(201,107,90,0.13)', border: '1px solid rgba(201,107,90,0.22)', color: '#C96B5A' }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Life Area Messages ───────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-4)' }}>
                Life Areas
              </p>
              <div className="grid grid-cols-2 gap-3">
                <AreaCard emoji="💼" title="Career"     text={data.career}     />
                <AreaCard emoji="💜" title="Love"       text={data.love}       />
                <AreaCard emoji="🔥" title="Sex"        text={data.sex}        />
                <AreaCard emoji="💸" title="Money"      text={data.money}      />
                <AreaCard emoji="✨" title="Friendship" text={data.friendship} />
                <AreaCard emoji="🌿" title="Family"     text={data.family}     />
              </div>
            </div>

            {/* ── Self Reflection ─────────────────────────────────────────── */}
            <div
              className="rounded-[22px] p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(13,11,30,0.85) 0%, rgba(30,26,56,0.85) 100%)',
                border: '1px solid rgba(139,111,184,0.22)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(196,169,232,0.55)' }}>
                Reflect
              </p>
              <p
                className="text-lg font-display italic leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.90)' }}
              >
                &ldquo;{data.self_reflection}&rdquo;
              </p>
            </div>

            {/* ── Main Focus ──────────────────────────────────────────────── */}
            <div
              className="rounded-[22px] p-5"
              style={{
                background: 'rgba(201,169,110,0.12)',
                border: '1px solid rgba(201,169,110,0.25)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(201,169,110,0.8)' }}>
                Main Focus Today
              </p>
              <p className="text-base font-semibold leading-snug" style={{ color: '#C9A96E' }}>
                {data.main_focus}
              </p>
            </div>

            {/* ── Highest Self ─────────────────────────────────────────────── */}
            <div
              className="rounded-[22px] p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(90,60,160,0.25) 0%, rgba(139,111,184,0.15) 50%, rgba(60,40,120,0.22) 100%)',
                border: '1px solid rgba(139,111,184,0.35)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(196,169,232,0.65)' }}>
                Your Highest Self
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>
                {data.highest_self}
              </p>
            </div>

            {/* ── Affirmation ─────────────────────────────────────────────── */}
            <div
              className="rounded-[22px] p-7 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(139,111,184,0.30) 0%, rgba(90,60,150,0.22) 50%, rgba(184,159,216,0.18) 100%)',
                border: '1px solid rgba(139,111,184,0.30)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(196,169,232,0.6)' }}>
                Today&apos;s Affirmation
              </p>
              <p
                className="text-base font-display italic leading-relaxed"
                style={{ color: '#FFFFFF' }}
              >
                &ldquo;{data.affirmation}&rdquo;
              </p>
            </div>

          </div>
        )}
      </AppLayout>
    </div>
  )
}
