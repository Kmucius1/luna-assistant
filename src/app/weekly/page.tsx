'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw, Sparkles, Check } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'

const RESET_SECTIONS = [
  {
    title: '🏠 Home',
    color: '#A8C4DA',
    items: ['Laundry', 'Take out trash', 'Clean room', 'Dishes', 'Wipe surfaces', 'Tidy workspace'],
  },
  {
    title: '🌿 Body',
    color: '#B8C9B4',
    items: ['Grocery run or order', 'Refill water bottle', 'Lay out vitamins/supplements', 'Plan meals for the week', 'Movement planned'],
  },
  {
    title: '📅 Mind',
    color: '#9b5cff',
    items: ['Review calendar for the week', 'Catch up on emails', 'Set top 3 weekly priorities', 'Review open client tasks', 'Update DRYPHub'],
  },
  {
    title: '✨ Soul',
    color: '#C9A96E',
    items: ['Journal or dictate a reflection', 'Art time (drawing, sewing, painting)', 'Personal project — even 20 min', 'Gratitude list', 'Set spiritual intention for the week'],
  },
  {
    title: '👗 Personal',
    color: '#E8B4B8',
    items: ['Plan outfits for the week', 'Pack or prep bag', 'Phone cleanup (photos, voicemails)', 'Skin care check-in', 'Unsubscribe / digital declutter'],
  },
]

const REFLECTION_PROMPTS = [
  { key: 'wins', label: '💜 What went well this week?' },
  { key: 'learned', label: '💡 What did you learn about yourself?' },
  { key: 'release', label: '🍃 What are you releasing from this week?' },
  { key: 'intention', label: '🌙 What is your intention for the week ahead?' },
]

interface WeeklyResult {
  week_opening?: string
  pattern_this_week?: string
  chart_connection?: string
  release?: string
  carry_forward?: string
  intention_for_week?: string
  affirmation?: string
  closing?: string
}

export default function WeeklyResetPage() {
  const [checks, setChecks]     = useState<Record<string, boolean>>({})
  const [reflections, setReflections] = useState<Record<string, string>>({})
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<WeeklyResult | null>(null)
  const [activeView, setActiveView] = useState<'reset' | 'reflect'>('reset')

  const totalItems = RESET_SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
  const doneCount  = Object.values(checks).filter(Boolean).length
  const pct        = Math.round((doneCount / totalItems) * 100)

  function toggle(key: string) {
    setChecks(c => ({ ...c, [key]: !c[key] }))
  }

  async function getReflection() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/weekly-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflections, checklist_pct: pct }),
      })
      setResult(await res.json())
    } catch {
      setResult({
        week_opening: 'Every week is a full cycle. You showed up. That is everything.',
        pattern_this_week: 'Growth through doing, then integrating — you moved, then you felt.',
        chart_connection: 'Scorpio Sun learns by going deep first. You cannot skip that part.',
        release: 'The weight of what did not get done.',
        carry_forward: 'The clarity you found when you were honest with yourself.',
        intention_for_week: 'I move with purpose, not pressure.',
        affirmation: 'I trust my own rhythm. Each week I learn myself more deeply.',
        closing: 'Rest tonight. A new week is waiting to receive you.',
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
              style={{ background: 'rgba(155,92,255,0.1)' }}>
              <RefreshCw className="h-5 w-5" style={{ color: 'var(--violet)' }} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Weekly Reset</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Sunday sanctuary ritual.</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
            Close one week. Open the next.
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            You do not need to do all of this. Do what you can. Each check is a small act of love for future Zoe.
          </p>

          {/* Tab toggle */}
          <div className="flex gap-2 mb-6">
            {(['reset', 'reflect'] as const).map(v => (
              <button key={v} onClick={() => setActiveView(v)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: activeView === v ? 'var(--violet)' : 'rgba(155,92,255,0.08)',
                  color: activeView === v ? 'white' : 'var(--mid)',
                }}>
                {v === 'reset' ? '✅ Ritual Checklist' : '💜 Weekly Reflection'}
              </button>
            ))}
          </div>

          {activeView === 'reset' && (
            <>
              {/* Progress */}
              <div className="glass-card p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                    {doneCount}/{totalItems} complete
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--violet)' }}>{pct}%</p>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(155,92,255,0.1)' }}>
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--violet-mid), var(--violet))' }} />
                </div>
                {pct === 100 && (
                  <p className="text-xs mt-2 text-center font-semibold" style={{ color: 'var(--violet)' }}>
                    ✨ You did it. Future Zoe thanks you.
                  </p>
                )}
              </div>

              {/* Sections */}
              <div className="space-y-4">
                {RESET_SECTIONS.map(section => (
                  <div key={section.title} className="glass-card p-4">
                    <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>{section.title}</p>
                    <div className="space-y-2">
                      {section.items.map(item => {
                        const key = `${section.title}-${item}`
                        const done = !!checks[key]
                        return (
                          <button key={item} onClick={() => toggle(key)}
                            className="w-full flex items-center gap-3 py-1.5 text-left transition-all">
                            <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                              style={{
                                background: done ? section.color : 'transparent',
                                border: `1.5px solid ${done ? section.color : 'var(--faint)'}`,
                              }}>
                              {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-sm" style={{
                              color: done ? 'var(--mist)' : 'var(--depth)',
                              textDecoration: done ? 'line-through' : 'none',
                            }}>
                              {item}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeView === 'reflect' && !result && (
            <div className="space-y-4">
              {REFLECTION_PROMPTS.map(p => (
                <div key={p.key}>
                  <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--violet)' }}>{p.label}</p>
                  <SmartInput
                    context={p.label}
                    placeholder="Speak or tap..."
                    value={reflections[p.key] ?? ''}
                    onChange={v => setReflections(r => ({ ...r, [p.key]: v }))}
                    patternType="weekly"
                    rows={3}
                    autoSuggest={false}
                  />
                </div>
              ))}

              <button onClick={getReflection} disabled={loading}
                className="w-full py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                <Sparkles className="inline h-4 w-4 mr-2" />
                {loading ? 'Closing the week with grace...' : 'Close the week'}
              </button>
            </div>
          )}

          {activeView === 'reflect' && result && (
            <div className="space-y-4 animate-fade-up">
              <div className="soul-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>
                  This week
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{result.week_opening}</p>
              </div>

              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Pattern</p>
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>{result.pattern_this_week}</p>
                {result.chart_connection && (
                  <p className="text-xs mt-2 italic" style={{ color: 'var(--text-2)' }}>{result.chart_connection}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#C87B7B' }}>Release</p>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{result.release}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A8A5A' }}>Carry forward</p>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{result.carry_forward}</p>
                </div>
              </div>

              {result.intention_for_week && (
                <div className="glass-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>
                    Intention for next week
                  </p>
                  <p className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>{result.intention_for_week}</p>
                </div>
              )}

              <div className="rounded-2xl p-5 text-center"
                style={{ background: 'rgba(155,92,255,0.06)', border: '1px solid rgba(155,92,255,0.1)' }}>
                <p className="font-display text-base italic" style={{ color: 'var(--text-1)' }}>
                  &ldquo;{result.affirmation}&rdquo;
                </p>
              </div>

              {result.closing && (
                <p className="text-center text-sm" style={{ color: 'var(--text-3)' }}>{result.closing}</p>
              )}

              <button onClick={() => setResult(null)}
                className="w-full py-3.5 rounded-2xl font-semibold"
                style={{ background: 'rgba(155,92,255,0.08)', color: 'var(--violet)' }}>
                Edit reflection
              </button>
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
