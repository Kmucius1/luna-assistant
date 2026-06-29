'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import type { WeeklyForecast, DayForecast } from '@/app/api/astrology/weekly-forecast/route'

// ─── Design ──────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 22,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

function Label({ text, color = 'rgba(255,255,255,0.38)' }: { text: string; color?: string }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: 6 }}>{text}</p>
}

function Shimmer({ h = 120 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 22, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} className="shimmer" />
}

function IntensityPips({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: 12, height: 3, borderRadius: 2, background: i < value ? 'rgba(196,169,232,0.8)' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  )
}

// ─── Day card ─────────────────────────────────────────────────────────────────
function DayCard({ day, isFirst }: { day: DayForecast; isFirst: boolean }) {
  const [open, setOpen] = useState(isFirst)

  return (
    <div style={{ ...GLASS, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header row */}
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: isFirst ? '#C4A9E8' : 'white' }}>{day.dayLabel}</p>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{day.date}</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>{day.theme}</p>
          <div style={{ marginTop: 6 }}>
            <IntensityPips value={day.intensity} />
          </div>
        </div>
        <div style={{ marginLeft: 12, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Energy */}
          <div style={{ padding: '14px 0 10px' }}>
            <Label text="Energy" />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.65 }}>{day.energy}</p>
          </div>

          {/* Love + Career grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(200,120,160,0.1)', border: '1px solid rgba(200,120,160,0.2)' }}>
              <Label text="Love" color="rgb(220,130,170)" />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{day.love}</p>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(90,138,164,0.1)', border: '1px solid rgba(90,138,164,0.2)' }}>
              <Label text="Career" color="#7BAEC8" />
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{day.career}</p>
            </div>
          </div>

          {/* Guidance */}
          <div style={{ marginBottom: 12 }}>
            <Label text="Guidance for This Day" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(day.guidance ?? []).map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(139,111,184,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#9B7FC8', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Watch for */}
          <div style={{ padding: 12, borderRadius: 14, background: 'rgba(180,80,60,0.07)', border: '1px solid rgba(180,80,60,0.15)', marginBottom: 12 }}>
            <Label text="Watch For" color="#C96B5A" />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{day.watch_for}</p>
          </div>

          {/* Affirmation */}
          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(139,111,184,0.08)', border: '1px solid rgba(139,111,184,0.18)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#C4A9E8', fontStyle: 'italic', lineHeight: 1.55 }}>"{day.affirmation}"</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ForecastsPage() {
  const location = useLocation()
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'week' | 'month'>('week')

  const loadWeekly = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    try {
      const tz   = Intl.DateTimeFormat().resolvedOptions().timeZone
      const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      const url  = `/api/astrology/weekly-forecast?tz=${encodeURIComponent(tz)}&date=${encodeURIComponent(date)}${forceRefresh ? '&refresh=1' : ''}`
      const res  = await fetch(url)
      if (!res.ok) throw new Error()
      setForecast(await res.json())
    } catch { /* keep previous */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (location.localTime) loadWeekly()
  }, [location.localTime, loadWeekly])

  return (
    <div className="bg-app min-h-screen">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link href="/astrology" style={{ width: 32, height: 32, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <ArrowLeft className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.45)' }} />
                </Link>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'white' }}>Forecasts</h1>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>Your cosmic outlook — day by day</p>
                </div>
              </div>
              <button onClick={() => loadWeekly(true)} disabled={loading} style={{ width: 32, height: 32, borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* Week overview card */}
            {!loading && forecast && (
              <div style={{ ...GLASS, padding: 18, marginBottom: 16, background: 'linear-gradient(135deg, rgba(80,40,130,0.3), rgba(20,10,40,0.2))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles className="h-4 w-4" style={{ color: '#C4A9E8' }} />
                  <Label text="This Week's Theme" color="#C4A9E8" />
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6, marginBottom: 14 }}>{forecast.week_theme}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Power Day',   value: forecast.power_window, color: '#C9A96E' },
                    { label: 'Love Window', value: forecast.love_window,  color: 'rgb(220,130,170)' },
                    { label: 'Best Day',    value: forecast.best_day,     color: '#8AB88A' },
                    { label: 'Rest Day',    value: forecast.rest_day,     color: '#7BAEC8' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>{item.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7-day list */}
            {loading ? (
              <><Shimmer h={100} /><Shimmer h={100} /><Shimmer h={100} /><Shimmer h={100} /><Shimmer h={100} /></>
            ) : forecast ? (
              <div>
                <Label text={`7-Day Forecast · ${forecast.days.length} Days`} color="rgba(255,255,255,0.35)" />
                <div style={{ marginTop: 10 }}>
                  {forecast.days.map((day, i) => (
                    <DayCard key={day.date} day={day} isFirst={i === 0} />
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...GLASS, padding: 24, textAlign: 'center' }}>
                <Calendar className="h-8 w-8" style={{ color: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Tap ↻ to generate your 7-day forecast</p>
              </div>
            )}

            {/* Chart note */}
            {forecast && (
              <div style={{ ...GLASS, padding: 14, marginTop: 16, background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.15)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8B6FB8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Reading personalized to your chart</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[['☀️','Scorpio 22°'],['🌙','Cancer 4°'],['✨','Gemini Rising'],['♀','Sag Venus 29°'],['♂','Libra Mars 6°'],['☊','Cancer N.Node']].map(([e, v]) => (
                    <span key={v} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, background: 'rgba(139,111,184,0.15)', color: 'rgba(196,169,232,0.8)', border: '1px solid rgba(139,111,184,0.2)' }}>{e} {v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
