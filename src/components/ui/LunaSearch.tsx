'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight } from 'lucide-react'

type AppEntry = {
  href:     string
  label:    string
  emoji:    string
  desc:     string
  tags:     string[]
  category: string
}

const ALL_APPS: AppEntry[] = [
  // Rituals
  { href: '/morning',          label: 'Morning Wake',      emoji: '🌅', desc: 'Soul check-in before the day starts',     tags: ['morning','wake','ritual','check-in'],             category: 'Rituals' },
  { href: '/midday',           label: 'Midday Check-in',   emoji: '☀️', desc: 'Pause, reset, and recalibrate',           tags: ['midday','midday','energy','reset'],               category: 'Rituals' },
  { href: '/night',            label: 'Night Protection',  emoji: '🌙', desc: 'Wind down, protect tomorrow',             tags: ['night','sleep','wind down','rest'],               category: 'Rituals' },
  { href: '/plan-my-day',      label: 'Plan My Day',       emoji: '🗓', desc: 'Map your day with intention',             tags: ['plan','schedule','organize','day'],               category: 'Rituals' },
  { href: '/weekly',           label: 'Weekly Reset',      emoji: '🔄', desc: 'Zoom out, refocus, clear the slate',      tags: ['weekly','reset','review','clear'],                category: 'Rituals' },
  // Astrology
  { href: '/astrology',        label: 'Astrology Hub',     emoji: '🌟', desc: 'Your cosmic home base',                  tags: ['astrology','cosmic','hub','stars'],               category: 'Astrology' },
  { href: '/astrology/daily',  label: 'Daily Reading',     emoji: '📖', desc: 'Horoscope, guidance, all life areas',    tags: ['horoscope','daily','reading','guidance'],         category: 'Astrology' },
  { href: '/astrology/transits', label: 'Daily Transits',  emoji: '🪐', desc: 'Current sky to your natal chart',        tags: ['transits','planets','aspects','natal'],           category: 'Astrology' },
  { href: '/astrology/birth-chart', label: 'Birth Chart',  emoji: '🗺', desc: 'Your natal blueprint',                  tags: ['birth chart','natal','placements','chart'],      category: 'Astrology' },
  { href: '/astrology/moon',   label: 'Moon Guidance',     emoji: '🌕', desc: 'Moon phase, sign, and rituals',          tags: ['moon','phase','lunar','sign'],                    category: 'Astrology' },
  { href: '/astrology/crystals', label: 'Crystals',        emoji: '💎', desc: 'Crystal guidance for your energy',       tags: ['crystals','healing','stones','energy'],           category: 'Astrology' },
  { href: '/astrology/retrogrades', label: 'Retrogrades',  emoji: '↩️', desc: 'Planets in retrograde and what they mean', tags: ['retrograde','mercury','planets'],              category: 'Astrology' },
  // Work
  { href: '/work',             label: 'Work Brief',        emoji: '💼', desc: 'DRYPHub, clients, and email',            tags: ['work','brief','clients','business'],              category: 'Work' },
  { href: '/career',           label: 'Career Compass',    emoji: '🧭', desc: 'Recognition, direction, Virgo MC',       tags: ['career','compass','direction','recognition'],     category: 'Work' },
  { href: '/email',            label: 'Email Coach',       emoji: '✉️', desc: 'Craft responses with intention',          tags: ['email','write','respond','communication'],        category: 'Work' },
  { href: '/tasks',            label: 'Tasks',             emoji: '✅', desc: 'Prioritized task list',                  tags: ['tasks','todo','list','priority'],                 category: 'Work' },
  { href: '/calendar',         label: 'Calendar',          emoji: '📅', desc: 'Schedule and time blocks',               tags: ['calendar','schedule','dates','time'],             category: 'Work' },
  // Personal
  { href: '/journal',          label: 'Journal',           emoji: '📓', desc: 'Write, reflect, release',               tags: ['journal','write','reflect','diary'],              category: 'Personal' },
  { href: '/dictation',        label: 'Dictation',         emoji: '🎙', desc: 'Speak your mind, LUNA listens',          tags: ['dictation','voice','speak','record'],             category: 'Personal' },
  { href: '/messages',         label: 'Messages',          emoji: '💬', desc: 'Communication coaching',                 tags: ['messages','communicate','coach','respond'],       category: 'Personal' },
  { href: '/relationships',    label: 'Relationships',     emoji: '💜', desc: 'Love, connection, boundaries',           tags: ['relationships','love','connection','people'],     category: 'Personal' },
  { href: '/money',            label: 'Money',             emoji: '💸', desc: 'Slow wealth and financial clarity',      tags: ['money','finances','wealth','income'],             category: 'Personal' },
  { href: '/creative',         label: 'Atelier',           emoji: '✂️', desc: 'Style Oracle, outfit, beauty',           tags: ['style','fashion','outfit','beauty','atelier'],    category: 'Personal' },
  { href: '/vault',            label: 'Vault',             emoji: '🗄', desc: 'Safe space for your ideas',              tags: ['vault','ideas','save','store','park'],            category: 'Personal' },
  // Soul & Growth
  { href: '/spirit',           label: 'Spirit',            emoji: '🔮', desc: 'Spiritual guidance, tarot, ritual',      tags: ['spirit','spiritual','tarot','ritual','divine'],   category: 'Soul & Growth' },
  { href: '/highest-self',     label: 'Highest Self',      emoji: '✦',  desc: 'Mirror of your fullest potential',       tags: ['highest self','potential','mirror','purpose'],    category: 'Soul & Growth' },
  { href: '/brain-dump',       label: 'Brain Dump',        emoji: '🧠', desc: 'Offload everything cluttering your mind', tags: ['brain dump','thoughts','clear','offload'],       category: 'Soul & Growth' },
  { href: '/lessons',          label: 'Lessons',           emoji: '🔖', desc: 'Track wisdom and what you\'ve learned',  tags: ['lessons','learn','growth','wisdom'],              category: 'Soul & Growth' },
  { href: '/growth',           label: 'Growth Analytics',  emoji: '⚡', desc: 'Mood trends, patterns, streak',          tags: ['growth','analytics','patterns','trends'],        category: 'Soul & Growth' },
  { href: '/memory',           label: 'Memory',            emoji: '📒', desc: 'Day-by-day reflections + AI coaching',   tags: ['memory','reflections','journal','coaching'],      category: 'Soul & Growth' },
]

const CATEGORIES = ['Rituals', 'Astrology', 'Work', 'Personal', 'Soul & Growth']

function filterApps(query: string): AppEntry[] {
  if (!query.trim()) return ALL_APPS
  const q = query.toLowerCase()
  return ALL_APPS.filter(a =>
    a.label.toLowerCase().includes(q) ||
    a.desc.toLowerCase().includes(q) ||
    a.tags.some(t => t.includes(q)) ||
    a.category.toLowerCase().includes(q)
  )
}

interface LunaSearchProps {
  onClose?: () => void
}

export function LunaSearchOverlay({ onClose }: LunaSearchProps) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<AppEntry[]>(ALL_APPS)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setResults(filterApps(query))
  }, [query])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function navigate(href: string) {
    onClose?.()
    router.push(href)
  }

  const grouped = query.trim()
    ? { 'Results': results }
    : Object.fromEntries(
        CATEGORIES.map(cat => [cat, ALL_APPS.filter(a => a.category === cat)])
      )

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'rgba(10,8,22,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}>

      {/* Search bar */}
      <div className="px-4 pt-safe flex items-center gap-3"
        style={{ paddingTop: 'max(56px, env(safe-area-inset-top))', paddingBottom: 12 }}>
        <div className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-[18px]"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search features, ask LUNA..."
            className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm focus:outline-none"
            style={{ fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>
          )}
        </div>
        <button onClick={onClose}
          className="text-sm font-semibold flex-shrink-0"
          style={{ color: 'rgba(185,139,255,0.9)' }}>
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-8" style={{ scrollbarWidth: 'none' }}>
        {results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No results for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            items.length > 0 && (
              <div key={cat} className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'rgba(185,139,255,0.45)' }}>
                  {cat}
                </p>
                <div className="space-y-1">
                  {items.map(app => (
                    <button
                      key={app.href}
                      onClick={() => navigate(app.href)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-left transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="text-xl flex-shrink-0 w-8 text-center">{app.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{app.label}</p>
                        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{app.desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </button>
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  )
}

// ─── Compact search bar trigger (embed in pages) ──────────────────────────────
export function LunaSearchBar({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-[18px] text-left transition-all ${className ?? ''}`}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
        }}>
        <Search className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
        <span className="text-sm" style={{ color: 'var(--text-4)' }}>Search LUNA...</span>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-lg"
          style={{ background: 'rgba(155,92,255,0.1)', color: 'var(--violet)' }}>
          ✦ All
        </span>
      </button>
      {open && <LunaSearchOverlay onClose={() => setOpen(false)} />}
    </>
  )
}
