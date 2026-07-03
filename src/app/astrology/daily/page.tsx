'use client'
import { useState, useEffect, useCallback } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import type { ReadingJSON } from '@/lib/luna/readingGenerator'

interface StoredReadingSlim {
  reading_date: string
  reading_json: ReadingJSON
  generated_at: string
}

interface WindowResponse {
  readings: StoredReadingSlim[]
  updatedAt: string
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
      <ShimmerCard height={280} />
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map(i => <ShimmerCard key={i} height={90} />)}
      </div>
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

const TAB_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  border: `1px solid ${active ? 'rgba(155,92,255,0.45)' : 'var(--surface-border)'}`,
  background: active ? 'rgba(155,92,255,0.18)' : 'var(--surface)',
  color: active ? 'var(--violet)' : 'var(--text-3)',
  whiteSpace: 'nowrap',
})

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DailyReadingPage() {
  const [data, setData] = useState<WindowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState('love')
  const location = useLocation()

  const fetchWindow = useCallback(async (refresh = false) => {
    setLoading(true)
    setError(false)
    try {
      const tz = encodeURIComponent(location.tz || 'America/New_York')
      const base = `/api/luna/daily-readings?tz=${tz}`
      const url = refresh ? `${base}&refresh=1` : base
      const res = await fetch(url)
      if (!res.ok) throw new Error('non-2xx')
      const json = await res.json() as WindowResponse
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [location.tz])

  useEffect(() => { fetchWindow() }, [fetchWindow])

  const today = data?.readings?.[0]
  const upcoming = data?.readings?.slice(1) ?? []

  const updatedNote = (() => {
    if (!today) return ''
    const genDate = new Date(today.generated_at)
    const todayLocal = new Intl.DateTimeFormat('en-CA', { timeZone: location.tz || 'America/New_York' }).format(new Date())
    const genLocal = new Intl.DateTimeFormat('en-CA', { timeZone: location.tz || 'America/New_York' }).format(genDate)
    if (genLocal === todayLocal) {
      // Honest: only claim the midnight-cron framing if it's actually today's date —
      // we don't know the exact generation hour without more plumbing, so keep it soft.
      return 'Updated today'
    }
    return `Generated ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(genDate)}`
  })()

  return (
    <div className="min-h-screen bg-app">
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 75% 15%, rgba(155,92,255,0.13) 0%, transparent 65%)', filter: 'blur(60px)' }}
      />
      <div
        className="fixed bottom-0 left-0 w-[350px] h-[350px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle at 20% 85%, rgba(201,169,110,0.08) 0%, transparent 65%)', filter: 'blur(60px)' }}
      />

      <AppLayout>
        {/* Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 pt-2">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight" style={{ color: 'var(--text-1)' }}>
              Your Reading 🌙
            </h1>
            {updatedNote && <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>{updatedNote}</p>}
          </div>
          <button
            onClick={() => fetchWindow(true)}
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

        {loading && <LoadingState />}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <AlertCircle className="h-8 w-8" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm text-center" style={{ color: 'var(--text-2)' }}>Something went wrong — tap to retry</p>
            <button
              onClick={() => fetchWindow()}
              className="px-6 py-3 rounded-[14px] text-sm font-semibold tap-scale"
              style={{ background: 'rgba(155,92,255,0.15)', border: '1px solid rgba(155,92,255,0.3)', color: 'var(--violet)' }}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && today && (
          <div className="space-y-4 pb-32 animate-page-enter">

            {/* ── Today's card ─────────────────────────────────────────────── */}
            <div
              className="rounded-[22px] p-6"
              style={{
                background: 'linear-gradient(145deg, rgba(155,92,255,0.22) 0%, rgba(90,60,150,0.12) 100%)',
                border: '1px solid rgba(155,92,255,0.30)',
              }}
            >
              <Label>{today.reading_json.date}</Label>
              <p className="font-display text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
                {today.reading_json.title}
              </p>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-1)' }}>
                {today.reading_json.main_theme}
              </p>

              <div className="flex flex-wrap gap-2 mb-4 text-xs" style={{ color: 'var(--text-3)' }}>
                <span className="px-2.5 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  ☀️ {today.reading_json.cosmic_weather.sun_sign} season
                </span>
                <span className="px-2.5 py-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                  🌙 {today.reading_json.cosmic_weather.moon_sign} · {today.reading_json.cosmic_weather.moon_phase}
                </span>
              </div>

              <p className="text-sm leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {today.reading_json.luna_message}
              </p>
            </div>

            {/* ── Tabs: Love / Work / Energy / Spiritual / Journal ────────────── */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
                {(['love', 'work', 'energy', 'spiritual', 'journal'] as const).map(tab => (
                  <Tabs.Trigger key={tab} value={tab} asChild>
                    <button type="button" style={TAB_STYLE(activeTab === tab)}>
                      {tab === 'love' ? 'Love' : tab === 'work' ? 'Work' : tab === 'energy' ? 'Energy' : tab === 'spiritual' ? 'Spiritual' : 'Journal'}
                    </button>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              <Tabs.Content value="love">
                <SectionCard><p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{today.reading_json.personal_alignment.relationship_theme}</p></SectionCard>
              </Tabs.Content>
              <Tabs.Content value="work">
                <SectionCard><p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{today.reading_json.personal_alignment.career_theme}</p></SectionCard>
              </Tabs.Content>
              <Tabs.Content value="energy">
                <SectionCard>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-1)' }}>{today.reading_json.personal_alignment.energy_theme}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[14px] p-3" style={{ background: 'rgba(90,138,122,0.12)', border: '1px solid rgba(90,138,122,0.22)' }}>
                      <p className="text-[11px] font-bold uppercase mb-1" style={{ color: '#5A8A7A' }}>Do this</p>
                      <p className="text-xs" style={{ color: 'var(--text-1)' }}>{today.reading_json.guidance.do_this}</p>
                    </div>
                    <div className="rounded-[14px] p-3" style={{ background: 'rgba(201,107,90,0.10)', border: '1px solid rgba(201,107,90,0.2)' }}>
                      <p className="text-[11px] font-bold uppercase mb-1" style={{ color: '#C96B5A' }}>Avoid this</p>
                      <p className="text-xs" style={{ color: 'var(--text-1)' }}>{today.reading_json.guidance.avoid_this}</p>
                    </div>
                  </div>
                </SectionCard>
              </Tabs.Content>
              <Tabs.Content value="spiritual">
                <SectionCard>
                  <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-1)' }}>{today.reading_json.personal_alignment.natal_focus}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-[14px] p-3" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                      <p className="font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Numerology</p>
                      <p style={{ color: 'var(--text-1)' }}>Day {today.reading_json.numerology.personal_day} — {today.reading_json.numerology.meaning}</p>
                    </div>
                    <div className="rounded-[14px] p-3" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                      <p className="font-bold uppercase mb-1" style={{ color: 'var(--text-3)' }}>Chinese day energy</p>
                      <p style={{ color: 'var(--text-1)' }}>{today.reading_json.chinese_astrology.day_energy} — {today.reading_json.chinese_astrology.guidance}</p>
                    </div>
                  </div>
                </SectionCard>
              </Tabs.Content>
              <Tabs.Content value="journal">
                <SectionCard>
                  <Label>Journal prompt</Label>
                  <p className="text-base font-display italic leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    &ldquo;{today.reading_json.guidance.journal_prompt}&rdquo;
                  </p>
                  <Label>Affirmation</Label>
                  <p className="text-sm font-semibold" style={{ color: 'var(--violet)' }}>{today.reading_json.guidance.affirmation}</p>
                </SectionCard>
              </Tabs.Content>
            </Tabs.Root>

            {/* ── Next 5 days ──────────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-4)' }}>
                Coming up
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {upcoming.map(r => (
                  <div
                    key={r.reading_date}
                    className="rounded-[16px] p-3.5 flex-shrink-0"
                    style={{ width: 150, background: 'var(--surface)', border: '1px solid var(--surface-border)' }}
                  >
                    <p className="text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--text-4)' }}>
                      {new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(r.reading_date + 'T12:00:00'))}
                    </p>
                    <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-1)' }}>{r.reading_json.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                      🌙 {r.reading_json.cosmic_weather.moon_sign}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Clarity note + source note ───────────────────────────────── */}
            <div className="rounded-[18px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--text-3)' }}>{today.reading_json.clarity_note}</p>
              <p className="text-[10.5px] leading-relaxed" style={{ color: 'var(--text-4)' }}>
                Sky data calculated from real-time ephemeris math. Interpretation is symbolic guidance, not scientific prediction.
              </p>
            </div>
          </div>
        )}
      </AppLayout>
    </div>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[22px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      {children}
    </div>
  )
}
