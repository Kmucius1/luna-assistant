'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react'

type MoonData = {
  phase: { name: string; emoji: string; illumination: number }
  sign: { name: string; emoji: string }
}

type RitualContext = {
  intention: string
  ritual: string[]
  release: string[]
  avoid: string
}

const ZOE_RITUAL_ELEMENTS: Record<string, { scents: string[]; colors: string[]; crystals: string[]; elements: string[] }> = {
  Aries:       { scents:['cinnamon','black pepper','ginger'], colors:['red','orange'], crystals:['carnelian','red jasper'], elements:['fire','candle'] },
  Taurus:      { scents:['rose','vanilla','sandalwood'], colors:['green','gold'], crystals:['rose quartz','malachite'], elements:['earth','flowers'] },
  Gemini:      { scents:['peppermint','lavender','eucalyptus'], colors:['yellow','silver'], crystals:['citrine','clear quartz'], elements:['air','journal'] },
  Cancer:      { scents:['jasmine','ylang ylang','coconut'], colors:['silver','white'], crystals:['moonstone','selenite'], elements:['water','bath','tea'] },
  Leo:         { scents:['frankincense','amber','bergamot'], colors:['gold','orange'], crystals:['sunstone','tiger eye'], elements:['fire','sun','mirror'] },
  Virgo:       { scents:['lavender','rosemary','neroli'], colors:['sage','navy'], crystals:['amazonite','amethyst'], elements:['earth','herbs','lists'] },
  Libra:       { scents:['rose','peony','lily'], colors:['pink','light blue'], crystals:['rose quartz','lapis lazuli'], elements:['air','flowers','beauty'] },
  Scorpio:     { scents:['patchouli','dark rose','oud'], colors:['deep red','black'], crystals:['obsidian','black tourmaline'], elements:['water','candle','shadow work'] },
  Sagittarius: { scents:['sage','cedar','citrus'], colors:['purple','gold'], crystals:['lapis lazuli','sodalite'], elements:['fire','travel object','journal'] },
  Capricorn:   { scents:['vetiver','cedar','frankincense'], colors:['charcoal','forest green'], crystals:['smoky quartz','garnet'], elements:['earth','structure','goals'] },
  Aquarius:    { scents:['eucalyptus','star anise','violet'], colors:['electric blue','silver'], crystals:['amethyst','labradorite'], elements:['air','community','innovation'] },
  Pisces:      { scents:['ocean','jasmine','vanilla'], colors:['sea blue','lavender'], crystals:['aquamarine','moonstone'], elements:['water','dreams','art'] },
}

const PERSONAL_RITUAL_OVERLAY = {
  moonSign: 'Cancer',
  note: 'Your natal Moon in Cancer means any ritual involving water, warmth, and emotional safety will land deeper for you regardless of what sign the transiting Moon is in. Tea, bath, soft candlelight, and quiet are your personal ritual foundation.',
}

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

export default function RitualsPage() {
  const [moon, setMoon] = useState<MoonData | null>(null)
  const [context, setContext] = useState<RitualContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/astrology/moon?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json())
      .then(async moon => {
        setMoon(moon)
        const res = await fetch(`/api/astrology/rituals?phase=${encodeURIComponent(moon.phase.name)}&sign=${encodeURIComponent(moon.sign.name)}`)
        if (res.ok) { const c = await res.json(); setContext(c) }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function toggleStep(step: string) {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
  }

  const sign = moon?.sign?.name ?? 'Cancer'
  const elements = ZOE_RITUAL_ELEMENTS[sign] ?? ZOE_RITUAL_ELEMENTS.Cancer
  const isNewMoon = moon?.phase?.name?.includes('New') ?? false
  const isFullMoon = moon?.phase?.name?.includes('Full') ?? false

  // Build ritual steps from API context or fallback
  const ritualSteps: string[] = context?.ritual ?? [
    'Light a candle in a quiet space',
    'Sit in stillness for 5 minutes and breathe slowly',
    'Write one clear intention or one release on paper',
    'Hold a crystal and speak your intention aloud',
    'Close with gratitude',
  ]

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
          <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Moon Rituals</h1>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-[20px] shimmer" />)}</div>
        ) : (
          <>
            {/* Current moon header */}
            <div className="relative rounded-[22px] p-5 mb-4 overflow-hidden"
              style={{ background: 'linear-gradient(145deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.24) 60%, rgba(201,169,110,0.10) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 100% 0%, rgba(201,169,110,0.18) 0%, transparent 60%)', filter: 'blur(16px)' }} />
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(201,169,110,0.9)' }}>Today's Ritual Space</p>
                {moon ? (
                  <>
                    <p className="font-display text-xl font-bold mb-1" style={{ color: '#100C1E' }}>
                      {moon.phase.emoji} {moon.phase.name} in {moon.sign.emoji} {moon.sign.name}
                    </p>
                    <p className="text-sm" style={{ color: '#C9A96E' }}>
                      {isNewMoon ? 'Plant seeds. Set intentions. Begin.' : isFullMoon ? 'Release. Illuminate. Celebrate.' : 'Build. Integrate. Witness.'}
                    </p>
                  </>
                ) : (
                  <p className="font-bold" style={{ color: '#100C1E' }}>Moon Ritual Space</p>
                )}
              </div>
            </div>

            {/* Ritual type header */}
            <div className="rounded-[20px] p-4 mb-4"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                <p className="font-bold" style={{ color: 'var(--text-1)' }}>
                  {isNewMoon ? 'New Moon Ritual' : isFullMoon ? 'Full Moon Ritual' : `${moon?.phase?.name ?? 'Moon'} Practice`}
                </p>
              </div>
              {context?.intention && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  <span className="font-semibold" style={{ color: 'var(--violet)' }}>Set your intention around:</span>{' '}
                  {context.intention}
                </p>
              )}
              {context?.avoid && (
                <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
                  <span className="font-semibold">Avoid:</span> {context.avoid}
                </p>
              )}
            </div>

            {/* Ritual steps (checklist) */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-4)' }}>Your Ritual Steps</p>
              <div className="space-y-2">
                {ritualSteps.map((step, i) => {
                  const done = completed.has(step)
                  return (
                    <button key={i} onClick={() => toggleStep(step)}
                      className="w-full rounded-[18px] p-4 flex items-center gap-3 text-left transition-all"
                      style={{
                        background: done ? 'rgba(90,140,120,0.1)' : 'var(--surface)',
                        border: `1px solid ${done ? 'rgba(90,140,120,0.3)' : 'var(--surface-border)'}`,
                      }}>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center`}
                        style={{
                          background: done ? '#5A8A7A' : 'transparent',
                          border: done ? 'none' : '2px solid var(--text-4)',
                        }}>
                        {done && <CheckCircle2 className="h-4 w-4 text-white" />}
                      </div>
                      <p className="text-sm" style={{ color: done ? '#5A8A7A' : 'var(--text-1)', textDecoration: done ? 'line-through' : 'none' }}>
                        {step}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Release list (full moon) */}
            {context?.release && context.release.length > 0 && (
              <div className="mb-4 rounded-[20px] p-4"
                style={{ background: 'rgba(201,107,90,0.08)', border: '1px solid rgba(201,107,90,0.15)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#C96B5A' }}>Full Moon Release</p>
                <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Write these on paper. Burn or bury after your ritual.</p>
                <ul className="space-y-1.5">
                  {context.release.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-1)' }}>
                      <span style={{ color: '#C96B5A', fontWeight: 'bold', marginTop: 2, flexShrink: 0 }}>✕</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ritual elements */}
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-4)' }}>Ritual Elements for {sign}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Scents', items: elements.scents },
                  { label: 'Colors', items: elements.colors },
                  { label: 'Crystals', items: elements.crystals },
                  { label: 'Elements', items: elements.elements },
                ].map(cat => (
                  <div key={cat.label} className="rounded-[16px] p-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-4)' }}>{cat.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.items.map(item => (
                        <span key={item} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--violet)', border: '1px solid rgba(201,169,110,0.2)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personal Cancer Moon note */}
            <div className="rounded-[18px] p-4"
              style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.18)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--violet)' }}>Your Natal Moon Layer</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{PERSONAL_RITUAL_OVERLAY.note}</p>
            </div>
          </>
        )}
      </AppLayout>
    </div>
  )
}
