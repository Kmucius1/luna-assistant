'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sparkles, RefreshCw, ArrowLeft, ChevronLeft, ArrowRight, Clock, Home, Building2, Droplets, Dumbbell, Mail, ShirtIcon } from 'lucide-react'
import Link from 'next/link'
import { SmartInput } from '@/components/ui/SmartInput'
import { YesNoChoice, ChoiceGrid } from '@/components/ui/ChoiceButton'
import { MOVEMENT_ALTERNATIVES, REST_OPTION, movementLabel, type MovementChoice } from '@/lib/luna/movementAlternatives'
import { OCCASION_LABEL, type OutfitOccasion } from '@/lib/luna/outfitOccasion'
import { ZOE_WORK_LOCATION_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import styles from './plan-my-day.module.css'

const GLASS: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const PALETTE = {
  '--violet': '#5C4530',
  '--violet-deep': '#B08D52',
  '--violet-pale': '#F5EBD3',
  '--depth': '#100C1E',
  '--mid': '#32284A',
  '--mist': '#5E5474',
  '--app-bg-from': '#FBF8F2',
  '--app-bg-mid': '#F6F1E7',
  '--app-bg-to': '#F0E9DA',
} as React.CSSProperties

const TYPE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  morning:  { bg: 'rgba(201,169,110,0.12)', color: '#8A6F2A',  dot: '#5C4530' },
  work:     { bg: 'rgba(90,138,164,0.12)',  color: '#4A7A96',  dot: '#7BAEC8' },
  break:    { bg: 'rgba(90,138,90,0.12)',   color: '#5A8A5A',  dot: '#8AB88A' },
  personal: { bg: 'rgba(200,120,160,0.12)', color: '#A8496E',  dot: '#DC82AA' },
  evening:  { bg: 'rgba(201,169,110,0.12)', color: '#8A6F2A',  dot: '#5C4530' },
  night:    { bg: 'rgba(120,100,160,0.14)', color: '#6B5A96',  dot: '#A090D0' },
  commute:  { bg: 'rgba(94,84,116,0.1)',    color: 'var(--ink-3)',  dot: 'rgba(94,84,116,0.3)' },
}

interface ScheduleBlock { time: string; label: string; detail?: string; type: string; anchor?: boolean; emoji?: string }
interface CommsSummary { urgent: number; needsReview: number; drypClient: number; meetings: number; topAction: string }
interface DayPlan {
  day_energy: string
  ai_message: string
  gym_focus?: string
  occasion?: OutfitOccasion
  movement_choice?: MovementChoice
  business_focus?: string | null
  comms_summary?: CommsSummary
  key_anchors: { wake: string; gym: string | null; at_work: string; lunch: string; leave_work: string; wind_down: string; lights_out: string }
  schedule: ScheduleBlock[]
}

const WAKE_TIMES = ['5:00 AM','5:30 AM','6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM']
const GYM_TIMES  = ['5:45 AM','6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','12:00 PM','5:30 PM']
const END_TIMES  = ['4:00 PM','5:00 PM','6:00 PM','7:00 PM','8:00 PM']
const MORNING_SEQUENCE = ['Shower', 'Skincare / SPF', 'Curly hair up, bangs down', 'Gym clothes', 'Tea + breakfast']
const LATE_WAKE_THRESHOLD = '7:00 AM'

type Step = 'wake' | 'energy_mood' | 'journal' | 'movement' | 'loading' | 'result' | 'recovery'

export default function PlanMyDayPage() {
  const [step, setStep] = useState<Step>('wake')
  const [weekday, setWeekday] = useState('')

  const [wakeTime, setWakeTime] = useState('6:00 AM')
  const [location, setLocation] = useState<'home' | 'office'>('home')
  const [morningPlans, setMorningPlans] = useState('')
  const [workPlans, setWorkPlans] = useState('')
  const [workEndTime, setWorkEndTime] = useState('6:00 PM')
  const [hairWashDay, setHairWashDay] = useState(false)
  const [eveningPlans, setEveningPlans] = useState('')

  const [energy, setEnergy] = useState<number | null>(null)
  const [mood, setMood] = useState<number | null>(null)
  const [showFullCheckIn, setShowFullCheckIn] = useState(false)
  const [onMind, setOnMind] = useState('')

  const [journalUp, setJournalUp] = useState('')
  const [journalGrateful, setJournalGrateful] = useState('')
  const [journalTension, setJournalTension] = useState('')

  const [gymYes, setGymYes] = useState<boolean | null>(null)
  const [movementChoice, setMovementChoice] = useState<MovementChoice | null>(null)
  const [gymTime, setGymTime] = useState<string | null>('6:30 AM')

  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<DayPlan | null>(null)
  const [error, setError] = useState('')
  const [checkingSaved, setCheckingSaved] = useState(true)
  const [movementLogged, setMovementLogged] = useState(false)
  const [movementLogging, setMovementLogging] = useState(false)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const isSaturday = weekday === 'Saturday'

  useEffect(() => {
    const wd = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
    setWeekday(wd)
    setLocation(ZOE_WORK_LOCATION_BY_DAY[wd] ?? 'home')
  }, [])

  // If today's plan already exists, show it directly — this page is a
  // review of what's actually happening today, not a fresh form every time.
  useEffect(() => {
    fetch(`/api/home/day-plan?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      .then(r => r.json())
      .then(d => { if (d.plan) { setPlan(d.plan); setStep('result') } })
      .catch(() => {})
      .finally(() => setCheckingSaved(false))
  }, [])

  async function submitCheckIn() {
    fetch('/api/check-ins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'morning', wakeTime,
        energyRating: energy ?? 7, moodRating: mood ?? 7,
        onMind, hadDream: false, dreamText: '', feeling: '', supportNeed: '', prideGoal: '',
      }),
    }).catch(() => {})
  }

  async function logNonGymMovement() {
    if (!plan?.movement_choice || plan.movement_choice === 'gym') return
    setMovementLogging(true)
    try {
      await fetch('/api/fitness/workouts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType: plan.movement_choice,
          durationMinutes: 30,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      setMovementLogged(true)
    } finally {
      setMovementLogging(false)
    }
  }

  async function submitJournal() {
    const content = [
      journalUp && `Up and active: ${journalUp}`,
      journalGrateful && `Grateful for: ${journalGrateful}`,
      journalTension && `Tension or calm: ${journalTension}`,
    ].filter(Boolean).join('\n')
    if (!content) return
    fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_type: 'journal', content, tags: ['morning-routine'] }),
    }).catch(() => {})
  }

  async function generate() {
    setStep('loading')
    setLoading(true); setError(''); setPlan(null)
    try {
      const res = await fetch('/api/ai/plan-my-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wakeTime, gymTime: gymYes ? (gymTime ?? '') : '', location, morningPlans, workPlans, workEndTime, hairWashDay, eveningPlans,
          movementChoice: gymYes ? 'gym' : (movementChoice ?? 'rest'),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.detail ?? data.error)
      setPlan(data)
      setStep('result')
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Something went wrong.'
      setError(raw.toLowerCase().includes('credit') || raw.includes('LUNA_AI') || raw.includes('overload')
        ? 'LUNA is taking a breath — try again in a moment.'
        : raw)
      setStep('movement')
    } finally {
      setLoading(false)
    }
  }

  async function generateRecoveryMode() {
    setStep('loading')
    setLoading(true); setError(''); setPlan(null)
    try {
      const res = await fetch('/api/ai/recovery-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'Compress the morning, do not throw it away.', tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setPlan(data)
      setStep('result')
    } catch {
      setError('Could not build a compressed morning — try again in a moment.')
      setStep('recovery')
    } finally {
      setLoading(false)
    }
  }

  const anchors = plan?.key_anchors

  return (
    <div className={`min-h-screen bg-app overflow-x-hidden ${styles.page}`} style={PALETTE}>
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          <div style={{ background: 'var(--header-tint)', padding: '20px 20px 24px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--ink-3)', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(240,228,200,0.92)', border: '1px solid rgba(201,169,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock className="h-5 w-5" style={{ color: '#8A6F2A' }} />
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--ink-1)' }}>Plan My Day</h1>
                <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>{today}</p>
              </div>
            </div>
            {step === 'wake' && (
              <button onClick={generateRecoveryMode} style={{ fontSize: 12, color: 'var(--ink-3)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 4 }}>
                Rough morning? Skip to a compressed plan
              </button>
            )}
          </div>

          <div style={{ padding: '16px 16px 0' }}>

            {checkingSaved && (
              <div style={{ ...GLASS, padding: 32, textAlign: 'center', marginBottom: 16 }}>
                <RefreshCw className="h-5 w-5 animate-spin" style={{ color: '#8A6F2A', margin: '0 auto' }} />
              </div>
            )}

            {!checkingSaved && step === 'wake' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Wake up time</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {WAKE_TIMES.map(t => (
                      <button key={t} onClick={() => setWakeTime(t)} style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: wakeTime === t ? 'rgba(201,169,110,0.2)' : 'var(--surface-inactive)',
                        border: wakeTime === t ? '1.5px solid rgba(201,169,110,0.45)' : '1px solid rgba(180,150,100,0.16)',
                        color: wakeTime === t ? '#8A6F2A' : 'var(--ink-3)',
                      }}>{t}</button>
                    ))}
                  </div>
                </div>

                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Then, in order</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {MORNING_SEQUENCE.map((s, i) => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 18, height: 18, borderRadius: 9, background: 'var(--violet-pale)', color: 'var(--violet)', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8, fontStyle: 'italic' }}>Shower is the trigger — not tea, not journaling. That comes after.</p>
                </div>

                <button onClick={() => setHairWashDay(v => !v)} style={{
                  ...GLASS, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                  background: hairWashDay ? 'rgba(90,168,164,0.12)' : 'var(--surface-inactive)',
                  border: hairWashDay ? '1.5px solid rgba(90,168,164,0.35)' : '1px solid rgba(180,150,100,0.16)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Droplets className="h-4 w-4" style={{ color: hairWashDay ? '#3D7A76' : 'var(--ink-4)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: hairWashDay ? 'var(--ink-1)' : 'var(--ink-2)' }}>Hair wash day</p>
                      <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>Adds 20 mins to your morning for perm care</p>
                    </div>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: hairWashDay ? '#3D7A76' : 'var(--surface-inactive)', border: hairWashDay ? 'none' : '1.5px solid rgba(180,150,100,0.25)', flexShrink: 0 }}>
                    {hairWashDay && <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                </button>

                <button onClick={() => setStep('energy_mood')}
                  className="w-full transition-all active:scale-95"
                  style={{ padding: '16px 0', borderRadius: 20, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5C4530, #B8934A)', color: 'white', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Continue <ArrowRight className="h-4 w-4" />
                </button>

                {wakeTime > LATE_WAKE_THRESHOLD && (
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center' }}>
                    Running late? <button onClick={generateRecoveryMode} style={{ color: 'var(--violet)', fontWeight: 600, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Use a compressed morning instead</button>
                  </p>
                )}
              </div>
            )}

            {step === 'energy_mood' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Energy</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[3, 5, 7, 9].map(n => (
                      <button key={n} onClick={() => setEnergy(n)} style={{ flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: energy === n ? 'var(--violet-pale)' : 'var(--surface-inactive)', border: energy === n ? '1.5px solid var(--violet)' : '1px solid rgba(180,150,100,0.16)', color: energy === n ? 'var(--violet)' : 'var(--ink-3)' }}>{n}</button>
                    ))}
                  </div>
                </div>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Mood</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[3, 5, 7, 9].map(n => (
                      <button key={n} onClick={() => setMood(n)} style={{ flex: 1, padding: '10px 0', borderRadius: 14, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: mood === n ? 'var(--violet-pale)' : 'var(--surface-inactive)', border: mood === n ? '1.5px solid var(--violet)' : '1px solid rgba(180,150,100,0.16)', color: mood === n ? 'var(--violet)' : 'var(--ink-3)' }}>{n}</button>
                    ))}
                  </div>
                </div>

                {!showFullCheckIn ? (
                  <button onClick={() => setShowFullCheckIn(true)} style={{ fontSize: 12, color: 'var(--violet)', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}>
                    Want to say more?
                  </button>
                ) : (
                  <div style={{ ...GLASS, padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>What&apos;s on your mind?</p>
                    <SmartInput context="what is on your mind this morning" placeholder="Optional..." value={onMind} onChange={setOnMind} patternType="morning" rows={2} autoSuggest={false} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('wake')} style={{ flex: 'none', padding: '13px 18px', borderRadius: 16, border: '1px solid rgba(180,150,100,0.16)', cursor: 'pointer', background: 'var(--surface-inactive)', color: 'var(--ink-3)' }}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => { submitCheckIn(); setStep('journal') }} className="flex-1 transition-all active:scale-95" style={{ padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5C4530, #B8934A)', color: 'white', fontSize: 14, fontWeight: 700 }}>
                    Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {step === 'journal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', padding: '0 4px' }}>A short, calming journal — not another task.</p>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>You&apos;re up and active — how does that feel?</p>
                  <SmartInput context="being up and active this morning" placeholder="Speak or tap..." value={journalUp} onChange={setJournalUp} patternType="morning" rows={2} autoSuggest={false} />
                </div>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>One thing you&apos;re grateful for right now</p>
                  <SmartInput context="one thing grateful for right now" placeholder="Speak or tap..." value={journalGrateful} onChange={setJournalGrateful} patternType="morning" rows={2} autoSuggest={false} />
                </div>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--violet)', marginBottom: 8 }}>Notice: tension, or calm?</p>
                  <SmartInput context="noticing tension or calm in the body" placeholder="Speak or tap..." value={journalTension} onChange={setJournalTension} patternType="morning" rows={2} autoSuggest={false} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('energy_mood')} style={{ flex: 'none', padding: '13px 18px', borderRadius: 16, border: '1px solid rgba(180,150,100,0.16)', cursor: 'pointer', background: 'var(--surface-inactive)', color: 'var(--ink-3)' }}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => { submitJournal(); setStep('movement') }} className="flex-1 transition-all active:scale-95" style={{ padding: '13px 0', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5C4530, #B8934A)', color: 'white', fontSize: 14, fontWeight: 700 }}>
                    Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            )}

            {step === 'movement' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ ...GLASS, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                    <Dumbbell className="h-3.5 w-3.5" style={{ color: 'var(--ink-3)' }} />
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isSaturday ? 'Gym today? (optional)' : 'Gym today?'}</p>
                  </div>
                  <YesNoChoice value={gymYes} onChange={v => { setGymYes(v); if (v) setMovementChoice(null) }} />
                </div>

                {gymYes === true && (
                  <div style={{ ...GLASS, padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Gym time</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {GYM_TIMES.map(t => (
                        <button key={t} onClick={() => setGymTime(t)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: gymTime === t ? 'rgba(224,140,74,0.2)' : 'var(--surface-inactive)', border: gymTime === t ? '1.5px solid rgba(224,140,74,0.45)' : '1px solid rgba(180,150,100,0.16)', color: gymTime === t ? '#B8632F' : 'var(--ink-3)' }}>{t}</button>
                      ))}
                    </div>
                  </div>
                )}

                {gymYes === false && (
                  <div style={{ ...GLASS, padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Choose one</p>
                    <ChoiceGrid
                      options={[...MOVEMENT_ALTERNATIVES, REST_OPTION]}
                      value={movementChoice}
                      onChange={v => setMovementChoice(v as MovementChoice)}
                    />
                  </div>
                )}

                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Where are you working?</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {([{ v: 'home', label: 'Work from home', icon: <Home className="h-3.5 w-3.5" /> }, { v: 'office', label: 'Going to office', icon: <Building2 className="h-3.5 w-3.5" /> }] as { v: 'home'|'office'; label: string; icon: React.ReactNode }[]).map(opt => (
                      <button key={opt.v} onClick={() => setLocation(opt.v)} style={{ flex: 1, padding: '11px 8px', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: location === opt.v ? 'rgba(201,169,110,0.2)' : 'var(--surface-inactive)', border: location === opt.v ? '1.5px solid rgba(201,169,110,0.4)' : '1px solid rgba(180,150,100,0.16)', color: location === opt.v ? '#8A6F2A' : 'var(--ink-3)' }}>{opt.icon}{opt.label}</button>
                    ))}
                  </div>
                </div>

                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Morning plans (optional)</p>
                  <input value={morningPlans} onChange={e => setMorningPlans(e.target.value)} placeholder="doctor's appointment, coffee with a friend…" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Work plans (optional)</p>
                  <input value={workPlans} onChange={e => setWorkPlans(e.target.value)} placeholder="client call at 2, big deadline…" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Done with work by</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {END_TIMES.map(t => (
                      <button key={t} onClick={() => setWorkEndTime(t)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: workEndTime === t ? 'rgba(90,138,164,0.2)' : 'var(--surface-inactive)', border: workEndTime === t ? '1.5px solid rgba(90,138,164,0.45)' : '1px solid rgba(180,150,100,0.16)', color: workEndTime === t ? '#4A7A96' : 'var(--ink-3)' }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ ...GLASS, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Evening plans (optional)</p>
                  <input value={eveningPlans} onChange={e => setEveningPlans(e.target.value)} placeholder="dinner out, date night, errands…" style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink-1)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>

                {error && (
                  <div style={{ ...GLASS, padding: 16, background: 'rgba(250,225,225,0.92)', border: '1px solid rgba(224,94,94,0.35)' }}>
                    <p style={{ fontSize: 13, color: '#B23B3B' }}>{error}</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setStep('journal')} style={{ flex: 'none', padding: '13px 18px', borderRadius: 16, border: '1px solid rgba(180,150,100,0.16)', cursor: 'pointer', background: 'var(--surface-inactive)', color: 'var(--ink-3)' }}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={generate}
                    disabled={gymYes === null || (gymYes === false && !movementChoice)}
                    className="flex-1 transition-all active:scale-95 disabled:opacity-40"
                    style={{ padding: '15px 0', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #5C4530, #B8934A)', color: 'white', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Sparkles className="h-4 w-4" /> Build my day
                  </button>
                </div>
              </div>
            )}

            {(step === 'loading' || loading) && (
              <div style={{ ...GLASS, padding: 32, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(240,228,200,0.92)', border: '1px solid rgba(201,169,110,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <RefreshCw className="h-6 w-6 animate-spin" style={{ color: '#8A6F2A' }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-1)', marginBottom: 6 }}>Building your day…</p>
                <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Calendar, email, and DRYP tasks</p>
              </div>
            )}

            {step === 'result' && plan && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {plan.ai_message && (
                  <div style={{ ...GLASS, padding: 18, background: 'var(--luna-card-bg)', border: '1px solid var(--luna-card-border)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#8A6F2A', marginBottom: 4 }}>LUNA{plan.business_focus ? ` · ${plan.business_focus}` : ''}</p>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.65 }}>{plan.ai_message}</p>
                    {plan.day_energy && <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, fontStyle: 'italic' }}>{plan.day_energy}</p>}
                  </div>
                )}

                {(plan.occasion || plan.movement_choice) && (
                  <div style={{ ...GLASS, padding: 16, display: 'flex', gap: 16 }}>
                    {plan.occasion && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ShirtIcon className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{OCCASION_LABEL[plan.occasion]}</span>
                      </div>
                    )}
                    {plan.movement_choice && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Dumbbell className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{movementLabel(plan.movement_choice)}</span>
                        {plan.movement_choice !== 'gym' && plan.movement_choice !== 'rest' && (
                          movementLogged ? (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#4E8C6B' }}>✓ Done</span>
                          ) : (
                            <button type="button" onClick={logNonGymMovement} disabled={movementLogging}
                              style={{ fontSize: 11, fontWeight: 600, color: '#8A6F2A', background: 'rgba(201,169,110,0.18)', border: 'none', borderRadius: 999, padding: '3px 10px', cursor: 'pointer' }}>
                              {movementLogging ? '…' : 'Mark done'}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}

                {plan.comms_summary && (plan.comms_summary.urgent > 0 || plan.comms_summary.needsReview > 0) && (
                  <Link href="/email" style={{ textDecoration: 'none' }}>
                    <div style={{ ...GLASS, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mail className="h-4 w-4" style={{ color: '#A8496E' }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{plan.comms_summary.urgent} urgent · {plan.comms_summary.needsReview} need review</p>
                          {plan.comms_summary.topAction && <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{plan.comms_summary.topAction}</p>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4" style={{ color: 'var(--ink-4)' }} />
                    </div>
                  </Link>
                )}

                {anchors && (
                  <div style={{ ...GLASS, padding: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Today&apos;s anchors</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Wake up', time: anchors.wake, emoji: '☀️', color: '#8A6F2A' },
                        ...(anchors.gym ? [{ label: 'Gym', time: anchors.gym, emoji: '💪', color: '#B8632F' }] : []),
                        { label: 'Start work', time: anchors.at_work, emoji: '💻', color: '#4A7A96' },
                        { label: 'Lunch', time: anchors.lunch, emoji: '🍽️', color: '#5A8A5A' },
                        { label: 'Leave work', time: anchors.leave_work, emoji: '🏁', color: '#8A6F2A' },
                        { label: 'Wind down', time: anchors.wind_down, emoji: '🌙', color: '#6B5A96' },
                        { label: 'Lights out', time: anchors.lights_out, emoji: '💤', color: 'var(--ink-4)' },
                      ].filter(a => a.time && a.time !== 'null').map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'var(--surface-inactive)', border: '1px solid rgba(180,150,100,0.14)' }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>{a.emoji}</span>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.time}</p>
                            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{a.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.schedule?.length > 0 && (
                  <div style={{ ...GLASS, padding: 18 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Full schedule</p>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 16, top: 8, bottom: 8, width: 1, background: 'rgba(180,150,100,0.16)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {plan.schedule.map((block, i) => {
                          const style = TYPE_STYLE[block.type] ?? TYPE_STYLE.work
                          const isAnchor = block.anchor
                          return (
                            <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 14 }}>
                              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                                <div style={{ width: isAnchor ? 14 : 10, height: isAnchor ? 14 : 10, borderRadius: '50%', background: isAnchor ? style.dot : 'rgba(94,84,116,0.25)', border: isAnchor ? `2px solid ${style.dot}` : '1.5px solid rgba(94,84,116,0.25)', flexShrink: 0, zIndex: 1, marginLeft: isAnchor ? -2 : 0 }} />
                              </div>
                              <div style={{ flex: 1, paddingBottom: 2 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: block.detail ? 3 : 0 }}>
                                  <span style={{ fontSize: isAnchor ? 12 : 11, fontWeight: 700, color: style.color, flexShrink: 0, minWidth: 54 }}>{block.time}</span>
                                  <span style={{ fontSize: 14, flexShrink: 0 }}>{block.emoji ?? ''}</span>
                                  <p style={{ fontSize: isAnchor ? 14 : 13, fontWeight: isAnchor ? 700 : 500, color: isAnchor ? 'var(--ink-1)' : 'var(--ink-2)', lineHeight: 1.4 }}>{block.label}</p>
                                </div>
                                {block.detail && <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.55, marginLeft: 62 }}>{block.detail}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={generate} style={{ flex: 1, padding: '13px 0', borderRadius: 16, border: '1px solid rgba(201,169,110,0.3)', cursor: 'pointer', background: 'rgba(201,169,110,0.1)', color: '#8A6F2A', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                  </button>
                  <button onClick={() => { setPlan(null); setError(''); setStep('wake') }} style={{ flex: 1, padding: '13px 0', borderRadius: 16, border: '1px solid rgba(180,150,100,0.16)', cursor: 'pointer', background: 'var(--surface-inactive)', color: 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>
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
