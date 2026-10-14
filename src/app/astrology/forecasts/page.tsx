'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { BackLink } from '@/components/ui/BackLink'
import { ArrowLeft, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import type { WeeklyForecast, DayForecast } from '@/app/api/astrology/weekly-forecast/route'

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

function FullDayReading({ iso, delayMs, label }: { iso: string; delayMs: number; label: string }) {
  const [g, setG] = useState<FullGuidance | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let live = true
    const t = setTimeout(async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const r = await fetch(`/api/astrology/daily-guidance?day=${iso}&tz=${encodeURIComponent(tz)}`)
        if (!r.ok) throw new Error()
        const d = await r.json()
        if (!live) return
        if (d?.horoscope) { setG(d); setState('ready') } else setState('error')
      } catch { if (live) setState('error') }
    }, delayMs)
    return () => { live = false; clearTimeout(t) }
  }, [iso, delayMs])

  if (state === 'loading') return <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.45)', padding: '12px 0' }}>Writing the full reading for {label}…</p>
  if (state === 'error' || !g) return <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.5)', padding: '12px 0' }}>Couldn’t load this day’s full reading. Close and reopen it to try again.</p>

  return (
    <div style={{ borderTop: '1px solid rgba(180,150,100,0.12)', marginTop: 10, paddingTop: 4 }}>
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
      <H>Your highest self today</H><P>{g.highest_self}</P>
      <H>Question to sit with</H><P>{g.self_reflection}</P>
      <H>Affirmation</H><P bold>“{g.affirmation}”</P>
    </div>
  )
}

// ─── Day card ─────────────────────────────────────────────────────────────────
function DayCard({ day, isFirst, iso, fullAll, stagger }: { day: DayForecast; isFirst: boolean; iso: string; fullAll: boolean; stagger: number }) {
  const [openOwn, setOpen] = useState(isFirst)
  const open = openOwn || fullAll
  const [fullOwn, setFullOwn] = useState(false)
  const showFull = fullAll || fullOwn

  return (
    <div style={{ ...GLASS, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header row */}
      <button onClick={() => setOpen(v => !(v || fullAll) ? true : false)} style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: isFirst ? '#5C4530' : '#100C1E' }}>{day.dayLabel}</p>
            <span style={{ fontSize: 11, color: 'rgba(16,12,30,0.35)' }}>{day.date}</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.6)', lineHeight: 1.45 }}>{day.theme}</p>
          <div style={{ marginTop: 6 }}>
            <IntensityPips value={day.intensity} />
          </div>
        </div>
        <div style={{ marginLeft: 12, color: 'rgba(16,12,30,0.3)', flexShrink: 0 }}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(180,150,100,0.06)' }}>
          {/* Energy */}
          <div style={{ padding: '14px 0 10px' }}>
            <Label text="Energy" />
            <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.8)', lineHeight: 1.65 }}>{day.energy}</p>
          </div>

          {/* Love + Career grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(200,120,160,0.1)', border: '1px solid rgba(200,120,160,0.2)' }}>
              <Label text="Love" color="rgb(220,130,170)" />
              <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.75)', lineHeight: 1.55 }}>{day.love}</p>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(90,138,164,0.1)', border: '1px solid rgba(90,138,164,0.2)' }}>
              <Label text="Career" color="#7BAEC8" />
              <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.75)', lineHeight: 1.55 }}>{day.career}</p>
            </div>
          </div>

          {/* Guidance */}
          <div style={{ marginBottom: 12 }}>
            <Label text="Guidance for This Day" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(day.guidance ?? []).map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 10, background: 'rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#5C4530', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.75)', lineHeight: 1.55 }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Watch for */}
          <div style={{ padding: 12, borderRadius: 14, background: 'rgba(180,80,60,0.07)', border: '1px solid rgba(180,80,60,0.15)', marginBottom: 12 }}>
            <Label text="Watch For" color="#C96B5A" />
            <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.7)', lineHeight: 1.5 }}>{day.watch_for}</p>
          </div>

          {/* Affirmation */}
          <div style={{ padding: 14, borderRadius: 16, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.18)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#5C4530', fontStyle: 'italic', lineHeight: 1.55 }}>&quot;{day.affirmation}&quot;</p>
          </div>

          {!showFull ? (
            <button onClick={() => setFullOwn(true)}
              style={{ width: '100%', marginTop: 14, padding: '13px 16px', borderRadius: 14, border: '1px solid rgba(92,69,48,0.3)', background: 'rgba(92,69,48,0.08)', color: '#5C4530', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Show the full detailed reading for this day
            </button>
          ) : (
            <FullDayReading iso={iso} delayMs={stagger} label={day.dayLabel} />
          )}
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
  const [fullAll, setFullAll] = useState(false)

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

            {/* 7-day list */}
            {loading ? (
              <><Shimmer h={100} /><Shimmer h={100} /><Shimmer h={100} /><Shimmer h={100} /><Shimmer h={100} /></>
            ) : forecast ? (
              <div>
                <Label text={`7-Day Forecast · ${forecast.days.length} Days`} color="rgba(16,12,30,0.35)" />
                <button onClick={() => setFullAll(v => !v)}
                  style={{ width: '100%', margin: '10px 0 4px', padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(92,69,48,0.3)', background: fullAll ? 'rgba(92,69,48,0.14)' : '#5C4530', color: fullAll ? '#5C4530' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {fullAll ? 'Hide the full week details' : 'Show full details for the whole week'}
                </button>
                {fullAll && <p style={{ fontSize: 11, color: 'rgba(16,12,30,0.45)', margin: '4px 2px 8px' }}>Each day is written in full, one after another. It can take a minute for all seven.</p>}
                <div style={{ marginTop: 10 }}>
                  {forecast.days.map((day, i) => {
                    const d = new Date(); d.setDate(d.getDate() + i)
                    const iso = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
                    return <DayCard key={day.date} day={day} isFirst={i === 0} iso={iso} fullAll={fullAll} stagger={fullAll ? i * 3500 : 0} />
                  })}
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
