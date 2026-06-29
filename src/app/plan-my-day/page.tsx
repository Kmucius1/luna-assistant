'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sparkles, RefreshCw, ArrowLeft, Clock, Home, Building2, Droplets } from 'lucide-react'
import Link from 'next/link'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  morning:  { bg: 'rgba(201,169,110,0.10)', color: '#C9A96E',  dot: '#C9A96E' },
  work:     { bg: 'rgba(90,138,164,0.10)',  color: '#7BAEC8',  dot: '#7BAEC8' },
  break:    { bg: 'rgba(90,138,90,0.10)',   color: '#8AB88A',  dot: '#8AB88A' },
  personal: { bg: 'rgba(200,120,160,0.10)', color: '#DC82AA',  dot: '#DC82AA' },
  evening:  { bg: 'rgba(139,111,184,0.10)', color: '#8B6FB8',  dot: '#8B6FB8' },
  night:    { bg: 'rgba(80,60,120,0.12)',   color: '#A090D0',  dot: '#A090D0' },
  commute:  { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', dot: 'rgba(255,255,255,0.3)' },
}

interface ScheduleBlock {
  time:   string
  label:  string
  detail?: string
  type:   string
  anchor?: boolean
  emoji?: string
}

interface DayPlan {
  day_energy:   string
  ai_message:   string
  key_anchors: {
    wake:       string
    out_door:   string | null
    at_work:    string
    lunch:      string
    leave_work: string
    wind_down:  string
    lights_out: string
  }
  schedule: ScheduleBlock[]
}

const WAKE_TIMES = ['6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM']
const END_TIMES  = ['4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM']

export default function PlanMyDayPage() {
  const [wakeTime,     setWakeTime]     = useState('7:30 AM')
  const [location,     setLocation]     = useState<'home'|'office'>('home')
  const [workEndTime,  setWorkEndTime]  = useState('6:00 PM')
  const [hairWashDay,  setHairWashDay]  = useState(false)
  const [eveningPlans, setEveningPlans] = useState('')
  const [loading,      setLoading]      = useState(false)
  const [plan,         setPlan]         = useState<DayPlan | null>(null)
  const [error,        setError]        = useState('')

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  async function generate() {
    setLoading(true); setError(''); setPlan(null)
    try {
      const res = await fetch('/api/ai/plan-my-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wakeTime, location, workEndTime, hairWashDay, eveningPlans }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.detail ?? data.error)
      setPlan(data)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Something went wrong.'
      setError(raw.toLowerCase().includes('credit') || raw.includes('LUNA_AI') || raw.includes('overload')
        ? 'LUNA is taking a breath — try again in a moment.'
        : raw)
    } finally {
      setLoading(false)
    }
  }

  const anchors = plan?.key_anchors

  return (
    <div className="min-h-screen bg-app overflow-x-hidden">
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(160deg, rgba(139,111,184,0.18) 0%, rgba(90,63,136,0.1) 50%, transparent 100%)', padding: '20px 20px 24px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(139,111,184,0.15)', border: '1px solid rgba(139,111,184,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock className="h-5 w-5" style={{ color: '#8B6FB8' }} />
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'white' }}>Plan My Day</h1>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{today}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Full schedule — wake to sleep, with your real DRYP tasks built in.
            </p>
          </div>

          <div style={{ padding: '16px 16px 0' }}>

            {/* Setup card */}
            {!plan && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>

                {/* Wake time */}
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Wake up time</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {WAKE_TIMES.map(t => (
                      <button key={t} onClick={() => setWakeTime(t)} style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: wakeTime === t ? 'rgba(201,169,110,0.18)' : 'rgba(255,255,255,0.05)',
                        border: wakeTime === t ? '1.5px solid rgba(201,169,110,0.45)' : '1px solid rgba(255,255,255,0.08)',
                        color: wakeTime === t ? '#C9A96E' : 'rgba(255,255,255,0.45)',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Where are you working?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([
                      { v: 'home',   label: 'Work from home', icon: <Home className="h-3.5 w-3.5" /> },
                      { v: 'office', label: 'Going to office', icon: <Building2 className="h-3.5 w-3.5" /> },
                    ] as { v: 'home'|'office'; label: string; icon: React.ReactNode }[]).map(opt => (
                      <button key={opt.v} onClick={() => setLocation(opt.v)} style={{
                        flex: 1, padding: '11px 8px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: location === opt.v ? 'rgba(139,111,184,0.15)' : 'rgba(255,255,255,0.04)',
                        border: location === opt.v ? '1.5px solid rgba(139,111,184,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        color: location === opt.v ? '#8B6FB8' : 'rgba(255,255,255,0.4)',
                      }}>{opt.icon}{opt.label}</button>
                    ))}
                  </div>
                </div>

                {/* End time */}
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Done with work by</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {END_TIMES.map(t => (
                      <button key={t} onClick={() => setWorkEndTime(t)} style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: workEndTime === t ? 'rgba(90,138,164,0.18)' : 'rgba(255,255,255,0.05)',
                        border: workEndTime === t ? '1.5px solid rgba(90,138,164,0.45)' : '1px solid rgba(255,255,255,0.08)',
                        color: workEndTime === t ? '#7BAEC8' : 'rgba(255,255,255,0.45)',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Hair wash day */}
                <button onClick={() => setHairWashDay(v => !v)} style={{
                  ...GLASS, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                  background: hairWashDay ? 'rgba(90,168,164,0.1)' : 'rgba(255,255,255,0.04)',
                  border: hairWashDay ? '1.5px solid rgba(90,168,164,0.35)' : '1px solid rgba(255,255,255,0.09)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Droplets className="h-4 w-4" style={{ color: hairWashDay ? '#5AA8A4' : 'rgba(255,255,255,0.3)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: hairWashDay ? 'white' : 'rgba(255,255,255,0.6)' }}>Hair wash day</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Adds 20 mins to your morning for perm care</p>
                    </div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hairWashDay ? '#5AA8A4' : 'rgba(255,255,255,0.07)', border: hairWashDay ? 'none' : '1.5px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                    {hairWashDay && <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                </button>

                {/* Evening plans */}
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Evening plans (optional)</p>
                  <input
                    value={eveningPlans}
                    onChange={e => setEveningPlans(e.target.value)}
                    placeholder="dinner out, gym, date night, errands…"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <button onClick={generate} style={{
                  width: '100%', padding: '16px 0', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #8B6FB8, #5A3F88)',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 6px 24px rgba(139,111,184,0.35)',
                }}>
                  <Sparkles className="h-5 w-5" /> Build my full day
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ ...GLASS, padding: 32, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(139,111,184,0.12)', border: '1px solid rgba(139,111,184,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <RefreshCw className="h-6 w-6 animate-spin" style={{ color: '#8B6FB8' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'white', marginBottom: 6 }}>Building your full day…</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Pulling your DRYP tasks and mapping your schedule</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ ...GLASS, padding: 18, background: 'rgba(224,94,94,0.07)', border: '1px solid rgba(224,94,94,0.2)', marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: '#E05E5E' }}>{error}</p>
                <button onClick={generate} style={{ marginTop: 10, fontSize: 12, color: '#E05E5E', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Try again →</button>
              </div>
            )}

            {/* Plan output */}
            {plan && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* LUNA message */}
                {plan.ai_message && (
                  <div style={{ ...GLASS, padding: 18, background: 'rgba(139,111,184,0.08)', border: '1px solid rgba(139,111,184,0.2)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>🌙</span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#8B6FB8', marginBottom: 4 }}>LUNA</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65 }}>{plan.ai_message}</p>
                        {plan.day_energy && (
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6, fontStyle: 'italic' }}>{plan.day_energy}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Key anchor times */}
                {anchors && (
                  <div style={{ ...GLASS, padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Today&apos;s anchors</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Wake up',     time: anchors.wake,       emoji: '☀️', color: '#C9A96E' },
                        { label: 'Start work',  time: anchors.at_work,    emoji: '💻', color: '#7BAEC8' },
                        { label: 'Lunch',       time: anchors.lunch,      emoji: '🍽️', color: '#8AB88A' },
                        { label: 'Leave work',  time: anchors.leave_work, emoji: '🏁', color: '#8B6FB8' },
                        { label: 'Wind down',   time: anchors.wind_down,  emoji: '🌙', color: '#A090D0' },
                        { label: 'Lights out',  time: anchors.lights_out, emoji: '💤', color: 'rgba(255,255,255,0.35)' },
                        ...(anchors.out_door ? [{ label: 'Out the door', time: anchors.out_door, emoji: '🚗', color: '#DC82AA' }] : []),
                      ].filter(a => a.time && a.time !== 'null').map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{a.emoji}</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.time}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{a.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full timeline */}
                {plan.schedule?.length > 0 && (
                  <div style={{ ...GLASS, padding: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Full schedule</p>
                    <div style={{ position: 'relative' }}>
                      {/* Vertical line */}
                      <div style={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 1, background: 'rgba(255,255,255,0.06)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {plan.schedule.map((block, i) => {
                          const style = TYPE_STYLE[block.type] ?? TYPE_STYLE.work
                          const isAnchor = block.anchor
                          return (
                            <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 14 }}>
                              {/* Dot on timeline */}
                              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                                <div style={{ width: isAnchor ? 14 : 10, height: isAnchor ? 14 : 10, borderRadius: '50%', background: isAnchor ? style.dot : 'rgba(255,255,255,0.15)', border: isAnchor ? `2px solid ${style.dot}` : '1.5px solid rgba(255,255,255,0.15)', flexShrink: 0, zIndex: 1, marginLeft: isAnchor ? -2 : 0 }} />
                              </div>
                              {/* Content */}
                              <div style={{ flex: 1, paddingBottom: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: block.detail ? 3 : 0 }}>
                                  <span style={{ fontSize: isAnchor ? 12 : 11, fontWeight: 700, color: style.color, flexShrink: 0, minWidth: 54 }}>{block.time}</span>
                                  <span style={{ fontSize: 14, flexShrink: 0 }}>{block.emoji ?? ''}</span>
                                  <p style={{ fontSize: isAnchor ? 14 : 13, fontWeight: isAnchor ? 700 : 500, color: isAnchor ? 'white' : 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{block.label}</p>
                                </div>
                                {block.detail && (
                                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, marginLeft: 62 }}>{block.detail}</p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Regenerate + reset */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={generate} style={{ flex: 1, padding: '13px 0', borderRadius: 16, border: '1px solid rgba(139,111,184,0.25)', cursor: 'pointer', background: 'rgba(139,111,184,0.08)', color: '#8B6FB8', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </button>
                  <button onClick={() => { setPlan(null); setError('') }} style={{ flex: 1, padding: '13px 0', borderRadius: 16, border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600 }}>
                    Change setup
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
