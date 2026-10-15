'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BackLink } from '@/components/ui/BackLink'
import { ArrowLeft, Calendar, Sparkles, RefreshCw } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import type { WeeklyForecast } from '@/app/api/astrology/weekly-forecast/route'

// ─── Design ──────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.16)',
  borderRadius: 22,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

function Label({ text, color = 'rgba(16,12,30,0.38)' }: { text: string; color?: string }) {
  return <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: 6 }}>{text}</p>
}

function Shimmer({ h = 120 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 22, background: 'rgba(180,150,100,0.14)', marginBottom: 12 }} className="shimmer" />
}

function IntensityPips({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{ width: 12, height: 3, borderRadius: 2, background: i < value ? 'rgba(201,169,110,0.8)' : 'rgba(180,150,100,0.18)' }} />
      ))}
    </div>
  )
}

// ─── Full day reading (the long, plain-words version for one date) ───────────
type FullGuidance = {
  best_move?: { headline: string; why: string; first: string; then: string; skip: string; best_window: string; people: string }
  in_plain_words?: string
  transit_breakdown?: { sky: string; feels_like: string; what_to_do: string }[]
  real_advice?: { situation: string; do: string }[]
  horoscope: string; energy: string; do_today: string[]; dont_today: string[]
  career: string; love: string; sex?: string; money: string; friendship: string; family: string
  self_reflection: string; main_focus: string; highest_self: string; affirmation: string
}

const H = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(16,12,30,0.4)', margin: '16px 0 5px' }}>{children}</p>
)
const P = ({ children, bold }: { children: React.ReactNode; bold?: boolean }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'rgba(16,12,30,0.82)', margin: '0 0 6px', fontWeight: bold ? 600 : 400, whiteSpace: 'pre-line' }}>{children}</p>
)

function FullDayView({ g }: { g: FullGuidance }) {
  return (
    <div>
      {g.best_move && (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 16, background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C4530', margin: '0 0 6px' }}>Best move this day</p>
          <P bold>{g.best_move.headline}</P>
          <P>{g.best_move.why}</P>
          <P><strong>Do first:</strong> {g.best_move.first}</P>
          <P><strong>Then:</strong> {g.best_move.then}</P>
          <P><strong>Skip or put off:</strong> {g.best_move.skip}</P>
          <P><strong>Best time:</strong> {g.best_move.best_window}</P>
          <P><strong>With the people closest to you:</strong> {g.best_move.people}</P>
        </div>
      )}
      {g.in_plain_words && (<><H>In plain words</H><P bold>{g.in_plain_words}</P></>)}
      <H>The day, morning to evening</H><P>{g.horoscope}</P>
      <H>How it feels</H><P>{g.energy}</P>
      {g.transit_breakdown && g.transit_breakdown.length > 0 && (
        <>
          <H>What the sky is doing</H>
          {g.transit_breakdown.map((t, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <P bold>{t.sky}</P>
              <P><strong>What it feels like:</strong> {t.feels_like}</P>
              <P><strong>What to do:</strong> {t.what_to_do}</P>
            </div>
          ))}
        </>
      )}
      <H>Main focus</H><P>{g.main_focus}</P>
      {g.real_advice && g.real_advice.length > 0 && (
        <>
          <H>Real advice</H>
          {g.real_advice.map((a, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <P bold>{a.situation}</P>
              <P>{a.do}</P>
            </div>
          ))}
        </>
      )}
      <H>Work + career</H><P>{g.career}</P>
      <H>Money</H><P>{g.money}</P>
      <H>Love + romance</H><P>{g.love}</P>
      <H>Friends</H><P>{g.friendship}</P>
      <H>Family</H><P>{g.family}</P>
      <H>Do today</H>
      {g.do_today.map((x, i) => <P key={i}>• {x}</P>)}
      <H>Avoid today</H>
      {g.dont_today.map((x, i) => <P key={i}>• {x}</P>)}
      <H>Your highest self</H><P>{g.highest_self}</P>
      <H>Question to sit with</H><P>{g.self_reflection}</P>
      <H>Affirmation</H><P bold>“{g.affirmation}”</P>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ForecastsPage() {
  const location = useLocation()
  const [forecast, setForecast] = useState<WeeklyForecast | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [sel, setSel] = useState(0)
  const [readings, setReadings] = useState<Record<string, FullGuidance | 'error' | 'loading'>>({})

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

  const isoFor = (i: number) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  }

  // Load one day's full reading (today uses the exact same reading as Astrology Today).
  const loadDay = useCallback(async (i: number, force = false) => {
    const iso = isoFor(i)
    let skip = false
    setReadings(prev => {
      if (!force && (prev[iso] === 'loading' || (prev[iso] && prev[iso] !== 'error'))) skip = true
      return skip ? prev : { ...prev, [iso]: 'loading' }
    })
    if (skip) return
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      let url = `/api/astrology/daily-guidance?day=${iso}&tz=${encodeURIComponent(tz)}${force ? '&refresh=1' : ''}`
      if (i === 0) {
        const localDate = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
        const localTime = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date())
        url = `/api/astrology/daily-guidance?tz=${encodeURIComponent(tz)}&date=${encodeURIComponent(localDate)}&time=${encodeURIComponent(localTime)}${force ? '&refresh=1' : ''}`
      }
      const r = await fetch(url)
      const d = await r.json()
      setReadings(prev => ({ ...prev, [iso]: d?.horoscope ? d : 'error' }))
    } catch {
      setReadings(prev => ({ ...prev, [iso]: 'error' }))
    }
  }, [])

  // Open the selected day's reading, then quietly prepare the rest one by one.
  useEffect(() => {
    if (!forecast) return
    const order = [sel, ...[0, 1, 2, 3, 4, 5, 6].filter(i => i !== sel)]
    const timers = order.map((i, n) => setTimeout(() => loadDay(i), n === 0 ? 0 : 4000 + (n - 1) * 5000))
    return () => timers.forEach(clearTimeout)
  }, [forecast, sel, loadDay])

  useEffect(() => {
    if (location.localTime) loadWeekly()
  }, [location.localTime, loadWeekly])

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)' }}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BackLink href="/astrology/timing" style={{ width: 32, height: 32, borderRadius: 11, background: 'rgba(180,150,100,0.06)', border: '1px solid rgba(180,150,100,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <ArrowLeft className="h-4 w-4" style={{ color: 'rgba(16,12,30,0.45)' }} />
                </BackLink>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#F5EFE3' }}>Forecasts</h1>
                  <p style={{ fontSize: 11, color: 'rgba(16,12,30,0.38)' }}>Your cosmic outlook — day by day</p>
                </div>
              </div>
              <button onClick={() => loadWeekly(true)} disabled={loading} style={{ width: 32, height: 32, borderRadius: 11, background: 'rgba(180,150,100,0.06)', border: '1px solid rgba(180,150,100,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'rgba(16,12,30,0.4)' }} />
              </button>
            </div>
          </div>

          <div style={{ padding: '0 16px' }}>

            {/* Week overview card */}
            {!loading && forecast && (
              <div style={{ ...GLASS, padding: 18, marginBottom: 16, background: 'linear-gradient(135deg, rgba(247,238,220,0.95), rgba(240,228,198,0.92))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles className="h-4 w-4" style={{ color: '#5C4530' }} />
                  <Label text="This Week's Theme" color="#5C4530" />
                </div>
                <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.9)', lineHeight: 1.6, marginBottom: 14 }}>{forecast.week_theme}</p>

                {forecast.week_priorities && forecast.week_priorities.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <Label text="Best day for each thing this week" color="#5C4530" />
                    {forecast.week_priorities.map((w, i) => (
                      <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid rgba(180,150,100,0.15)' : 'none' }}>
                        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(16,12,30,0.88)', margin: 0 }}>{w.day}: {w.task}</p>
                        <p style={{ fontSize: 12.5, color: 'rgba(16,12,30,0.6)', lineHeight: 1.5, margin: '2px 0 0' }}>{w.why}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Power Day',   value: forecast.power_window, color: '#5C4530' },
                    { label: 'Love Window', value: forecast.love_window,  color: 'rgb(220,130,170)' },
                    { label: 'Best Day',    value: forecast.best_day,     color: '#8AB88A' },
                    { label: 'Rest Day',    value: forecast.rest_day,     color: '#7BAEC8' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(180,150,100,0.04)', border: '1px solid rgba(180,150,100,0.07)' }}>
                      <p style={{ fontSize: 10, color: 'rgba(16,12,30,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 3 }}>{item.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day tabs */}
            {loading ? (
              <><Shimmer h={60} /><Shimmer h={300} /></>
            ) : forecast ? (
              <div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 10px', scrollbarWidth: 'none' }}>
                  {forecast.days.map((day, i) => {
                    const d = new Date(); d.setDate(d.getDate() + i)
                    const wk = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
                    const on = sel === i
                    const ready = readings[isoFor(i)] && readings[isoFor(i)] !== 'loading' && readings[isoFor(i)] !== 'error'
                    return (
                      <button key={day.date} onClick={() => setSel(i)}
                        style={{
                          flex: '0 0 auto', minWidth: 68, padding: '10px 12px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                          border: on ? '1px solid #5C4530' : '1px solid rgba(180,150,100,0.25)',
                          background: on ? '#5C4530' : 'rgba(255,255,255,0.6)', color: on ? '#fff' : '#32284A',
                        }}>
                        <span style={{ display: 'block', fontSize: 11, opacity: 0.75 }}>{i === 0 ? 'Today' : wk}</span>
                        <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{d.getDate()}</span>
                        <span style={{ display: 'block', fontSize: 9, opacity: 0.7 }}>{ready ? 'ready' : ' '}</span>
                      </button>
                    )
                  })}
                </div>

                {(() => {
                  const day = forecast.days[sel]
                  if (!day) return null
                  const g = readings[isoFor(sel)]
                  return (
                    <div style={{ ...GLASS, padding: 18 }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#100C1E', margin: 0 }}>{day.dayLabel}</p>
                      <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.45)', margin: '2px 0 8px' }}>{day.date}</p>
                      <IntensityPips value={day.intensity} />
                      <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.78)', lineHeight: 1.6, marginTop: 10 }}>{day.theme}</p>
                      {day.best_move && (
                        <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: 'rgba(92,69,48,0.08)', border: '1px solid rgba(92,69,48,0.2)' }}>
                          <Label text="Best move" color="#5C4530" />
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(16,12,30,0.88)', lineHeight: 1.55, margin: 0 }}>{day.best_move}</p>
                          {day.best_window && <p style={{ fontSize: 12.5, color: 'rgba(16,12,30,0.6)', lineHeight: 1.5, margin: '6px 0 0' }}>{day.best_window}</p>}
                        </div>
                      )}
                      {day.watch_for && (
                        <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)' }}>
                          <Label text="Watch for" color="#5C4530" />
                          <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.8)', lineHeight: 1.55, margin: 0 }}>{day.watch_for}</p>
                        </div>
                      )}
                      <div style={{ borderTop: '1px solid rgba(180,150,100,0.15)', marginTop: 14 }}>
                        {!g || g === 'loading' ? (
                          <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)', padding: '16px 0' }}>Luna is writing the full reading for {day.dayLabel}. It takes a moment…</p>
                        ) : g === 'error' ? (
                          <div style={{ padding: '16px 0' }}>
                            <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.55)' }}>Couldn’t load this day’s reading.</p>
                            <button onClick={() => loadDay(sel, true)} style={{ marginTop: 8, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(92,69,48,0.3)', background: 'transparent', color: '#5C4530', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
                          </div>
                        ) : (
                          <FullDayView g={g} />
                        )}
                      </div>
                    </div>
                  )
                })()}

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button disabled={sel === 0} onClick={() => setSel(v => Math.max(0, v - 1))}
                    style={{ flex: 1, padding: 13, borderRadius: 14, border: '1px solid rgba(180,150,100,0.25)', background: 'rgba(255,255,255,0.6)', color: '#32284A', fontWeight: 600, opacity: sel === 0 ? 0.4 : 1, cursor: 'pointer' }}>
                    ← Previous day
                  </button>
                  <button disabled={sel >= forecast.days.length - 1} onClick={() => setSel(v => Math.min(forecast.days.length - 1, v + 1))}
                    style={{ flex: 1, padding: 13, borderRadius: 14, border: '1px solid rgba(180,150,100,0.25)', background: 'rgba(255,255,255,0.6)', color: '#32284A', fontWeight: 600, opacity: sel >= forecast.days.length - 1 ? 0.4 : 1, cursor: 'pointer' }}>
                    Next day →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ ...GLASS, padding: 24, textAlign: 'center' }}>
                <Calendar className="h-8 w-8" style={{ color: 'rgba(16,12,30,0.2)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.4)' }}>Tap ↻ to generate your 7-day forecast</p>
              </div>
            )}

            {/* Chart note */}
            {forecast && (
              <div style={{ ...GLASS, padding: 14, marginTop: 16, background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.35)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#5C4530', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Reading personalized to your chart</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[['☀️','Scorpio 22°'],['🌙','Cancer 4°'],['✨','Gemini Rising'],['♀','Sag Venus 29°'],['♂','Libra Mars 6°'],['☊','Cancer N.Node']].map(([e, v]) => (
                    <span key={v} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, background: 'rgba(201,169,110,0.15)', color: 'rgba(201,169,110,0.8)', border: '1px solid rgba(201,169,110,0.2)' }}>{e} {v}</span>
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
