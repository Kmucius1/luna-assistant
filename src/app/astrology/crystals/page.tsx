'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Gem, ChevronDown, ChevronRight } from 'lucide-react'
import crystalsData from '@/data/crystals/crystals.json'

type MoonData = {
  phase: { name: string; emoji: string }
  sign: { name: string; emoji: string }
}

interface CrystalEntry {
  name: string; color: string; lightColor: string; emoji: string
  signs: string[]; phases: string[]; moods: string[]
  properties: string; howToUse: string; affirmation: string; chakra: string; lunaNote: string
}
const CRYSTAL_LIBRARY = crystalsData as CrystalEntry[]

const THEME_VARS = {
  '--text-1': '#100C1E',
  '--text-2': '#32284A',
  '--text-3': '#5E5474',
  '--text-4': '#8A8098',
  '--violet': '#C9A96E',
  '--surface': 'rgba(255,255,255,0.6)',
  '--surface-border': 'rgba(180,150,100,0.2)',
  background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
} as React.CSSProperties

function CrystalCard({ c, expanded, onToggle }: {
  c: typeof CRYSTAL_LIBRARY[0]
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button onClick={onToggle} className="w-full rounded-[20px] p-4 text-left"
      style={{ background: 'var(--surface)', border: `1px solid ${expanded ? c.color + '44' : 'var(--surface-border)'}` }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: c.color + '22', border: `1px solid ${c.color}33` }}>
          {c.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{c.name}</p>
          <p className="text-xs" style={{ color: 'var(--text-4)' }}>{c.properties}</p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                  : <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />}
      </div>

      {expanded && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--surface-border)' }}>
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[...c.signs, ...c.phases].slice(0, 4).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: c.color + '18', color: c.lightColor, border: `1px solid ${c.color}25` }}>
                {tag}
              </span>
            ))}
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--violet)', border: '1px solid rgba(201,169,110,0.2)' }}>
              {c.chakra}
            </span>
          </div>

          {/* LUNA note */}
          <div className="rounded-[14px] p-3 mb-3"
            style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>LUNA</p>
            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-1)' }}>{c.lunaNote}</p>
          </div>

          {/* How to use */}
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-4)' }}>How to Use</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{c.howToUse}</p>
          </div>

          {/* Affirmation */}
          <div className="rounded-[14px] p-3"
            style={{ background: c.color + '10', border: `1px solid ${c.color}20` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: c.lightColor }}>Affirmation</p>
            <p className="text-sm italic" style={{ color: 'var(--text-1)' }}>{c.affirmation}</p>
          </div>
        </div>
      )}
    </button>
  )
}

export default function CrystalsPage() {
  const [moon, setMoon] = useState<MoonData | null>(null)
  const [filter, setFilter] = useState<'today' | 'all'>('today')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json()).then(setMoon).catch(() => {})
  }, [])

  const sign = moon?.sign?.name
  const phase = moon?.phase?.name

  const todaysCrystals = CRYSTAL_LIBRARY.filter(c =>
    (sign && (c.signs.includes(sign) || c.signs.includes('all'))) ||
    (phase && c.phases.some(p => phase.includes(p) || p === 'all'))
  )

  const displayed = filter === 'today' ? todaysCrystals : CRYSTAL_LIBRARY

  return (
    <div className="min-h-screen" style={THEME_VARS}>
      <AppLayout>
        <div className="flex items-center gap-3 mb-5 pt-2">
          <Link href="/astrology">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Crystal Match</h1>
        </div>

        {/* Moon context */}
        {moon && (
          <div className="rounded-[20px] p-4 mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Gem className="h-4 w-4" style={{ color: 'var(--violet)' }} />
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Crystal Recommendation Today</p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-1)' }}>
              Based on {moon.phase.emoji} {moon.phase.name} in {moon.sign.emoji} {moon.sign.name}
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-2 mb-5">
          {(['today','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filter === f ? 'var(--violet)' : 'var(--surface)',
                color: filter === f ? '#100C1E' : 'var(--text-3)',
                border: `1px solid ${filter === f ? 'var(--violet)' : 'var(--surface-border)'}`,
              }}>
              {f === 'today' ? `Today (${todaysCrystals.length})` : `Full Library (${CRYSTAL_LIBRARY.length})`}
            </button>
          ))}
        </div>

        {/* Crystal cards */}
        <div className="space-y-2">
          {displayed.map(c => (
            <CrystalCard key={c.name} c={c}
              expanded={expanded === c.name}
              onToggle={() => setExpanded(expanded === c.name ? null : c.name)} />
          ))}
        </div>
      </AppLayout>
    </div>
  )
}
