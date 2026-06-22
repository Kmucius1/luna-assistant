'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sun, ArrowRight, Sparkles, ChevronLeft, Moon } from 'lucide-react'
import { format } from 'date-fns'
import { SmartInput } from '@/components/ui/SmartInput'
import { addPattern } from '@/lib/patterns'
import { useLocation } from '@/hooks/useLocation'

type CheckInType = 'morning' | 'midday' | 'night'

function getCheckInType(): CheckInType {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'midday'
  return 'night'
}

const CHECK_IN_CONFIG: Record<CheckInType, {
  label: string; emoji: string; headline: string; subtitle: string; color: string
}> = {
  morning: {
    label: 'Morning Check-In',
    emoji: '🌅',
    headline: 'Good morning, beautiful.',
    subtitle: 'Before the world gets your energy, come back to yourself.',
    color: 'var(--lunar)',
  },
  midday: {
    label: 'Midday Wellness Check',
    emoji: '☀️',
    headline: 'How is your soul right now?',
    subtitle: 'Pause. Breathe. Check in with yourself.',
    color: 'var(--golden)',
  },
  night: {
    label: 'Night Time Reflection',
    emoji: '🌙',
    headline: 'Let the day settle.',
    subtitle: 'Release what happened. Honor what you felt.',
    color: 'var(--violet-mid)',
  },
}

const SUPPORT_NEEDS = [
  { value: 'calm',       label: '🌊 Calm',       desc: 'I need stillness' },
  { value: 'focus',      label: '🎯 Focus',      desc: 'Help me zero in' },
  { value: 'confidence', label: '💪 Confidence', desc: 'I need a boost' },
  { value: 'comfort',    label: '🤗 Comfort',    desc: 'I need softness' },
  { value: 'direction',  label: '🧭 Direction',  desc: 'Guide me today' },
  { value: 'reset',      label: '🔄 Reset',      desc: 'Fresh start' },
]

interface CheckInData {
  wakeTime: string
  sleepRating: number
  energyRating: number
  moodRating: number
  hadDream: boolean
  dreamText: string
  feeling: string
  onMind: string
  supportNeed: string
  prideGoal: string
}

type Step = 'wake' | 'sleep' | 'energy' | 'mood' | 'dream' | 'feeling' | 'support' | 'goal' | 'result'

export default function MorningCheckIn() {
  const location = useLocation()
  const [checkInType, setCheckInType] = useState<CheckInType>('morning')
  const [step, setStep] = useState<Step>('wake')
  const [data, setData] = useState<CheckInData>({
    wakeTime: '', sleepRating: 7, energyRating: 7, moodRating: 7,
    hadDream: false, dreamText: '', feeling: '', onMind: '',
    supportNeed: '', prideGoal: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    greeting: string; top_3: string[]; first_step: string;
    spiritual_message: string; affirmation: string;
    human_design_message: string; chart_reflection: string;
    self_care_action: string; ai_message: string;
  } | null>(null)

  useEffect(() => { setCheckInType(getCheckInType()) }, [])

  function update<K extends keyof CheckInData>(key: K, value: CheckInData[K]) {
    setData(prev => ({ ...prev, [key]: value }))
  }

  async function finish() {
    setStep('result')
    setLoading(true)
    let aiResult = null
    try {
      const res = await fetch('/api/ai/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIn: data, type: checkInType, tz: location.tz, localTime: location.localTime }),
      })
      aiResult = await res.json()
      setResult(aiResult)
    } catch {
      aiResult = {
        greeting: CHECK_IN_CONFIG[checkInType].headline + ' You showed up. That is enough.',
        top_3: ['Take one grounding breath', 'Check in with your body', 'Choose one clear intention'],
        first_step: 'Sit still for 60 seconds before you move.',
        spiritual_message: checkInType === 'night'
          ? 'Release what you are holding. Tomorrow is new.'
          : 'Move with intention before speed.',
        affirmation: 'I am exactly where I need to be.',
        human_design_message: 'As a Projector, wait for recognition. Do not force.',
        chart_reflection: 'Your Scorpio Sun wants to go deep. Your Cancer Moon needs to feel safe first.',
        self_care_action: checkInType === 'night' ? 'No screens for 30 min. Let your mind exhale.' : 'Drink water first.',
        ai_message: 'You are becoming the woman you see in your future.',
      }
      setResult(aiResult)
    } finally {
      // Save to Supabase in background — don't block UI
      fetch('/api/check-ins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type: checkInType, aiResponse: aiResult }),
      }).catch(() => {})
      setLoading(false)
    }
  }

  const today = location.localDate
    ? location.localDate.split(',').slice(0,2).join(',')
    : format(new Date(), 'EEEE, MMMM d')

  function SliderInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    return (
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--depth)' }}>{label}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--violet)' }}>{value}/10</span>
        </div>
        <input
          type="range" min={1} max={10} value={value}
          onChange={e => {
            const n = Number(e.target.value)
            onChange(n)
            addPattern({ type: 'morning', context: label.toLowerCase(), value: String(n), source: 'typed' })
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: 'var(--mist)' }}>Low</span>
          <span className="text-xs" style={{ color: 'var(--mist)' }}>Amazing</span>
        </div>
      </div>
    )
  }

  return (
    <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          {step !== 'result' && (
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(139,111,184,0.15)' }}>
                <span className="text-xl">{CHECK_IN_CONFIG[checkInType].emoji}</span>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider"
                  style={{ color: CHECK_IN_CONFIG[checkInType].color }}>
                  {CHECK_IN_CONFIG[checkInType].label}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{today}</p>
              </div>
            </div>
          )}

          {/* Step: Wake time */}
          {step === 'wake' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                {CHECK_IN_CONFIG[checkInType].headline}
              </h2>
              <p className="text-base mb-8" style={{ color: 'var(--text-2)' }}>
                {CHECK_IN_CONFIG[checkInType].subtitle}
              </p>
              <div className="glass-card p-5 mb-6">
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--depth)' }}>What time did you wake up?</p>
                <input
                  type="time"
                  value={data.wakeTime}
                  onChange={e => update('wakeTime', e.target.value)}
                  className="w-full bg-transparent text-2xl font-display outline-none"
                  style={{ color: 'var(--violet)' }}
                />
              </div>
              <button onClick={() => setStep('sleep')}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                Continue <ArrowRight className="inline h-4 w-4 ml-1" />
              </button>
            </div>
          )}

          {/* Step: Sleep */}
          {step === 'sleep' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>
                How did your soul sleep?
              </h2>
              <p className="text-sm mb-8" style={{ color: 'var(--mid)' }}>
                Sleep is the foundation of everything. Be honest.
              </p>
              <div className="glass-card p-5 mb-6 space-y-6">
                <SliderInput label="Sleep quality" value={data.sleepRating} onChange={n => update('sleepRating', n)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('wake')} className="flex-none px-5 py-4 rounded-2xl font-semibold"
                  style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('energy')} className="flex-1 py-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Energy + Mood */}
          {step === 'energy' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-8" style={{ color: 'var(--depth)' }}>
                How is your body and spirit?
              </h2>
              <div className="glass-card p-5 mb-6 space-y-6">
                <SliderInput label="Energy level" value={data.energyRating} onChange={n => update('energyRating', n)} />
                <SliderInput label="Mood" value={data.moodRating} onChange={n => update('moodRating', n)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('sleep')} className="flex-none px-5 py-4 rounded-2xl font-semibold"
                  style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('mood')} className="flex-1 py-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Dream */}
          {step === 'mood' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>
                Did you dream last night?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
                Dreams carry messages. Even fragments matter.
              </p>
              <div className="flex gap-3 mb-5">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => update('hadDream', v)}
                    className="flex-1 py-4 rounded-2xl font-semibold transition-all"
                    style={{
                      background: data.hadDream === v ? 'var(--violet)' : 'rgba(139,111,184,0.08)',
                      color: data.hadDream === v ? 'white' : 'var(--mid)',
                    }}>
                    {v ? 'Yes ✨' : 'Not that I remember'}
                  </button>
                ))}
              </div>
              {data.hadDream && (
                <div className="glass-card p-5 mb-5">
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--violet)' }}>Tell me what you remember</p>
                  <SmartInput
                    context="dream — people, feelings, places, symbols from last night's dream"
                    placeholder="People, feelings, places, symbols — anything..."
                    value={data.dreamText}
                    onChange={v => update('dreamText', v)}
                    patternType="morning"
                    rows={3}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep('energy')} className="flex-none px-5 py-4 rounded-2xl font-semibold"
                  style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('dream')} className="flex-1 py-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Feeling */}
          {step === 'dream' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>
                What are you feeling right now?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
                Say it out loud if you can. Speak it into the room first.
              </p>
              <div className="glass-card p-5 mb-4">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--violet)' }}>What are you feeling?</p>
                <SmartInput
                  context="how are you feeling right now — emotions, physical sensations, overall state"
                  placeholder="I feel... I am noticing... Something in me is..."
                  value={data.feeling}
                  onChange={v => update('feeling', v)}
                  patternType="morning"
                  rows={3}
                />
              </div>
              <div className="glass-card p-5 mb-5">
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--violet)' }}>What is sitting on your mind?</p>
                <SmartInput
                  context="what is on your mind — work, people, thoughts, worries, excitement"
                  placeholder="Work, people, thoughts, worries, excitement..."
                  value={data.onMind}
                  onChange={v => update('onMind', v)}
                  patternType="morning"
                  history={data.feeling ? [data.feeling] : []}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('mood')} className="flex-none px-5 py-4 rounded-2xl font-semibold"
                  style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('feeling')} className="flex-1 py-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Support need */}
          {step === 'feeling' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>
                What kind of support do you need today?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
                No wrong answer. What does your soul actually need?
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SUPPORT_NEEDS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => {
                      update('supportNeed', s.value)
                      addPattern({ type: 'morning', context: 'support need', value: s.label, source: 'suggestion' })
                    }}
                    className="p-4 rounded-2xl text-left transition-all"
                    style={{
                      background: data.supportNeed === s.value ? 'var(--violet-pale)' : 'var(--glass-bg)',
                      border: `1.5px solid ${data.supportNeed === s.value ? 'var(--violet)' : 'rgba(255,255,255,0.6)'}`,
                      backdropFilter: 'blur(16px)',
                    }}
                  >
                    <p className="text-base font-semibold mb-0.5" style={{ color: 'var(--depth)' }}>{s.label}</p>
                    <p className="text-xs" style={{ color: 'var(--mist)' }}>{s.desc}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('dream')} className="flex-none px-5 py-4 rounded-2xl font-semibold"
                  style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setStep('support')} className="flex-1 py-4 rounded-2xl font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  Continue <ArrowRight className="inline h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Pride goal */}
          {step === 'support' && (
            <div className="animate-fade-up">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--depth)' }}>
                What would make tonight-you proud?
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
                One thing. Not a list. What would feel like a win by bedtime?
              </p>
              <div className="glass-card p-5 mb-8">
                <SmartInput
                  context="what would make tonight-you proud — one thing that would feel like a win by bedtime"
                  placeholder="Tonight I will feel good because I..."
                  value={data.prideGoal}
                  onChange={v => update('prideGoal', v)}
                  patternType="morning"
                  history={[data.feeling, data.onMind].filter(Boolean)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('feeling')} className="flex-none px-5 py-4 rounded-2xl font-semibold"
                  style={{ background: 'rgba(139,111,184,0.08)', color: 'var(--violet)' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={finish} className="flex-1 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  <Sparkles className="inline h-4 w-4 mr-2" />
                  Generate my day
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {step === 'result' && (
            <div className="animate-fade-up">
              {loading ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-full mx-auto mb-6 animate-breathe"
                    style={{ background: 'radial-gradient(circle, rgba(139,111,184,0.4), rgba(139,111,184,0.1))' }} />
                  <p className="font-display text-lg" style={{ color: 'var(--violet)' }}>Reading your energy...</p>
                  <p className="text-sm mt-2" style={{ color: 'var(--mist)' }}>Generating your morning brief</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <h2 className="font-display text-2xl font-semibold" style={{ color: 'var(--depth)' }}>
                    {result.greeting}
                  </h2>

                  {/* Top 3 */}
                  <div className="glass-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Your top 3 today</p>
                    {result.top_3?.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-2" style={{ borderBottom: i < result.top_3.length - 1 ? '1px solid rgba(139,111,184,0.08)' : 'none' }}>
                        <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: 'var(--violet-pale)', color: 'var(--violet)' }}>{i + 1}</span>
                        <p className="text-sm" style={{ color: 'var(--depth)' }}>{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* First step */}
                  <div className="soul-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Start here</p>
                    <p className="font-medium" style={{ color: 'var(--depth)' }}>{result.first_step}</p>
                  </div>

                  {/* Spiritual */}
                  <div className="glass-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Spirit today</p>
                    <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.spiritual_message}</p>
                  </div>

                  {/* HD */}
                  <div className="glass-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Human Design</p>
                    <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.human_design_message}</p>
                    {result.chart_reflection && (
                      <p className="text-sm mt-2 italic" style={{ color: 'var(--mist)' }}>{result.chart_reflection}</p>
                    )}
                  </div>

                  {/* Affirmation */}
                  <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(139,111,184,0.06)', border: '1px solid rgba(139,111,184,0.1)' }}>
                    <p className="font-display text-lg italic" style={{ color: 'var(--depth)' }}>
                      &ldquo;{result.affirmation}&rdquo;
                    </p>
                  </div>

                  {/* Self care */}
                  <div className="glass-card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--herb)' }}>Self-care today</p>
                    <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.self_care_action}</p>
                  </div>

                  <p className="text-sm text-center py-2 italic" style={{ color: 'var(--mist)' }}>{result.ai_message}</p>
                </div>
              ) : null}
            </div>
          )}

        </div>
      </AppLayout>
  )
}
