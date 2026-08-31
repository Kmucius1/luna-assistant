'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GlassCard } from '@/components/ui/GlassCard'
import { BookOpen, Sparkles } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'
import { format, startOfWeek } from 'date-fns'

const REFLECTION_PROMPTS = [
  { key: 'triggers',           label: 'What triggered me?',                         emoji: '⚡' },
  { key: 'avoided',            label: 'What did I avoid?',                           emoji: '😶' },
  { key: 'completed',          label: 'What did I complete?',                        emoji: '✅' },
  { key: 'learned',            label: 'What did I learn?',                           emoji: '💡' },
  { key: 'overgave',           label: 'Where did I overgive?',                       emoji: '🫶' },
  { key: 'protected_peace',    label: 'Where did I protect my peace?',               emoji: '🛡' },
  { key: 'highest_self',       label: 'Where did I act like my highest self?',       emoji: '✨' },
  { key: 'chart_theme',        label: 'What design or chart theme was at work?',     emoji: '🔮' },
]

const PAST_LESSONS = [
  {
    week: 'June 9–15',
    insight: 'This week connected to your 4/6 profile and Cancer Moon: learning that emotional leadership starts with leading yourself first — before managing everyone else\'s feelings.',
    theme: '4/6 Profile · Cancer Moon',
    highlight: 'You spoke your truth clearly in a client meeting and it landed perfectly.',
  },
  {
    week: 'June 2–8',
    insight: 'Virgo Midheaven was active this week. You turned a chaotic client request into a clean system. That is your power — making order from chaos.',
    theme: 'Virgo Midheaven',
    highlight: 'You finished the EHM CRM setup without anyone asking you to.',
  },
]

export default function LessonsScreen() {
  const weekStart = format(startOfWeek(new Date()), 'MMMM d')
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{
    week_reflection?: string; pattern_seen?: string; chart_lesson?: string;
    growth_moment?: string; integration?: string; affirmation?: string; message?: string;
  } | null>(null)
  const [loading, setLoading] = useState(false)

  function update(key: string, value: string) {
    setEntries(prev => ({ ...prev, [key]: value }))
  }

  async function reflect() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/lesson-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      })
      setResult(await res.json())
    } catch {
      setResult({
        week_reflection: 'This week showed you something important about your own patterns. The fact that you are reflecting means you are growing — even when it is hard to see.',
        pattern_seen: 'Overgiving energy before protecting it',
        chart_lesson: 'As a Projector, recognition cannot be forced. This week\'s pattern connects to your Scorpio Sun — you went deep but forgot to protect your own energy first.',
        growth_moment: 'You chose to stop work at the right time instead of pushing through.',
        integration: 'Next week: set one boundary before the week starts. Decide one place where you will say no or not yet.',
        affirmation: 'I learn from every week. Growth is not always loud.',
        message: 'You showed up. You reflected. That is already the work.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-sanctuary min-h-screen" style={{
      background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
      '--depth': '#100C1E',
      '--mid': '#5E5474',
      '--mist': '#8A8098',
      '--violet': '#5C4530',
      '--golden': '#5C4530',
      '--herb': '#B8C9B4',
    } as React.CSSProperties}>
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(184,200,180,0.2)' }}>
              <BookOpen className="h-5 w-5" style={{ color: 'var(--herb)' }} />
            </div>
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--herb)' }}>Lesson Tracker</p>
          </div>

          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: '#F5EFE3' }}>
            Every week teaches you something.
          </h1>
          <p className="text-sm mb-2" style={{ color: 'rgba(245,239,227,0.75)' }}>
            Week of {weekStart}
          </p>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--mid)' }}>
            Your 4/6 profile grows through lived experience and relationships. This is where you track what life is teaching you.
          </p>

          {/* Reflection prompts */}
          <div className="space-y-3 mb-6">
            {REFLECTION_PROMPTS.map(prompt => (
              <div key={prompt.key}>
                <p className="text-xs font-semibold mb-2 flex items-center gap-2 px-1" style={{ color: 'var(--violet)' }}>
                  <span>{prompt.emoji}</span>
                  {prompt.label}
                </p>
                <SmartInput
                  context={prompt.label}
                  placeholder="Speak or tap..."
                  value={entries[prompt.key] ?? ''}
                  onChange={v => update(prompt.key, v)}
                  patternType="lessons"
                  rows={2}
                  autoSuggest={false}
                />
              </div>
            ))}
          </div>

          {/* Reflect */}
          <button onClick={reflect} disabled={loading || Object.values(entries).every(v => !v.trim())}
            className="w-full py-4 rounded-2xl font-semibold text-white mb-8 transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--herb), #5A8A5A)' }}>
            <Sparkles className="inline h-4 w-4 mr-2" />
            {loading ? 'Reflecting...' : 'Show me what this week taught me'}
          </button>

          {/* Result */}
          {result && (
            <div className="space-y-4 mb-8 animate-fade-up">
              <GlassCard soul>
                <p className="text-sm leading-relaxed font-display italic" style={{ color: 'var(--depth)' }}>
                  &ldquo;{result.week_reflection}&rdquo;
                </p>
              </GlassCard>

              {result.pattern_seen && (
                <GlassCard>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--mist)' }}>Pattern this week</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--depth)' }}>{result.pattern_seen}</p>
                </GlassCard>
              )}

              {result.chart_lesson && (
                <GlassCard>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>Chart + design lesson</p>
                  <p className="text-sm" style={{ color: 'var(--mid)' }}>{result.chart_lesson}</p>
                </GlassCard>
              )}

              {result.growth_moment && (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(90,138,90,0.06)', border: '1px solid rgba(90,138,90,0.1)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#5A8A5A' }}>Growth moment</p>
                  <p className="text-sm" style={{ color: 'var(--depth)' }}>{result.growth_moment}</p>
                </div>
              )}

              {result.integration && (
                <GlassCard>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--golden)' }}>Integrate next week</p>
                  <p className="text-sm" style={{ color: 'var(--depth)' }}>{result.integration}</p>
                </GlassCard>
              )}

              {result.affirmation && (
                <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(184,200,180,0.1)', border: '1px solid rgba(184,200,180,0.2)' }}>
                  <p className="font-display text-base italic" style={{ color: 'var(--depth)' }}>
                    &ldquo;{result.affirmation}&rdquo;
                  </p>
                </div>
              )}

              {result.message && (
                <p className="text-sm text-center italic" style={{ color: 'var(--mist)' }}>{result.message}</p>
              )}
            </div>
          )}

          {/* Past lessons */}
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--mist)' }}>Past lessons</p>
          <div className="space-y-3">
            {PAST_LESSONS.map((lesson, i) => (
              <div key={i} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--depth)' }}>{lesson.week}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,169,110,0.12)', color: 'var(--violet)' }}>
                    {lesson.theme}
                  </span>
                </div>
                <p className="text-sm mb-2" style={{ color: 'var(--mid)' }}>{lesson.insight}</p>
                <p className="text-xs italic" style={{ color: 'var(--mist)' }}>✨ {lesson.highlight}</p>
              </div>
            ))}
          </div>

        </div>
      </AppLayout>
    </div>
  )
}
