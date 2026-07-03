'use client'
/**
 * GrowthAnalytics — surfaces patterns, trends, and insights from everything
 * Zoe has selected, said, or typed in LUNA. Powered by patterns.ts.
 */
import { useEffect, useState } from 'react'
import { TrendingUp, Mic, Sparkles, Keyboard, Flame, Star, Heart } from 'lucide-react'
import { getInsights, type PatternInsights } from '@/lib/patterns'

const MOOD_COLORS: Record<string, string> = {
  'good': '#5A8A7A', 'great': '#5A8A7A', 'clear': '#5A8A7A', 'aligned': '#5A8A7A', 'peaceful': '#5A8A7A',
  'grateful': '#8A9E6B', 'motivated': '#C9A96E', 'focused': '#6A9FB8',
  'tired': '#9b5cff', 'anxious': '#C96B5A', 'heavy': '#6B6080', 'scattered': '#A88A7A', 'off': '#7A6A6A',
}

function getMoodColor(mood: string): string {
  const lower = mood.toLowerCase()
  for (const [key, color] of Object.entries(MOOD_COLORS)) {
    if (lower.includes(key)) return color
  }
  return 'var(--violet)'
}

const THEME_ICONS: Record<string, string> = {
  overwhelmed:'😮‍💨', creative:'🎨', aligned:'✨', tired:'😴', anxious:'😰',
  motivated:'🔥', disconnected:'🌫', grateful:'🙏', relationship:'💬',
  money:'💸', clarity:'🌟', growth:'🌱',
}

export function GrowthAnalytics({ compact = false }: { compact?: boolean }) {
  const [insights, setInsights] = useState<PatternInsights | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setInsights(getInsights(14))
  }, [])

  if (!mounted || !insights) return null

  if (insights.totalEntries === 0) {
    return (
      <div className="rounded-[20px] p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4" style={{ color: 'var(--violet)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Growth Analytics</p>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Start using check-ins, journal, and voice to see your patterns here.
        </p>
      </div>
    )
  }

  const total = insights.sourceBreakdown.suggestion + insights.sourceBreakdown.voice + insights.sourceBreakdown.typed || 1
  const voicePct = Math.round((insights.sourceBreakdown.voice / total) * 100)
  const tapPct = Math.round((insights.sourceBreakdown.suggestion / total) * 100)
  const typePct = Math.round((insights.sourceBreakdown.typed / total) * 100)

  if (compact) {
    return (
      <div className="rounded-[20px] p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--violet)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Your Patterns</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4" style={{ color: '#C9A96E' }} />
            <p className="text-sm font-bold" style={{ color: '#C9A96E' }}>{insights.streakDays}d streak</p>
          </div>
        </div>

        {/* Top moods */}
        {insights.topMoods.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {insights.topMoods.slice(0, 3).map(m => (
              <span key={m} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: getMoodColor(m) + '22', color: getMoodColor(m), border: `1px solid ${getMoodColor(m)}33` }}>
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Top themes */}
        {insights.topThemes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {insights.topThemes.map(t => (
              <span key={t} className="text-xs" style={{ color: 'var(--text-3)' }}>
                {THEME_ICONS[t] ?? '·'} {t}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: 'var(--violet)' }} />
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-1)' }}>Growth Analytics</h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.25)' }}>
          <Flame className="h-3.5 w-3.5" style={{ color: '#C9A96E' }} />
          <p className="text-sm font-bold" style={{ color: '#C9A96E' }}>{insights.streakDays} day streak</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Entries', val: insights.totalEntries, sub: 'last 14 days', icon: Star },
          { label: 'Energy avg', val: insights.energyAvg ? `${insights.energyAvg}/10` : '—', sub: 'from check-ins', icon: Sparkles },
          { label: 'Streak', val: `${insights.streakDays}d`, sub: 'consecutive', icon: Flame },
        ].map(s => (
          <div key={s.label} className="rounded-[18px] p-3 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>{s.val}</p>
            <p className="text-xs font-bold" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            <p style={{ fontSize: '0.6rem', color: 'var(--text-4)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Input source breakdown */}
      <div className="rounded-[20px] p-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>How You Communicate with LUNA</p>
        <div className="space-y-2">
          {[
            { label: 'Voice dictation', pct: voicePct, icon: Mic,      color: 'var(--violet)' },
            { label: 'Suggestion taps', pct: tapPct,   icon: Sparkles, color: '#5A8A7A' },
            { label: 'Typed directly',  pct: typePct,  icon: Keyboard, color: '#C9A96E' },
          ].map(s => (
            <div key={s.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>{s.label}</p>
                </div>
                <p className="text-xs font-bold" style={{ color: s.color }}>{s.pct}%</p>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mood patterns */}
      {insights.topMoods.length > 0 && (
        <div className="rounded-[20px] p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Your Most Common Moods</p>
          <div className="flex flex-wrap gap-2">
            {insights.topMoods.map(m => (
              <div key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: getMoodColor(m) + '18', border: `1px solid ${getMoodColor(m)}30` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: getMoodColor(m) }} />
                <p className="text-sm font-medium" style={{ color: getMoodColor(m) }}>{m}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring themes */}
      {insights.topThemes.length > 0 && (
        <div className="rounded-[20px] p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Recurring Themes in Your Life</p>
          <div className="space-y-2">
            {insights.topThemes.map(t => (
              <div key={t} className="flex items-center gap-3 rounded-[14px] p-3"
                style={{ background: 'rgba(155,92,255,0.07)', border: '1px solid rgba(155,92,255,0.12)' }}>
                <span className="text-lg">{THEME_ICONS[t] ?? '·'}</span>
                <div>
                  <p className="text-sm font-semibold capitalize" style={{ color: 'var(--text-1)' }}>{t}</p>
                  <p className="text-xs" style={{ color: 'var(--text-4)' }}>Shows up frequently in your entries</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day mood trend */}
      {insights.moodTrend.length > 0 && (
        <div className="rounded-[20px] p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>7-Day Mood Trail</p>
          <div className="space-y-2">
            {insights.moodTrend.map((day, i) => (
              <div key={i} className="flex items-center gap-3">
                <p style={{ fontSize: '0.7rem', color: 'var(--text-4)', width: 60, flexShrink: 0 }}>{day.date}</p>
                {day.mood && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: getMoodColor(day.mood) + '20', color: getMoodColor(day.mood) }}>
                    {day.mood}
                  </span>
                )}
                {day.energy !== null && (
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="h-1.5 rounded-full" style={{ width: day.energy * 6, background: 'var(--violet)', opacity: 0.6 }} />
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-4)' }}>{day.energy}/10</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent wins */}
      {insights.wins.length > 0 && (
        <div className="rounded-[20px] p-4"
          style={{ background: 'rgba(90,140,120,0.08)', border: '1px solid rgba(90,140,120,0.15)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4" style={{ color: '#5A8A7A' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#5A8A7A' }}>Recent Wins</p>
          </div>
          {insights.wins.map((w, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-xs font-bold mt-0.5" style={{ color: '#5A8A7A' }}>✓</span>
              <p className="text-sm" style={{ color: 'var(--text-1)' }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recurring needs */}
      {insights.recurringNeeds.length > 0 && (
        <div className="rounded-[20px] p-4"
          style={{ background: 'rgba(155,92,255,0.08)', border: '1px solid rgba(155,92,255,0.15)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--violet)' }}>You Often Need</p>
          <div className="flex flex-wrap gap-2">
            {insights.recurringNeeds.map(n => (
              <span key={n} className="text-sm px-3 py-1 rounded-full"
                style={{ background: 'rgba(155,92,255,0.12)', color: 'var(--text-1)', border: '1px solid rgba(155,92,255,0.2)' }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
