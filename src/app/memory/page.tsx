'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { format, parseISO, isToday } from 'date-fns'
import {
  BookHeart, ChevronDown, ChevronUp, Sparkles, Star, TrendingUp,
  RefreshCw, Heart, Award, ArrowRight,
} from 'lucide-react'
import {
  getTransitReflectionsForDate, getAllReflectionDates,
  getDayCoaching, saveDayCoaching,
  type TransitReflection, type CoachingResult,
} from '@/lib/transitReflections'
import { getPatterns, type PatternEntry } from '@/lib/patterns'

interface CheckIn {
  id:            string
  type:          'morning' | 'midday' | 'night'
  date:          string
  created_at:    string
  sleep_rating:  number | null
  energy_rating: number | null
  mood_rating:   number | null
  feeling:       string | null
  on_mind:       string | null
  support_need:  string | null
  pride_goal:    string | null
  ai_response: {
    greeting?:         string
    affirmation?:      string
    first_step?:       string
    spiritual_message?: string
    ai_message?:       string
    self_care_action?: string
  } | null
}

const TYPE_CFG = {
  morning: { label: 'Morning', emoji: '🌅', color: '#A8C4DA' },
  midday:  { label: 'Midday',  emoji: '☀️', color: '#C9A96E' },
  night:   { label: 'Night',   emoji: '🌙', color: '#B89FD8' },
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#9b5cff',
  square:      '#C96B5A',
  opposition:  '#C9A96E',
  trine:       '#5A8A7A',
  sextile:     '#5A7A9A',
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function humanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    if (isToday(dt)) return 'Today'
    return format(dt, 'EEEE, MMMM d')
  } catch { return dateStr }
}

// ─── Rating dots ──────────────────────────────────────────────────────────────
function RatingDots({ value, max = 10 }: { value: number | null; max?: number }) {
  if (!value) return null
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: i < value ? 'var(--violet)' : 'var(--surface-border)' }} />
      ))}
    </div>
  )
}

// ─── Check-in card ────────────────────────────────────────────────────────────
function CheckInCard({ checkIn }: { checkIn: CheckIn }) {
  const [open, setOpen] = useState(false)
  const cfg = TYPE_CFG[checkIn.type]
  const createdAt = parseISO(checkIn.created_at)
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      <button className="w-full text-left px-4 py-3.5 flex items-center gap-3"
        onClick={() => setOpen(o => !o)}>
        <span className="text-lg flex-shrink-0">{cfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
            <span className="text-xs" style={{ color: 'var(--text-4)' }}>{format(createdAt, 'h:mm a')}</span>
          </div>
          {checkIn.feeling
            ? <p className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{checkIn.feeling}</p>
            : checkIn.ai_response?.affirmation
              ? <p className="text-sm italic truncate" style={{ color: 'var(--text-3)' }}>&ldquo;{checkIn.ai_response.affirmation}&rdquo;</p>
              : null
          }
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {checkIn.mood_rating && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(155,92,255,0.1)', color: 'var(--violet)' }}>
              {checkIn.mood_rating}/10
            </span>
          )}
          {open
            ? <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--text-4)' }} />
            : <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-4)' }} />
          }
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3"
          style={{ borderTop: '1px solid var(--surface-border)' }}>
          {(checkIn.sleep_rating || checkIn.energy_rating || checkIn.mood_rating) && (
            <div className="grid grid-cols-3 gap-3 pt-3">
              {checkIn.sleep_rating  && <div><p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Sleep</p><RatingDots value={checkIn.sleep_rating} /></div>}
              {checkIn.energy_rating && <div><p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Energy</p><RatingDots value={checkIn.energy_rating} /></div>}
              {checkIn.mood_rating   && <div><p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Mood</p><RatingDots value={checkIn.mood_rating} /></div>}
            </div>
          )}
          {checkIn.feeling     && <div><p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>How you felt</p><p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{checkIn.feeling}</p></div>}
          {checkIn.on_mind     && <div><p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>On your mind</p><p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{checkIn.on_mind}</p></div>}
          {checkIn.pride_goal  && <div><p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Proud of / working toward</p><p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{checkIn.pride_goal}</p></div>}
          {checkIn.ai_response && (
            <div className="rounded-2xl p-3 space-y-2"
              style={{ background: 'rgba(155,92,255,0.06)', border: '1px solid rgba(155,92,255,0.12)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>LUNA said</span>
              </div>
              {checkIn.ai_response.affirmation && <p className="text-sm italic" style={{ color: 'var(--text-1)' }}>&ldquo;{checkIn.ai_response.affirmation}&rdquo;</p>}
              {checkIn.ai_response.first_step  && <p className="text-sm" style={{ color: 'var(--text-2)' }}>{checkIn.ai_response.first_step}</p>}
              {checkIn.ai_response.ai_message  && <p className="text-sm italic" style={{ color: 'var(--text-3)' }}>{checkIn.ai_response.ai_message}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Transit reflection card ──────────────────────────────────────────────────
function TransitReflectionCard({ reflection }: { reflection: TransitReflection }) {
  const [open, setOpen] = useState(false)
  const color = ASPECT_COLORS[reflection.aspect] ?? 'var(--violet)'
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: `1px solid ${color}25` }}>
      <button className="w-full text-left px-4 py-3.5 flex items-center gap-3"
        onClick={() => setOpen(o => !o)}>
        <span className="text-lg flex-shrink-0">🪐</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold mb-0.5" style={{ color }}>{reflection.transit}</p>
          <p className="text-sm truncate" style={{ color: 'var(--text-2)' }}>{reflection.reflection}</p>
        </div>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
          : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3"
          style={{ borderTop: `1px solid ${color}18` }}>
          <div className="pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color }}>Question</p>
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-2)' }}>{reflection.question}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Your reflection</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{reflection.reflection}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pattern chips ────────────────────────────────────────────────────────────
function PatternChips({ patterns }: { patterns: PatternEntry[] }) {
  if (!patterns.length) return null
  const byContext: Record<string, string[]> = {}
  patterns.forEach(p => {
    if (!byContext[p.context]) byContext[p.context] = []
    if (!byContext[p.context].includes(p.value)) byContext[p.context].push(p.value)
  })
  return (
    <div className="space-y-3">
      {Object.entries(byContext).slice(0, 4).map(([ctx, vals]) => (
        <div key={ctx}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-4)' }}>{ctx}</p>
          <div className="flex flex-wrap gap-1.5">
            {vals.slice(0, 4).map(v => (
              <span key={v} className="px-2.5 py-1 rounded-full text-xs"
                style={{ background: 'rgba(155,92,255,0.1)', color: 'var(--text-2)', border: '1px solid rgba(155,92,255,0.18)' }}>
                {v}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Coaching panel ───────────────────────────────────────────────────────────
function CoachingPanel({ date, checkIns, transitReflections, patterns }: {
  date:               string
  checkIns:           CheckIn[]
  transitReflections: TransitReflection[]
  patterns:           PatternEntry[]
}) {
  const [coaching, setCoaching] = useState<CoachingResult | null>(() => getDayCoaching(date))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const hasData = checkIns.length > 0 || transitReflections.length > 0 || patterns.length > 0

  async function generateCoaching() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ai/growth-coaching', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          checkIns: checkIns.map(c => ({
            type:          c.type,
            feeling:       c.feeling,
            on_mind:       c.on_mind,
            support_need:  c.support_need,
            pride_goal:    c.pride_goal,
            mood_rating:   c.mood_rating,
            energy_rating: c.energy_rating,
            sleep_rating:  c.sleep_rating,
            ai_response:   c.ai_response,
          })),
          transitReflections,
          patterns: patterns.slice(-30).map(p => ({ type: p.type, context: p.context, value: p.value, source: p.source })),
        }),
      })
      const result: CoachingResult = await res.json()
      if (!res.ok || (result as { error?: string }).error) {
        const detail = (result as { detail?: string; error?: string }).detail ?? (result as { error?: string }).error ?? 'Unknown error'
        throw new Error(detail)
      }
      saveDayCoaching(date, result)
      setCoaching(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate coaching. Try again.')
    }
    setLoading(false)
  }

  if (!hasData) {
    return (
      <div className="rounded-[20px] p-5 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Complete check-ins or reflect on transits to unlock daily coaching.
        </p>
      </div>
    )
  }

  if (!coaching) {
    return (
      <div className="rounded-[20px] p-5 text-center space-y-3"
        style={{ background: 'linear-gradient(145deg, #16133A, #1F1848)', border: '1px solid rgba(155,92,255,0.25)' }}>
        <Sparkles className="h-6 w-6 mx-auto" style={{ color: 'rgba(185,139,255,0.8)' }} />
        <p className="text-base font-bold text-white">Get your daily coaching</p>
        <p className="text-sm" style={{ color: 'rgba(185,139,255,0.7)' }}>
          LUNA reviews your check-ins, transit reflections, and patterns — then gives you deep personalized feedback on your path to your highest self.
        </p>
        <button onClick={generateCoaching} disabled={loading}
          className="w-full py-3 rounded-[14px] text-sm font-bold transition-all"
          style={{ background: 'var(--violet)', color: 'white', opacity: loading ? 0.7 : 1 }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              LUNA is reflecting on your day...
            </span>
          ) : 'Generate my daily coaching →'}
        </button>
        {error && <p className="text-xs" style={{ color: '#C96B5A' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Score + theme */}
      <div className="rounded-[20px] p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #16133A, #1F1848)', border: '1px solid rgba(155,92,255,0.3)' }}>
        <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 0%, rgba(155,92,255,0.25), transparent 60%)', filter: 'blur(20px)' }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(185,139,255,0.6)' }}>Growth Score</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-white">{coaching.growth_score}</span>
                <span className="text-lg text-white/40 pb-1">/10</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(185,139,255,0.6)' }}>Theme</p>
              <p className="text-2xl font-bold capitalize" style={{ color: 'rgba(185,139,255,0.95)' }}>{coaching.theme}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full"
              style={{ width: `${coaching.growth_score * 10}%`, background: 'linear-gradient(90deg, #9b5cff, #C9A96E)' }} />
          </div>
        </div>
      </div>

      {/* What went well */}
      <div className="rounded-[20px] p-4 space-y-2"
        style={{ background: 'rgba(90,140,120,0.08)', border: '1px solid rgba(90,140,120,0.2)' }}>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4" style={{ color: '#5A8A7A' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#5A8A7A' }}>What you did well</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{coaching.did_well}</p>
      </div>

      {/* Where to grow */}
      <div className="rounded-[20px] p-4 space-y-2"
        style={{ background: 'rgba(201,107,90,0.08)', border: '1px solid rgba(201,107,90,0.2)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: '#C96B5A' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#C96B5A' }}>Where you can grow</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{coaching.improve}</p>
      </div>

      {/* Highest self */}
      <div className="rounded-[20px] p-4 space-y-2"
        style={{ background: 'rgba(155,92,255,0.08)', border: '1px solid rgba(155,92,255,0.2)' }}>
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4" style={{ color: 'var(--violet)' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Your highest self</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{coaching.highest_self}</p>
      </div>

      {/* Next time */}
      <div className="rounded-[20px] p-4 space-y-2"
        style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)' }}>
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#C9A96E' }}>What to do next time</p>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{coaching.next_time}</p>
      </div>

      {/* Affirmation */}
      <div className="rounded-[20px] p-5 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(155,92,255,0.1), rgba(201,169,110,0.07))', border: '1px solid rgba(155,92,255,0.2)' }}>
        <Heart className="h-4 w-4 mx-auto mb-2" style={{ color: 'var(--violet)' }} />
        <p className="text-sm font-semibold italic leading-relaxed" style={{ color: 'var(--text-1)' }}>
          &ldquo;{coaching.affirmation}&rdquo;
        </p>
      </div>

      {/* Regenerate */}
      <button onClick={generateCoaching} disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-[14px] text-xs font-semibold"
        style={{ background: 'transparent', color: 'var(--text-4)', border: '1px solid var(--surface-border)' }}>
        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Reflecting...' : 'Regenerate coaching'}
      </button>
    </div>
  )
}

// ─── Day strip ────────────────────────────────────────────────────────────────
function DayStrip({ dates, selected, onSelect }: {
  dates:    string[]
  selected: string
  onSelect: (d: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
      {dates.map(d => {
        const isSelected = d === selected
        const [, , day] = d.split('-')
        const dateObj = new Date(d + 'T12:00:00')
        const dayLabel = isToday(dateObj) ? 'Today' : format(dateObj, 'EEE')
        return (
          <button key={d} onClick={() => onSelect(d)}
            className="flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-[16px] transition-all"
            style={{
              background: isSelected ? 'var(--violet)' : 'var(--surface)',
              border:     `1px solid ${isSelected ? 'var(--violet)' : 'var(--surface-border)'}`,
              minWidth:   60,
            }}>
            <p className="text-xs font-bold mb-0.5" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-4)' }}>{dayLabel}</p>
            <p className="text-lg font-bold leading-none" style={{ color: isSelected ? 'white' : 'var(--text-1)' }}>{parseInt(day)}</p>
          </button>
        )
      })}
    </div>
  )
}

// ─── Section toggle ───────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count, open, onToggle, accent }: {
  icon:     string
  label:    string
  count:    number
  open:     boolean
  onToggle: () => void
  accent?:  string
}) {
  return (
    <button className="w-full flex items-center justify-between mb-3" onClick={onToggle}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <p className="text-sm font-bold uppercase tracking-wider" style={{ color: accent ?? 'var(--text-3)' }}>{label}</p>
        {count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'rgba(155,92,255,0.12)', color: 'var(--violet)' }}>
            {count}
          </span>
        )}
      </div>
      {open
        ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
        : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
      }
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
interface LunaMemoryEntry { date_key: string; summary: string; source: string }

export default function MemoryPage() {
  const today = toDateStr(new Date())

  const [lunaMemory,   setLunaMemory]   = useState<LunaMemoryEntry[]>([])
  const [allCheckIns,  setAllCheckIns]  = useState<CheckIn[]>([])
  const [loadingCI,    setLoadingCI]    = useState(true)
  const [reflDates,    setReflDates]    = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(today)

  const [dayCheckIns,  setDayCheckIns]  = useState<CheckIn[]>([])
  const [dayRefl,      setDayRefl]      = useState<TransitReflection[]>([])
  const [dayPatterns,  setDayPatterns]  = useState<PatternEntry[]>([])

  const [showTransits, setShowTransits] = useState(true)
  const [showCheckIns, setShowCheckIns] = useState(true)
  const [showPatterns, setShowPatterns] = useState(false)
  const [showCoaching, setShowCoaching] = useState(true)

  const loadCheckIns = useCallback(async () => {
    try {
      const res = await fetch('/api/check-ins?limit=90')
      const data = await res.json()
      setAllCheckIns(data.checkIns || [])
    } catch { setAllCheckIns([]) }
    finally { setLoadingCI(false) }
  }, [])

  useEffect(() => { loadCheckIns() }, [loadCheckIns])

  useEffect(() => {
    fetch('/api/luna/memory')
      .then(r => r.json())
      .then(d => setLunaMemory(d.entries ?? []))
      .catch(() => setLunaMemory([]))
  }, [])

  // Load localStorage data whenever selected date changes
  useEffect(() => {
    const reflections = getTransitReflectionsForDate(selectedDate)
    setDayRefl(reflections)
    setReflDates(getAllReflectionDates())

    const dayStart = new Date(selectedDate + 'T00:00:00').getTime()
    const dayEnd   = dayStart + 86400_000
    setDayPatterns(getPatterns(90).filter(p => p.ts >= dayStart && p.ts < dayEnd))
  }, [selectedDate])

  useEffect(() => {
    setDayCheckIns(allCheckIns.filter(c => c.date === selectedDate))
  }, [allCheckIns, selectedDate])

  // Build available date list
  const availableDates = (() => {
    const ciDates = allCheckIns.map(c => c.date)
    const allDts  = [...new Set([today, ...ciDates, ...reflDates])].sort((a, b) => b.localeCompare(a)).slice(0, 30)
    return allDts
  })()

  // Stats
  const totalDays      = new Set(allCheckIns.map(c => c.date)).size
  const allMoods       = allCheckIns.filter(c => c.mood_rating).map(c => c.mood_rating!)
  const avgMood        = allMoods.length ? (allMoods.reduce((s, v) => s + v, 0) / allMoods.length).toFixed(1) : null
  const totalReflCount = reflDates.reduce((sum, d) => sum + getTransitReflectionsForDate(d).length, 0)

  const hasAnything = dayCheckIns.length > 0 || dayRefl.length > 0 || dayPatterns.length > 0
  const cachedScore = getDayCoaching(selectedDate)?.growth_score

  return (
    <AppLayout>
      <div className="space-y-5 pt-4 pb-nav">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookHeart className="h-5 w-5" style={{ color: 'var(--violet)' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Memory</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Your reflections, check-ins, and daily coaching — all in one place.
          </p>
        </div>

        {/* What LUNA Remembers — durable, cross-day memory built nightly from chat + check-ins */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>
              What LUNA Remembers
            </p>
          </div>
          {lunaMemory.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Nothing yet — each night, LUNA reviews that day's chat and check-ins and keeps
              what's worth remembering here. Chat with her today and check back tomorrow.
            </p>
          ) : (
            <div className="space-y-3">
              {lunaMemory.slice(0, 7).map(m => (
                <div key={m.date_key}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-3)' }}>
                    {humanDate(m.date_key)}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{m.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats strip */}
        {!loadingCI && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 text-center dark-card">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{totalDays}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Days tracked</p>
            </div>
            <div className="rounded-2xl p-4 text-center dark-card">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{avgMood ?? '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Avg mood</p>
            </div>
            <div className="rounded-2xl p-4 text-center dark-card">
              <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{totalReflCount}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Transit notes</p>
            </div>
          </div>
        )}

        {/* Day selector */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-4)' }}>Browse by day</p>
          {loadingCI
            ? <div className="flex gap-2">{[1,2,3,4,5].map(i => <div key={i} className="h-[60px] w-[60px] rounded-[16px] shimmer flex-shrink-0" />)}</div>
            : <DayStrip dates={availableDates} selected={selectedDate} onSelect={setSelectedDate} />
          }
        </div>

        {/* Day heading */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{humanDate(selectedDate)}</h2>
          {cachedScore && (
            <span className="text-xs px-3 py-1 rounded-full font-bold"
              style={{ background: 'rgba(155,92,255,0.12)', color: 'var(--violet)', border: '1px solid rgba(155,92,255,0.2)' }}>
              ✦ {cachedScore}/10
            </span>
          )}
        </div>

        {loadingCI ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl shimmer" />)}
          </div>
        ) : !hasAnything ? (
          <div className="rounded-[20px] p-8 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <span className="text-4xl block mb-3">🌙</span>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
              Nothing recorded for {humanDate(selectedDate).toLowerCase()}.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Complete a check-in or tap any transit to add a reflection.
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Transit Reflections */}
            {dayRefl.length > 0 && (
              <div>
                <SectionHeader icon="🪐" label="Transit Reflections" count={dayRefl.length}
                  open={showTransits} onToggle={() => setShowTransits(o => !o)} />
                {showTransits && (
                  <div className="space-y-2">
                    {dayRefl.map(r => <TransitReflectionCard key={r.id} reflection={r} />)}
                  </div>
                )}
              </div>
            )}

            {/* Check-ins */}
            {dayCheckIns.length > 0 && (
              <div>
                <SectionHeader icon="✅" label="Check-ins" count={dayCheckIns.length}
                  open={showCheckIns} onToggle={() => setShowCheckIns(o => !o)} />
                {showCheckIns && (
                  <div className="space-y-2">
                    {dayCheckIns.map(c => <CheckInCard key={c.id} checkIn={c} />)}
                  </div>
                )}
              </div>
            )}

            {/* Patterns */}
            {dayPatterns.length > 0 && (
              <div>
                <SectionHeader icon="💬" label="Notes & Selections" count={dayPatterns.length}
                  open={showPatterns} onToggle={() => setShowPatterns(o => !o)} />
                {showPatterns && (
                  <div className="rounded-[18px] p-4"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <PatternChips patterns={dayPatterns} />
                  </div>
                )}
              </div>
            )}

            {/* LUNA Daily Coaching */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button className="flex items-center gap-2" onClick={() => setShowCoaching(o => !o)}>
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                  <p className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Daily Coaching</p>
                  {showCoaching
                    ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
                    : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
                  }
                </button>
              </div>
              {showCoaching && (
                <CoachingPanel
                  date={selectedDate}
                  checkIns={dayCheckIns}
                  transitReflections={dayRefl}
                  patterns={dayPatterns}
                />
              )}
            </div>

          </div>
        )}
      </div>
    </AppLayout>
  )
}
