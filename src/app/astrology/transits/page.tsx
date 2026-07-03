'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Zap, Sparkles, PenLine, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'
import {
  saveTransitReflection, getTransitReflectionForTransit,
  type TransitReflection,
} from '@/lib/transitReflections'

type Aspect = {
  transiting:    string
  natal:         string
  type:          string
  emoji:         string
  orb:           number
  applying:      boolean
  interpretation: string
  natalSign:     string
  natalDegree:   number
  transitSign:   string
  transitDegree: number
  energy:        string
}

type TransitData = {
  aspects:              Aspect[]
  major_aspects:        Aspect[]
  supportive_aspects:   Aspect[]
  daily_theme:          string
  moon_house:           number | null
  moon_house_meaning:   string | null
  active_natal_points:  string[]
}

const ASPECT_COLORS: Record<string, string> = {
  conjunction: '#9b5cff',
  square:      '#C96B5A',
  opposition:  '#C9A96E',
  trine:       '#5A8A7A',
  sextile:     '#5A7A9A',
}

const ORDINALS: Record<number, string> = {
  1:'1st', 2:'2nd', 3:'3rd', 4:'4th', 5:'5th', 6:'6th',
  7:'7th', 8:'8th', 9:'9th', 10:'10th', 11:'11th', 12:'12th',
}

function getReflectionQuestion(aspect: Aspect): string {
  const planet = aspect.natal
  const type   = aspect.type
  const tp     = aspect.transiting

  if (type === 'opposition') {
    return `${tp} opposing your ${planet} — what tension, push-pull, or awareness is coming up today around ${planet.toLowerCase()}?`
  }
  if (type === 'square') {
    return `${tp} squaring your ${planet} — where do you feel the friction or resistance today? What is it asking you to grow through?`
  }
  if (type === 'trine') {
    return `${tp} flowing with your ${planet} — what feels easy, natural, or gifted today? What beauty or abundance is available?`
  }
  if (type === 'sextile') {
    return `${tp} supporting your ${planet} — what gentle opportunity or inspired action is showing up today?`
  }
  if (type === 'conjunction') {
    return `${tp} merging with your ${planet} — what feels amplified or intensified today? What truth is trying to surface?`
  }
  return `What do you notice in your life today around ${planet.toLowerCase()}?`
}

// ─── Transit card with reflection ────────────────────────────────────────────
function TransitCard({ aspect, today }: { aspect: Aspect; today: string }) {
  const transitKey   = `${aspect.transiting} ${aspect.type} natal ${aspect.natal}`
  const color        = ASPECT_COLORS[aspect.type] ?? 'var(--violet)'
  const question     = getReflectionQuestion(aspect)

  const [open,       setOpen]       = useState(false)
  const [reflText,   setReflText]   = useState('')
  const [saved,      setSaved]      = useState<TransitReflection | null>(null)
  const [justSaved,  setJustSaved]  = useState(false)

  // Load existing reflection on mount
  useEffect(() => {
    const existing = getTransitReflectionForTransit(today, transitKey)
    if (existing) {
      setSaved(existing)
      setReflText(existing.reflection)
    }
  }, [today, transitKey])

  function handleSave() {
    if (!reflText.trim()) return
    const entry = saveTransitReflection({
      date:       today,
      transit:    transitKey,
      aspect:     aspect.type,
      planets:    `${aspect.transiting} · ${aspect.natal}`,
      reflection: reflText.trim(),
      question,
    })
    setSaved(entry)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  return (
    <div className="rounded-[20px] overflow-hidden"
      style={{ background: 'var(--surface)', border: `1px solid ${color}28` }}>

      {/* Header row */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl flex-shrink-0">{aspect.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                {aspect.transiting} {aspect.type} natal {aspect.natal}
              </p>
              <div className="flex gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: color + '20', color }}>
                  {aspect.orb}° orb
                </span>
                {aspect.applying && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(90,140,120,0.2)', color: '#5A8A7A' }}>
                    applying
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-4)', marginTop: 2 }}>
              {aspect.transiting} in {aspect.transitDegree}° {aspect.transitSign} → natal {aspect.natal} in {aspect.natalDegree}° {aspect.natalSign}
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-2)' }}>
          {aspect.interpretation}
        </p>
        <p className="text-xs italic mb-3" style={{ color: 'var(--text-4)' }}>{aspect.energy}</p>

        {/* Reflect toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
          style={{
            background: saved ? 'rgba(90,140,120,0.15)' : `${color}14`,
            color:      saved ? '#5A8A7A' : color,
            border:     `1px solid ${saved ? 'rgba(90,140,120,0.25)' : color + '30'}`,
          }}>
          {saved ? <Check className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
          {saved ? 'Reflected ·' : 'Reflect on this'}
          {saved && <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>tap to edit</span>}
          {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
        </button>
      </div>

      {/* Reflection panel */}
      {open && (
        <div className="px-4 pb-4 pt-0"
          style={{ borderTop: `1px solid ${color}18` }}>

          {/* Existing reflection preview */}
          {saved && !justSaved && (
            <div className="mb-3 rounded-[14px] p-3"
              style={{ background: 'rgba(90,140,120,0.08)', border: '1px solid rgba(90,140,120,0.18)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#5A8A7A' }}>Your reflection</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{saved.reflection}</p>
            </div>
          )}

          {justSaved && (
            <div className="mb-3 rounded-[14px] p-3 flex items-center gap-2"
              style={{ background: 'rgba(90,140,120,0.1)', border: '1px solid rgba(90,140,120,0.25)' }}>
              <Check className="h-4 w-4" style={{ color: '#5A8A7A' }} />
              <p className="text-sm font-semibold" style={{ color: '#5A8A7A' }}>Saved to your memory.</p>
            </div>
          )}

          {/* The reflection question + SmartInput */}
          <div className="rounded-[16px] p-3 mb-3"
            style={{ background: `${color}0a`, border: `1px solid ${color}18` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color }}>Reflection question</p>
            <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-1)' }}>{question}</p>
          </div>

          <SmartInput
            context={question}
            placeholder="Speak or tap what comes up for you..."
            value={reflText}
            onChange={setReflText}
            patternType="transit_reflection"
            rows={3}
            history={saved ? [saved.reflection] : []}
          />

          <button
            onClick={handleSave}
            disabled={!reflText.trim()}
            className="mt-3 w-full py-2.5 rounded-[14px] text-sm font-semibold transition-all"
            style={{
              background: reflText.trim() ? color : 'var(--surface-border)',
              color:      reflText.trim() ? 'white' : 'var(--text-4)',
            }}>
            {saved ? 'Update reflection' : 'Save to memory'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TransitsPage() {
  const [data,   setData]   = useState<TransitData | null>(null)
  const [loading,setLoading]= useState(true)
  const [filter, setFilter] = useState<'all' | 'major' | 'supportive'>('all')

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fetch('/api/astrology/transits')
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const displayed = !data ? [] : filter === 'all' ? data.aspects : filter === 'major' ? data.major_aspects : data.supportive_aspects

  return (
    <div className="min-h-screen bg-app">
      <AppLayout>
        <div className="flex items-center gap-3 mb-5 pt-2">
          <Link href="/astrology">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Daily Transits</h1>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>Current sky · tap any transit to reflect</p>
          </div>
          <Link href="/memory">
            <div className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(155,92,255,0.15)', color: 'var(--violet)', border: '1px solid rgba(155,92,255,0.25)' }}>
              📖 Memory
            </div>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-[20px] shimmer" />)}</div>
        ) : data ? (
          <>
            {/* Daily theme */}
            <div className="relative rounded-[22px] p-5 mb-4 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #16133A 0%, #1F1848 60%, #16133A 100%)', border: '1px solid rgba(155,92,255,0.25)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 100% 0%, rgba(155,92,255,0.2) 0%, transparent 60%)', filter: 'blur(16px)' }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" style={{ color: 'rgba(185,139,255,0.7)' }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(185,139,255,0.6)' }}>Today's Theme</p>
                </div>
                <p className="text-sm leading-relaxed text-white">{data.daily_theme}</p>
                {data.moon_house && data.moon_house_meaning && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-sm" style={{ color: 'rgba(185,139,255,0.8)' }}>
                      🌙 Moon in your <strong className="text-white">{ORDINALS[data.moon_house]} house</strong>
                      {' '}— {data.moon_house_meaning}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Active natal points */}
            {data.active_natal_points.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-4">
                <p className="text-xs font-bold uppercase tracking-wider self-center mr-1" style={{ color: 'var(--text-4)' }}>Activated today:</p>
                {data.active_natal_points.map(pt => (
                  <span key={pt} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(155,92,255,0.15)', color: 'var(--violet)', border: '1px solid rgba(155,92,255,0.25)' }}>
                    {pt}
                  </span>
                ))}
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4">
              {(['all','major','supportive'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: filter === f ? 'var(--violet)' : 'var(--surface)',
                    color:      filter === f ? 'white' : 'var(--text-3)',
                    border:     `1px solid ${filter === f ? 'var(--violet)' : 'var(--surface-border)'}`,
                  }}>
                  {f === 'all' ? `All (${data.aspects.length})` : f === 'major' ? `Tension (${data.major_aspects.length})` : `Flow (${data.supportive_aspects.length})`}
                </button>
              ))}
            </div>

            {/* Aspect cards with reflection */}
            {displayed.length === 0 ? (
              <div className="rounded-[20px] p-6 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No {filter === 'major' ? 'tension' : 'flowing'} aspects active right now.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayed.map((a, i) => (
                  <TransitCard key={i} aspect={a} today={today} />
                ))}
              </div>
            )}

            {/* Prompt to go to memory */}
            <div className="mt-5 rounded-[18px] p-4 flex items-center gap-3"
              style={{ background: 'rgba(155,92,255,0.08)', border: '1px solid rgba(155,92,255,0.15)' }}>
              <Zap className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--violet)' }} />
              <div className="flex-1">
                <p className="text-xs font-bold" style={{ color: 'var(--violet)' }}>Your reflections go to Memory</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>LUNA coaches you daily based on what you notice.</p>
              </div>
              <Link href="/memory">
                <span className="text-xs font-bold" style={{ color: 'var(--violet)' }}>View →</span>
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-[20px] p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p style={{ color: 'var(--text-3)' }}>Could not load transit data.</p>
          </div>
        )}
      </AppLayout>
    </div>
  )
}
