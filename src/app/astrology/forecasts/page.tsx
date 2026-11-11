'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BackLink } from '@/components/ui/BackLink'
import { ArrowLeft, Calendar, Sparkles, RefreshCw } from 'lucide-react'
import { useLocation } from '@/hooks/useLocation'
import { getSavedPeople, type SavedPerson } from '@/lib/luna/savedPeople'
import type { WeeklyForecast } from '@/app/api/astrology/weekly-forecast/route'
import type { SkyDay } from '@/lib/luna/weekSky'
import { mondayKeyOf } from '@/lib/luna/today'

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

// ─── What to say to Kaleb that day ──────────────────────────────────────────
interface KalebReading {
  verdict: { label: string }
  ratings: { communication: { level: string }; closeness: { level: string }; space: { needsSpace: boolean } }
  bestDay?: { day: string }
  moonUncertain?: boolean
  reading: {
    best_move?: { headline: string; when: string; how: string }
    summary?: string; feeling_today?: string; feeling_clues?: string[]
    conversation_plan?: string[]
    exact_words?: { situation: string; say: string; why_it_works?: string; if_he_responds?: string }[]
    deeper_talk?: string; healthy_outcome?: string; avoid?: string[]; if_it_goes_sideways?: string
  }
}

function KalebDay({ k, name }: { k: KalebReading; name: string }) {
  const r = k.reading
  const lvl = (l: string) => l[0].toUpperCase() + l.slice(1)
  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'rgba(120,100,160,0.08)', border: '1px solid rgba(120,100,160,0.2)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4b3f72', margin: '0 0 6px' }}>What to say to {name} this day</p>
      <p style={{ fontSize: 17, fontWeight: 700, color: '#100C1E', margin: '0 0 8px' }}>{k.verdict.label}</p>
      <p style={{ fontSize: 12.5, color: 'rgba(16,12,30,0.6)', margin: '0 0 8px' }}>
        Communicate: {lvl(k.ratings.communication.level)} · Be close: {lvl(k.ratings.closeness.level)} · Space: {k.ratings.space.needsSpace ? 'give some' : 'not needed'}
      </p>
      {r.best_move && (
        <>
          <P bold>{r.best_move.headline}</P>
          <P><strong>When:</strong> {r.best_move.when}</P>
          <P><strong>How:</strong> {r.best_move.how}</P>
        </>
      )}
      {r.feeling_today && (<><H>What {name} is most likely feeling</H><P>{r.feeling_today}</P></>)}
      {r.feeling_clues && r.feeling_clues.length > 0 && (<><H>What you might notice</H>{r.feeling_clues.map((x, i) => <P key={i}>• {x}</P>)}</>)}
      {r.conversation_plan && r.conversation_plan.length > 0 && (
        <><H>How the conversation should go</H>{r.conversation_plan.map((x, i) => <P key={i}>{i + 1}. {x}</P>)}</>
      )}
      {r.exact_words && r.exact_words.length > 0 && (
        <>
          <H>Exactly what to say</H>
          {r.exact_words.map((w, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(120,100,160,0.15)' }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(16,12,30,0.5)', margin: '0 0 4px' }}>{w.situation}</p>
              <P bold>“{w.say}”</P>
              {w.why_it_works && <P><strong>Why it works:</strong> {w.why_it_works}</P>}
              {w.if_he_responds && <P><strong>If he responds:</strong> {w.if_he_responds}</P>}
            </div>
          ))}
        </>
      )}
      {r.deeper_talk && (<><H>Is this the day for the deeper conversation?</H><P>{r.deeper_talk}</P></>)}
      {r.avoid && r.avoid.length > 0 && (<><H>Avoid</H>{r.avoid.map((x, i) => <P key={i}>• {x}</P>)}</>)}
      {r.if_it_goes_sideways && (<><H>If it gets tense</H><P>{r.if_it_goes_sideways}</P></>)}
      {r.healthy_outcome && (<><H>What a healthy outcome looks like</H><P>{r.healthy_outcome}</P></>)}
      <p style={{ fontSize: 11.5, color: 'rgba(16,12,30,0.5)', lineHeight: 1.5, margin: '10px 0 0' }}>
        The ratings are calculated from real planet positions. The explanation is an interpretation and a tendency, not a guarantee.
        {k.moonUncertain ? ` ${name}'s Moon may be off without a confirmed birth time.` : ''}
      </p>
    </div>
  )
}

// ─── Full day reading (the long, plain-words version for one date) ───────────
type FullGuidance = {
  tension_roots?: { where: string; root: string; needs: string; helps: string }[]
  love_deep?: { sky: string; inside_you: string; with_kaleb: string; do: string[]; say: string; avoid: string[]; reflect: string }
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
      {g.tension_roots && g.tension_roots.length > 0 && (
        <>
          <H>Where emotional tension may come from</H>
          {g.tension_roots.map((t, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, borderRadius: 14, background: 'rgba(120,100,160,0.08)', border: '1px solid rgba(120,100,160,0.18)' }}>
              <P bold>{t.where}</P>
              <P><strong>Where it comes from:</strong> {t.root}</P>
              <P><strong>What you need:</strong> {t.needs}</P>
              <P><strong>What helps today:</strong> {t.helps}</P>
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
      {g.love_deep && (
        <div style={{ marginTop: 10, padding: 14, borderRadius: 16, background: 'rgba(200,120,160,0.1)', border: '1px solid rgba(200,120,160,0.22)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(170,70,115)', margin: '0 0 6px' }}>Love and romance, in depth</p>
          <H>What the sky is doing for love</H><P>{g.love_deep.sky}</P>
          <H>What you may feel inside</H><P>{g.love_deep.inside_you}</P>
          <H>The Kaleb situation today</H><P>{g.love_deep.with_kaleb}</P>
          <H>What to do</H>
          {g.love_deep.do.map((x, i) => <P key={i}>{i + 1}. {x}</P>)}
          <H>What you could say</H><P>{g.love_deep.say}</P>
          <H>What to avoid</H>
          {g.love_deep.avoid.map((x, i) => <P key={i}>• {x}</P>)}
          <H>Sit with this</H><P bold>{g.love_deep.reflect}</P>
        </div>
      )}
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
  const [sky, setSky] = useState<SkyDay[]>([])
  const [kaleb, setKaleb] = useState<SavedPerson | null>(null)
  const [kalebDays, setKalebDays] = useState<Record<string, KalebReading | 'loading' | 'error'>>({})
  const [loading,  setLoading]  = useState(true)
  const [sel, setSel] = useState(0)
  const [readings, setReadings] = useState<Record<string, FullGuidance | 'error' | 'loading'>>({})

  const loadWeekly = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    const iso = mondayKeyOf(new Date(), tz) // the real Monday-to-Sunday week, not a rolling 7 days
    // The real days and sky are calculated, so they load fast and never depend on the AI.
    try {
      const r = await fetch(`/api/astrology/week-sky?start=${iso}`)
      if (r.ok) {
        const days: SkyDay[] = (await r.json()).days ?? []
        setSky(days)
        const t = days.findIndex(d => d.isToday)
        if (t >= 0) setSel(t)
      }
    } catch { /* keep previous */ }
    try {
      const url = `/api/astrology/weekly-forecast?tz=${encodeURIComponent(tz)}&date=${encodeURIComponent(date)}${forceRefresh ? '&refresh=1' : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      setForecast(await res.json())
    } catch { /* keep previous */ }
    setLoading(false)
  }, [])

  const isoFor = (i: number) => sky[i]?.iso ?? ''

  // Load one day's full reading (today uses the exact same reading as Astrology Today).
  const loadDay = useCallback(async (i: number, force = false) => {
    const iso = isoFor(i)
    if (!iso) return
    let skip = false
    setReadings(prev => {
      if (!force && (prev[iso] === 'loading' || (prev[iso] && prev[iso] !== 'error'))) skip = true
      return skip ? prev : { ...prev, [iso]: 'loading' }
    })
    if (skip) return
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      let url = `/api/astrology/daily-guidance?day=${iso}&tz=${encodeURIComponent(tz)}${force ? '&refresh=1' : ''}`
      if (sky[i]?.isToday) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sky])

  // Open the selected day's reading, then quietly prepare the rest one by one.
  useEffect(() => {
    if (sky.length === 0) return
    const order = [sel, ...[0, 1, 2, 3, 4, 5, 6].filter(i => i !== sel)]
    const timers = order.map((i, n) => setTimeout(() => loadDay(i), n === 0 ? 0 : 4000 + (n - 1) * 5000))
    return () => timers.forEach(clearTimeout)
  }, [sky, sel, loadDay])

  // Kaleb's saved birth details live on this device; look him up once.
  useEffect(() => {
    const t = setTimeout(() => {
      const k = getSavedPeople().find(p => /kaleb/i.test(p.name)) ?? null
      setKaleb(k)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  // The selected day's "what to say" for Kaleb.
  useEffect(() => {
    const day = sky[sel]
    if (!kaleb || !day) return
    if (kalebDays[day.iso] && kalebDays[day.iso] !== 'error') return
    let live = true
    const t = setTimeout(async () => {
      setKalebDays(prev => ({ ...prev, [day.iso]: 'loading' }))
      try {
        const r = await fetch('/api/astrology/connection-day', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: kaleb.name, relationship: kaleb.relationship, birthDate: kaleb.birthDate, birthTime: kaleb.birthTime, birthTimezone: kaleb.birthTimezone, knownMoonSign: kaleb.knownMoonSign, day: day.iso }),
        })
        if (!r.ok) throw new Error()
        const d = await r.json()
        if (live) setKalebDays(prev => ({ ...prev, [day.iso]: d }))
      } catch { if (live) setKalebDays(prev => ({ ...prev, [day.iso]: 'error' })) }
    }, 400)
    return () => { live = false; clearTimeout(t) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kaleb, sky, sel])

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

            {/* Real dates, for confirmation */}
            {sky.length > 0 && (
              <div style={{ ...GLASS, padding: 16, marginBottom: 14 }}>
                <Label text="This forecast is for" color="#5C4530" />
                <p style={{ fontSize: 17, fontWeight: 700, color: '#100C1E', margin: '0 0 2px' }}>
                  {sky[0].weekday}, {sky[0].dateLabel} → {sky[sky.length - 1].weekday}, {sky[sky.length - 1].dateLabel}, {sky[0].iso.slice(0, 4)}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.5)', margin: '0 0 10px' }}>
                  Seven days starting today. Nothing here is about the past.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {sky.map((d, i) => (
                    <button key={d.iso} onClick={() => setSel(i)}
                      style={{ padding: '6px 0', borderRadius: 10, border: sel === i ? '1px solid #5C4530' : '1px solid rgba(180,150,100,0.2)',
                        background: sel === i ? 'rgba(92,69,48,0.12)' : 'transparent', cursor: 'pointer', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: 10, color: 'rgba(16,12,30,0.55)' }}>{d.weekday.slice(0, 3)}</span>
                      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#100C1E' }}>{d.dateLabel.replace(/^[A-Za-z]+ /, '')}</span>
                      <span style={{ display: 'block', fontSize: 9, color: 'rgba(16,12,30,0.45)' }}>{d.dateLabel.slice(0, 3)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Week overview card */}
            {!loading && forecast && (
              <div style={{ ...GLASS, padding: 18, marginBottom: 16, background: 'linear-gradient(135deg, rgba(247,238,220,0.95), rgba(240,228,198,0.92))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Sparkles className="h-4 w-4" style={{ color: '#5C4530' }} />
                  <Label text="This Week's Theme" color="#5C4530" />
                </div>
                <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.9)', lineHeight: 1.6, marginBottom: 14 }}>{forecast.week_theme}</p>

                {forecast.love_week && (
                  <div style={{ marginBottom: 14, padding: 14, borderRadius: 16, background: 'rgba(200,120,160,0.1)', border: '1px solid rgba(200,120,160,0.22)' }}>
                    <Label text="Love and romance this week" color="rgb(170,70,115)" />
                    <p style={{ fontSize: 13.5, color: 'rgba(16,12,30,0.88)', lineHeight: 1.65, margin: '0 0 8px' }}>{forecast.love_week.arc}</p>
                    <p style={{ fontSize: 13.5, color: 'rgba(16,12,30,0.88)', lineHeight: 1.65, margin: '0 0 8px' }}><strong>The Kaleb situation:</strong> {forecast.love_week.kaleb}</p>
                    {forecast.love_week.do?.map((x, i) => (
                      <p key={i} style={{ fontSize: 13.5, color: 'rgba(16,12,30,0.88)', lineHeight: 1.6, margin: '0 0 4px' }}>{i + 1}. {x}</p>
                    ))}
                    <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.65)', lineHeight: 1.6, margin: '8px 0 0' }}><strong>Watch for:</strong> {forecast.love_week.watch}</p>
                  </div>
                )}

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

            {/* Day tabs: real weekdays and dates, calculated */}
            {sky.length === 0 && loading ? (
              <><Shimmer h={60} /><Shimmer h={300} /></>
            ) : sky.length > 0 ? (
              <div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 0 10px', scrollbarWidth: 'none' }}>
                  {sky.map((d, i) => {
                    const on = sel === i
                    const r = readings[d.iso]
                    const ready = r && r !== 'loading' && r !== 'error'
                    return (
                      <button key={d.iso} onClick={() => setSel(i)}
                        style={{
                          flex: '0 0 auto', minWidth: 72, padding: '10px 12px', borderRadius: 16, cursor: 'pointer', textAlign: 'center',
                          border: on ? '1px solid #5C4530' : '1px solid rgba(180,150,100,0.25)',
                          background: on ? '#5C4530' : 'rgba(255,255,255,0.6)', color: on ? '#fff' : '#32284A',
                        }}>
                        <span style={{ display: 'block', fontSize: 11, opacity: 0.8 }}>{d.isToday ? 'Today' : d.weekday.slice(0, 3)}</span>
                        <span style={{ display: 'block', fontSize: 18, fontWeight: 700 }}>{d.iso.slice(8)}</span>
                        <span style={{ display: 'block', fontSize: 9, opacity: 0.7 }}>{ready ? 'ready' : ' '}</span>
                      </button>
                    )
                  })}
                </div>

                {(() => {
                  const day = sky[sel]
                  if (!day) return null
                  const g = readings[day.iso]
                  const headline = forecast?.day_headlines?.find(h => h.weekday === day.weekday)?.headline
                  return (
                    <div style={{ ...GLASS, padding: 18 }}>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#100C1E', margin: 0 }}>{day.weekday}</p>
                      <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)', margin: '2px 0 10px' }}>{day.dateLabel}{day.isToday ? ' · today' : ''}</p>
                      <IntensityPips value={day.intensity} />
                      <p style={{ fontSize: 11.5, color: 'rgba(16,12,30,0.5)', margin: '6px 0 0' }}>
                        Moon in {day.moon.sign}{day.moon.changesSign ? ' (just arrived)' : ''} · {day.moon.phase}{day.mercuryRetrograde ? ' · Mercury moving backward' : ''}
                      </p>
                      {headline && <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(16,12,30,0.88)', lineHeight: 1.55, marginTop: 12 }}>{headline}</p>}

                      <div style={{ marginTop: 14 }}>
                        <Label text="The sky that day, in plain words" color="#5C4530" />
                        {day.transits.length === 0 && <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.6)' }}>No strong personal transits. A steadier day.</p>}
                        {day.transits.map((t, i) => (
                          <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid rgba(180,150,100,0.15)' : 'none' }}>
                            <p style={{ fontSize: 13.5, fontWeight: 600, color: 'rgba(16,12,30,0.88)', margin: 0 }}>
                              {t.text} <span style={{ fontWeight: 400, color: 'rgba(16,12,30,0.45)' }}>({t.strength}, {t.kind})</span>
                            </p>
                            <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.7)', lineHeight: 1.55, margin: '2px 0 0' }}>{t.meaning}</p>
                          </div>
                        ))}
                      </div>

                      {(() => {
                        if (!kaleb) {
                          return (
                            <p style={{ fontSize: 12.5, color: 'rgba(16,12,30,0.55)', lineHeight: 1.55, marginTop: 14 }}>
                              Add Kaleb in Astrology → Connections (tap "Add Kaleb with these details") to see exactly what to say to him each day here.
                            </p>
                          )
                        }
                        const k = kalebDays[day.iso]
                        if (!k || k === 'loading') return <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)', marginTop: 14 }}>Writing what to say to {kaleb.name} on {day.weekday}…</p>
                        if (k === 'error') return <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)', marginTop: 14 }}>Couldn’t load the {kaleb.name} reading for this day. Switch days and come back to retry.</p>
                        return <KalebDay k={k} name={kaleb.name} />
                      })()}

                      <div style={{ borderTop: '1px solid rgba(180,150,100,0.15)', marginTop: 14 }}>
                        {!g || g === 'loading' ? (
                          <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)', padding: '16px 0' }}>Luna is writing the full reading for {day.weekday}. It takes a moment…</p>
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
                  <button disabled={sel >= sky.length - 1} onClick={() => setSel(v => Math.min(sky.length - 1, v + 1))}
                    style={{ flex: 1, padding: 13, borderRadius: 14, border: '1px solid rgba(180,150,100,0.25)', background: 'rgba(255,255,255,0.6)', color: '#32284A', fontWeight: 600, opacity: sel >= sky.length - 1 ? 0.4 : 1, cursor: 'pointer' }}>
                    Next day →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ ...GLASS, padding: 24, textAlign: 'center' }}>
                <Calendar className="h-8 w-8" style={{ color: 'rgba(16,12,30,0.2)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.4)' }}>Tap ↻ to load your week</p>
              </div>
            )}

            {/* Chart note */}
            {forecast && (
              <div style={{ ...GLASS, padding: 14, marginTop: 16, background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.35)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#5C4530', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Reading personalized to your chart</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[['☀️','Scorpio 22°'],['🌙','Cancer 4°'],['✨','Gemini Rising'],['♀','Cap Venus 2°'],['♂','Libra Mars 6°'],['☊','Cancer N.Node']].map(([e, v]) => (
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
