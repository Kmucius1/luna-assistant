'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sun, Sparkles, Droplets, Apple, RefreshCw, Home } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'
import { MIDDAY_REMINDERS } from '@/lib/luna/reminders'

const ENERGY_CHIPS = [
  { emoji: '🔥', label: 'Flowing',   value: 'flowing'   },
  { emoji: '😌', label: 'Steady',    value: 'steady'    },
  { emoji: '🌀', label: 'Scattered', value: 'scattered' },
  { emoji: '😴', label: 'Drained',   value: 'drained'   },
  { emoji: '😤', label: 'Frustrated',value: 'frustrated'},
  { emoji: '✨', label: 'Inspired',  value: 'inspired'  },
]

const BODY_CHECKS = [
  { icon: Droplets, label: 'Drank water', key: 'water',   color: '#A8C4DA' },
  { icon: Apple,    label: 'Ate something', key: 'food',  color: '#B8C9B4' },
  { icon: Sun,      label: 'Got some light/air', key: 'air', color: '#C9A96E' },
]

const MIDDAY_PROMPTS = [
  'What is one thing that actually matters right now?',
  'What can you release from this morning?',
  'What does your body need right now?',
  'What would your highest self prioritize for the next 2 hours?',
  'What is one thing that will make tonight easier if you do it now?',
]

interface MiddayResult {
  energy_read?: string
  what_matters_now?: string
  let_go_of?: string
  body_check?: string
  afternoon_affirmation?: string
  hd_reminder?: string
  closing?: string
}

export default function MiddayPage() {
  const [energy, setEnergy]   = useState('')
  const [checks, setChecks]   = useState<Record<string, boolean>>({})
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<MiddayResult | null>(null)

  const promptIdx = new Date().getDate() % MIDDAY_PROMPTS.length

  function toggleCheck(key: string) {
    setChecks(c => ({ ...c, [key]: !c[key] }))
  }

  async function reset() {
    if (!energy && !note.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/midday-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energy, checks, note }),
      })
      setResult(await res.json())
    } catch {
      setResult({
        energy_read: 'Midday is your reset point, not a checkpoint. Whatever happened this morning stays there.',
        what_matters_now: 'The one thing in front of you right now — not the whole list.',
        let_go_of: 'Any guilt about what did not happen before noon.',
        body_check: 'Drink a full glass of water before you take the next step.',
        afternoon_affirmation: 'I am still becoming. I still have time. The afternoon is mine.',
        hd_reminder: 'Projector midday reminder: if you feel tired, that is data. Rest for 20 minutes before your next move.',
        closing: 'You are doing better than you think.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-sanctuary min-h-screen">
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(201,169,110,0.12)' }}>
              <Sun className="h-5 w-5" style={{ color: 'var(--golden)' }} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--golden)' }}>Midday Reset</p>
              <p className="text-xs" style={{ color: 'var(--mist)' }}>Come back to yourself.</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--depth)' }}>
            Before the world gets your energy —
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--mid)' }}>
            come back to yourself.
          </p>

          {!result ? (
            <div className="space-y-4">
              {/* Today's reminders */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--golden)' }}>
                  Today&apos;s Reminders
                </p>
                <div className="space-y-2">
                  {MIDDAY_REMINDERS.map(r => (
                    <p key={r.id} className="text-sm" style={{ color: 'var(--mid)' }}>{r.label}</p>
                  ))}
                </div>
              </div>

              {/* Energy check */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--mist)' }}>
                  How is your energy right now?
                </p>
                <div className="flex flex-wrap gap-2">
                  {ENERGY_CHIPS.map(e => (
                    <button key={e.value} onClick={() => setEnergy(energy === e.value ? '' : e.value)}
                      className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: energy === e.value ? 'var(--violet)' : 'rgba(155,92,255,0.08)',
                        color: energy === e.value ? 'white' : 'var(--mid)',
                      }}>
                      {e.emoji} {e.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body check */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--mist)' }}>
                  Body check
                </p>
                <div className="space-y-3">
                  {BODY_CHECKS.map(({ icon: Icon, label, key, color }) => (
                    <button key={key} onClick={() => toggleCheck(key)}
                      className="w-full flex items-center gap-3 py-2 transition-all">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: checks[key] ? `${color}22` : 'rgba(155,92,255,0.06)' }}>
                        <Icon className="h-4 w-4" style={{ color: checks[key] ? color : 'var(--mist)' }} />
                      </div>
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: checks[key] ? 'var(--depth)' : 'var(--mid)' }}>
                        {label}
                      </span>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: checks[key] ? 'var(--violet)' : 'transparent',
                          border: `1.5px solid ${checks[key] ? 'var(--violet)' : 'var(--faint)'}`,
                        }}>
                        {checks[key] && <span className="text-white text-xs">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* One question */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--violet)' }}>
                  {MIDDAY_PROMPTS[promptIdx]}
                </p>
                <SmartInput
                  context={MIDDAY_PROMPTS[promptIdx]}
                  placeholder="Speak or tap what comes up..."
                  value={note}
                  onChange={setNote}
                  patternType="midday"
                  rows={3}
                />
              </div>

              <button onClick={reset} disabled={loading}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--golden), #B8904E)' }}>
                <RefreshCw className="inline h-4 w-4 mr-2" />
                {loading ? 'Resetting...' : 'Reset for the afternoon'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-up">

              {/* Energy read */}
              <div className="soul-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>
                  Midday read
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--depth)' }}>
                  {result.energy_read}
                </p>
              </div>

              {/* What matters */}
              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>
                  What matters right now
                </p>
                <p className="text-base font-semibold" style={{ color: 'var(--depth)' }}>
                  {result.what_matters_now}
                </p>
              </div>

              {/* Release + Body */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#C87B7B' }}>Let go of</p>
                  <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.let_go_of}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A8C4DA' }}>Your body</p>
                  <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.body_check}</p>
                </div>
              </div>

              {/* HD note */}
              {result.hd_reminder && (
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Projector note</p>
                  <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.hd_reminder}</p>
                </div>
              )}

              {/* Affirmation */}
              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(201,169,110,0.06)', border: '1px solid rgba(201,169,110,0.12)' }}>
                <p className="font-display text-base italic leading-relaxed" style={{ color: 'var(--depth)' }}>
                  &ldquo;{result.afternoon_affirmation}&rdquo;
                </p>
              </div>

              {result.closing && (
                <p className="text-center text-sm" style={{ color: 'var(--mist)' }}>{result.closing}</p>
              )}

              <button onClick={() => setResult(null)}
                className="w-full py-3.5 rounded-2xl font-semibold"
                style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--golden)' }}>
                <Sparkles className="inline h-4 w-4 mr-2" />
                Reset again
              </button>

              <Link href="/" className="block mt-3">
                <button className="w-full py-3.5 rounded-2xl font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                  <Home className="h-4 w-4" />
                  Return to Home
                </button>
              </Link>
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
