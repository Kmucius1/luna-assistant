'use client'
import { useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Moon, Clock, Home, Sparkles } from 'lucide-react'
import { NIGHT_REMINDERS } from '@/lib/luna/reminders'

const LOCATIONS = [
  { value: 'home',         label: '🏠 Home',         drive: 0  },
  { value: 'office',       label: '🏢 Office',       drive: 20 },
  { value: 'kalebs',       label: '💜 Kaleb\'s',     drive: 15 },
  { value: 'friends',      label: '👯 Friends\'',    drive: 25 },
  { value: 'out',          label: '✨ Out',           drive: 30 },
  { value: 'working_late', label: '💼 Working late', drive: 20 },
]

const RITUAL_ITEMS = [
  { emoji: '🕯', label: 'Dim lights and soften the room', mins: 5  },
  { emoji: '📵', label: 'Close work apps and tabs',        mins: 5  },
  { emoji: '📓', label: 'Journal what you\'re releasing',  mins: 10 },
  { emoji: '🧖', label: 'Skincare — love your face',       mins: 10 },
  { emoji: '💧', label: 'One last glass of water',         mins: 3  },
  { emoji: '🙏', label: 'Close the loops in your mind',    mins: 7  },
]

// Optional, un-timed — logistics for tomorrow, not part of the wind-down
// ritual above. Kept as a separate checklist/state so it doesn't compete
// with the timed ritual sequence.
const PREP_ITEMS = [
  { emoji: '🏋️', label: 'Lay out gym clothes' },
  { emoji: '👔', label: 'Lay out work outfit' },
  { emoji: '🚿', label: 'Prep towel and shower items' },
  { emoji: '🔌', label: 'Charge devices' },
  { emoji: '👜', label: 'Pack work bag' },
  { emoji: '🍗', label: 'Prep protein for tomorrow' },
  { emoji: '🥣', label: 'Decide breakfast' },
  { emoji: '🤝', label: 'Prep anything needed for an in-person meeting' },
]

function timeToMinutes(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const m = ((mins % 1440) + 1440) % 1440 % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function minutesToInput(mins: number): string {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const m = ((mins % 1440) + 1440) % 1440 % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

interface Plan {
  stopWorkTime: string
  leaveTime: string | null
  homeTime: string | null
  bedTime: string
  bedMinRaw: number
  lightsOutTime: string
  message: string
}

type Tab = 'sleep' | 'tomorrow' | 'ritual'

const TABS: { value: Tab; label: string; emoji: string }[] = [
  { value: 'sleep',    label: 'Sleep',    emoji: '🌙' },
  { value: 'tomorrow', label: 'Tomorrow', emoji: '☀️' },
  { value: 'ritual',   label: 'Ritual',   emoji: '🕯' },
]

// Sleep cycle math — 90-min cycles + 15 min to fall asleep
function getSleepCycles(wakeMins: number): { label: string; time: string; cycles: number; hrs: string }[] {
  const FALL_ASLEEP = 15
  const results = []
  for (let cycles = 6; cycles >= 3; cycles--) {
    const sleepMins = wakeMins - cycles * 90 - FALL_ASLEEP
    results.push({
      label:  `${cycles} cycles`,
      time:   minutesToTime(sleepMins),
      cycles,
      hrs:    `${(cycles * 1.5).toFixed(1)}h`,
    })
  }
  return results
}

function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export default function NightScreen() {
  const [tab, setTab]                     = useState<Tab>('sleep')
  const [wakeGoal, setWakeGoal]           = useState('08:00')
  const [sleepHours, setSleepHours]       = useState(8)
  const [location, setLocation]           = useState('home')
  const [prepMinutes, setPrepMinutes]     = useState(45)
  const [firstMeeting, setFirstMeeting]   = useState('')
  const [plan, setPlan]                   = useState<Plan | null>(null)
  const [checked, setChecked]             = useState<Set<number>>(new Set())
  const [prepChecked, setPrepChecked]     = useState<Set<number>>(new Set())
  const [manualRitual, setManualRitual]   = useState(() => {
    const now = new Date()
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
  })

  // Live calculation — always treat wake time as the NEXT future occurrence
  const nowMin       = nowMinutes()
  const rawWakeMin   = wakeGoal ? timeToMinutes(wakeGoal) : 8 * 60
  // If wake time has already passed today, it means tomorrow morning
  const minsUntilWake = rawWakeMin > nowMin ? rawWakeMin - nowMin : rawWakeMin + 1440 - nowMin
  // Absolute wake time in minutes from NOW (not from midnight)
  const wakeAbsolute = nowMin + minsUntilWake

  // Max sleep possible = time until wake minus 15 min to fall asleep, floored to nearest 0.5h
  const maxSleepHours = Math.max(1, Math.floor((minsUntilWake - 15) / 30) * 0.5)
  // Clamp the selected sleep hours to what's actually possible
  const clampedSleepHours = Math.min(sleepHours, maxSleepHours)

  const liveSleepMin = wakeAbsolute - Math.round(clampedSleepHours * 60)
  const liveBedMin   = liveSleepMin - 15
  const minsUntilBed = liveBedMin - nowMin   // negative = should be in bed now
  const liveTimeStr  = minutesToTime(liveSleepMin)
  const liveBedStr   = minutesToTime(liveBedMin)
  const sleepCycles  = getSleepCycles(wakeAbsolute)

  const calculate = useCallback(() => {
    const _now        = nowMinutes()
    const _raw        = timeToMinutes(wakeGoal)
    const _until      = _raw > _now ? _raw - _now : _raw + 1440 - _now
    const wakeMin     = _now + _until
    const lightsOut   = wakeMin - sleepHours * 60
    const bedMin      = lightsOut - prepMinutes
    const loc         = LOCATIONS.find(l => l.value === location)
    const driveMin    = loc?.drive ?? 0
    const leaveMin    = driveMin > 0 ? lightsOut - driveMin - 15 : null
    const homeMin     = leaveMin !== null ? leaveMin + driveMin : null
    const stopWorkMin = (leaveMin ?? lightsOut) - 15

    let message = `Your lights-out is ${minutesToTime(lightsOut)}.`
    if (leaveMin !== null) {
      message = `Leave by ${minutesToTime(leaveMin)} to be home before ${minutesToTime(homeMin!)}. Lights out by ${minutesToTime(lightsOut)}.`
    }
    if (driveMin === 0) {
      message = `Stop work by ${minutesToTime(stopWorkMin)} and begin your wind-down. Lights out by ${minutesToTime(lightsOut)}.`
    }

    setPlan({
      stopWorkTime:  minutesToTime(stopWorkMin),
      leaveTime:     leaveMin !== null ? minutesToTime(leaveMin) : null,
      homeTime:      homeMin !== null  ? minutesToTime(homeMin)  : null,
      bedTime:       minutesToTime(bedMin),
      bedMinRaw:     bedMin,
      lightsOutTime: minutesToTime(lightsOut),
      message,
    })
    setManualRitual(minutesToInput(bedMin))
    setTab('tomorrow')
  }, [wakeGoal, sleepHours, location, prepMinutes])

  function toggleCheck(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function togglePrepCheck(i: number) {
    setPrepChecked(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const card = {
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(180,150,100,0.18)',
    borderRadius: 20,
    boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
  }

  const selectedLocStyle = (val: string) => ({
    background: location === val ? 'rgba(244,235,212,0.9)' : 'rgba(255,255,255,0.55)',
    border: `1.5px solid ${location === val ? 'rgba(201,169,110,0.45)' : 'rgba(180,150,100,0.16)'}`,
    color: '#100C1E',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left' as const,
  })

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)' }}
    >
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(240,228,200,0.92)' }}>
              <Moon className="h-5 w-5" style={{ color: '#5C4530' }} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#F5EFE3' }}>Night Mode</p>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: '#F5EFE3' }}>
            Protect tomorrow.
          </h1>
          <p className="text-base mb-6" style={{ color: 'rgba(245,239,227,0.72)' }}>
            Your morning starts tonight.
          </p>

          {/* Today's reminders */}
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,150,100,0.16)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#5C4530' }}>
              Tonight&apos;s Reminders
            </p>
            <div className="space-y-2">
              {NIGHT_REMINDERS.map(r => (
                <p key={r.id} className="text-sm" style={{ color: '#32284A' }}>{r.label}</p>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {TABS.map(t => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  background: tab === t.value ? 'rgba(244,235,212,0.9)' : 'rgba(255,255,255,0.55)',
                  border: `1.5px solid ${tab === t.value ? 'rgba(201,169,110,0.45)' : 'rgba(180,150,100,0.16)'}`,
                  color: '#100C1E',
                }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* ── Sleep tab ── */}
          {tab === 'sleep' && (
            <div className="space-y-4 animate-fade-up">

              <div style={card} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4" style={{ color: '#5C4530' }} />
                  <p className="text-sm font-semibold" style={{ color: '#100C1E' }}>What time do you want to wake up?</p>
                </div>
                <input type="time" value={wakeGoal} onChange={e => setWakeGoal(e.target.value)}
                  className="text-3xl font-display font-bold bg-transparent outline-none w-full"
                  style={{ color: '#100C1E', colorScheme: 'light' }} />
              </div>

              <div style={card} className="p-5">
                <p className="text-sm font-semibold mb-3" style={{ color: '#100C1E' }}>
                  Sleep goal: <span style={{ color: '#5C4530' }}>{clampedSleepHours}h</span>
                  {clampedSleepHours < sleepHours && (
                    <span style={{ fontSize: 11, color: '#5E5474', marginLeft: 6 }}>
                      (max available before {minutesToTime(rawWakeMin)})
                    </span>
                  )}
                </p>
                <input type="range" min={1} max={maxSleepHours} step={0.5} value={clampedSleepHours}
                  onChange={e => setSleepHours(Number(e.target.value))} />
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: '#5E5474' }}>1h</span>
                  <span className="text-xs" style={{ color: '#5E5474' }}>{maxSleepHours}h max</span>
                </div>
              </div>

              {/* ── Live bedtime result ── */}
              {wakeGoal && (
                <div style={{ borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(145deg, rgba(247,238,220,0.95) 0%, rgba(240,228,200,0.93) 100%)', border: '1.5px solid rgba(201,169,110,0.45)' }}>
                  <div style={{ padding: '18px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5C4530', marginBottom: 6 }}>
                      Asleep by — for {clampedSleepHours}h
                    </p>
                    {minsUntilBed <= 0 ? (
                      <>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: '#100C1E', lineHeight: 1, marginBottom: 6 }}>
                          Get in bed now
                        </p>
                        <p style={{ fontSize: 13, color: '#32284A' }}>
                          You&apos;ll wake at <span style={{ color: '#100C1E', fontWeight: 700 }}>{minutesToTime(rawWakeMin)}</span> with {clampedSleepHours}h of sleep
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: '#100C1E', lineHeight: 1, marginBottom: 4 }}>
                          {liveTimeStr}
                        </p>
                        <p style={{ fontSize: 13, color: '#32284A' }}>
                          In bed by <span style={{ color: '#100C1E', fontWeight: 700 }}>{liveBedStr}</span>
                          {' · '}
                          {(() => {
                            const h = Math.floor(minsUntilBed / 60)
                            const m = minsUntilBed % 60
                            return h > 0 ? `${h}h ${m}m from now` : `${m}m from now`
                          })()}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Sleep cycle options — only show future ones */}
                  <div style={{ borderTop: '1px solid rgba(201,169,110,0.2)', padding: '12px 16px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A6D3B', marginBottom: 10 }}>
                      Sleep cycle options (90-min cycles)
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {sleepCycles.filter(c => {
                        // Only show cycles where bed time is in the future
                        const bedMins = wakeAbsolute - c.cycles * 90 - 15
                        return bedMins >= nowMin
                      }).map(c => {
                        const isBest = c.cycles === 5 || c.cycles === 4
                        return (
                          <div key={c.cycles} style={{ flex: 1, textAlign: 'center', padding: '8px 6px', borderRadius: 12, background: isBest ? 'rgba(201,169,110,0.22)' : 'rgba(255,255,255,0.5)', border: `1px solid ${isBest ? 'rgba(201,169,110,0.4)' : 'rgba(180,150,100,0.14)'}` }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: isBest ? '#100C1E' : '#5E5474' }}>{c.time}</p>
                            <p style={{ fontSize: 10, color: '#5E5474', marginTop: 2 }}>{c.hrs}</p>
                          </div>
                        )
                      })}
                    </div>
                    <p style={{ fontSize: 10, color: '#5E5474', marginTop: 8, textAlign: 'center' }}>
                      +15 min to fall asleep included
                    </p>
                  </div>
                </div>
              )}

              <div style={card} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="h-4 w-4" style={{ color: '#5C4530' }} />
                  <p className="text-sm font-semibold" style={{ color: '#100C1E' }}>Where are you right now?</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LOCATIONS.map(l => (
                    <button key={l.value} onClick={() => setLocation(l.value)} style={selectedLocStyle(l.value)}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={card} className="p-5">
                <p className="text-sm font-semibold mb-3" style={{ color: '#100C1E' }}>
                  Bedtime prep time: <span style={{ color: '#5C4530' }}>{prepMinutes} min</span>
                </p>
                <input type="range" min={15} max={90} step={5} value={prepMinutes}
                  onChange={e => setPrepMinutes(Number(e.target.value))} />
                <p className="text-xs mt-2" style={{ color: '#5E5474' }}>skincare · journal · wind-down</p>
              </div>

              <div style={card} className="p-5">
                <p className="text-sm font-semibold mb-3" style={{ color: '#100C1E' }}>First meeting tomorrow? <span style={{ color: '#5E5474' }}>(optional)</span></p>
                <input type="time" value={firstMeeting} onChange={e => setFirstMeeting(e.target.value)}
                  className="bg-transparent outline-none text-2xl font-display font-bold w-full"
                  style={{ color: '#100C1E', colorScheme: 'light' }} />
              </div>

              <button onClick={calculate}
                className="w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #5C4530 0%, #B08D52 100%)', fontSize: '1rem' }}>
                <Sparkles className="inline h-4 w-4 mr-2" />
                Calculate my night
              </button>
            </div>
          )}

          {/* ── Tomorrow tab ── */}
          {tab === 'tomorrow' && (
            <div className="space-y-4 animate-fade-up">
              {!plan ? (
                <div className="text-center py-12">
                  <span className="text-5xl block mb-4">🌙</span>
                  <p className="text-base font-semibold mb-2" style={{ color: '#F5EFE3' }}>Fill in Sleep first</p>
                  <p className="text-sm" style={{ color: 'rgba(245,239,227,0.72)' }}>Go to the Sleep tab and calculate your night.</p>
                  <button onClick={() => setTab('sleep')} className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(244,235,212,0.9)', color: '#100C1E', border: '1px solid rgba(201,169,110,0.35)' }}>
                    Set up sleep
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ ...card, padding: 20, textAlign: 'center' }}>
                    <p className="text-base font-medium leading-relaxed" style={{ color: '#100C1E' }}>{plan.message}</p>
                    <p className="mt-3 font-display italic" style={{ color: '#8A6D3B' }}>
                      &ldquo;Tomorrow-you is asking for rest.&rdquo;
                    </p>
                  </div>

                  {[
                    { label: '🛑 Stop work',  value: plan.stopWorkTime,  show: true },
                    { label: '🚗 Leave by',   value: plan.leaveTime,     show: !!plan.leaveTime },
                    { label: '🏠 Home by',    value: plan.homeTime,      show: !!plan.homeTime },
                    { label: '🌙 Begin prep', value: plan.bedTime,       show: true },
                    { label: '✨ Lights out', value: plan.lightsOutTime, show: true },
                  ].filter(r => r.show).map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl"
                      style={card}>
                      <span className="text-base" style={{ color: '#32284A' }}>{row.label}</span>
                      <span className="font-display text-2xl font-bold" style={{ color: '#100C1E' }}>{row.value}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Ritual tab ── */}
          {tab === 'ritual' && (
            <div className="space-y-3 animate-fade-up">

              {/* Start time picker */}
              <div style={card} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{ color: '#5E5474' }}>
                    Ritual starts at
                  </p>
                  <p className="text-xs" style={{ color: '#5E5474' }}>
                    {plan ? 'Auto-set from Sleep plan' : 'Set your start time'}
                  </p>
                </div>
                <input
                  type="time"
                  value={manualRitual}
                  onChange={e => setManualRitual(e.target.value)}
                  className="bg-transparent outline-none font-display text-2xl font-bold text-right"
                  style={{ color: '#100C1E', colorScheme: 'light', width: 110 }}
                />
              </div>

              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(245,239,227,0.72)' }}>
                Night Ritual Checklist
              </p>

              {/* Timed checklist */}
              {(() => {
                const startMin = timeToMinutes(manualRitual)
                let cursor = startMin
                return RITUAL_ITEMS.map((item, i) => {
                  const itemTime = minutesToTime(cursor)
                  cursor += item.mins
                  const done = checked.has(i)
                  return (
                    <button key={i} onClick={() => toggleCheck(i)}
                      className="w-full text-left rounded-2xl transition-all flex items-center gap-4 overflow-hidden"
                      style={{
                        background: done ? 'rgba(240,228,200,0.92)' : 'rgba(255,255,255,0.55)',
                        border: `1.5px solid ${done ? 'rgba(201,169,110,0.4)' : 'rgba(180,150,100,0.16)'}`,
                        opacity: done ? 0.72 : 1,
                        transition: 'all 0.2s ease',
                      }}>

                      {/* Time stripe */}
                      <div className="flex flex-col items-center justify-center flex-shrink-0 self-stretch px-3 py-4"
                        style={{
                          background: done ? 'rgba(201,169,110,0.22)' : 'rgba(255,255,255,0.4)',
                          borderRight: '1px solid rgba(180,150,100,0.14)',
                          minWidth: 72,
                        }}>
                        <span className="font-display text-sm font-bold tabular-nums"
                          style={{ color: done ? '#100C1E' : '#5E5474' }}>
                          {itemTime}
                        </span>
                        <span className="text-xs mt-0.5"
                          style={{ color: '#5E5474', fontSize: 10 }}>
                          {item.mins} min
                        </span>
                      </div>

                      {/* Checkbox + label */}
                      <div className="flex items-center gap-3 flex-1 py-4 pr-4">
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                          style={{
                            background: done ? '#5C4530' : 'rgba(255,255,255,0.6)',
                            border: `1.5px solid ${done ? '#5C4530' : 'rgba(180,150,100,0.25)'}`,
                          }}>
                          {done && <span className="text-white font-bold" style={{ fontSize: 10 }}>✓</span>}
                        </div>
                        <div>
                          <span className="text-base leading-snug" style={{
                            color: '#100C1E',
                            textDecoration: done ? 'line-through' : 'none',
                            display: 'block',
                          }}>
                            {item.emoji} {item.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })
              })()}

              {/* Tomorrow's prep — optional, un-timed */}
              <p className="text-xs font-bold uppercase tracking-widest mt-2" style={{ color: 'rgba(245,239,227,0.72)' }}>
                Tomorrow&apos;s Prep <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PREP_ITEMS.map((item, i) => {
                  const done = prepChecked.has(i)
                  return (
                    <button key={i} onClick={() => togglePrepCheck(i)}
                      className="text-left rounded-2xl transition-all flex items-center gap-2.5 px-3 py-3"
                      style={{
                        background: done ? 'rgba(240,228,200,0.92)' : 'rgba(255,255,255,0.55)',
                        border: `1.5px solid ${done ? 'rgba(201,169,110,0.4)' : 'rgba(180,150,100,0.16)'}`,
                        opacity: done ? 0.72 : 1,
                      }}>
                      <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{
                          background: done ? '#5C4530' : 'rgba(255,255,255,0.6)',
                          border: `1.5px solid ${done ? '#5C4530' : 'rgba(180,150,100,0.25)'}`,
                        }}>
                        {done && <span className="text-white font-bold" style={{ fontSize: 9 }}>✓</span>}
                      </div>
                      <span className="text-xs leading-snug" style={{ color: '#100C1E', textDecoration: done ? 'line-through' : 'none' }}>
                        {item.emoji} {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Lights-out indicator */}
              {plan && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.35)' }}>
                  <span className="text-lg">✨</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#100C1E' }}>
                      Lights out: {plan.lightsOutTime}
                    </p>
                    <p className="text-xs" style={{ color: '#5E5474' }}>
                      Wake: {wakeGoal ? (() => { const m=timeToMinutes(wakeGoal); return minutesToTime(m) })() : '—'} · {sleepHours}h sleep
                    </p>
                  </div>
                </div>
              )}

              {checked.size === RITUAL_ITEMS.length && (
                <div className="text-center py-6">
                  <span className="text-4xl block mb-2">🌙</span>
                  <p className="font-display text-lg italic" style={{ color: '#8A6D3B' }}>
                    You are ready for rest. Sleep well.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
