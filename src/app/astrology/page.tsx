'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import { Star, ChevronRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 22,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#C9A96E',
  display: 'flex', alignItems: 'center', gap: 6,
  marginBottom: 10, flexShrink: 0,
}

const GO_DEEPER: React.CSSProperties = {
  padding: '13px 18px', borderRadius: 16,
  background: 'rgba(201,169,110,0.10)', border: '1px solid rgba(201,169,110,0.22)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
}

function Shimmer({ h = 12, w = '100%' }: { h?: number; w?: string|number }) {
  return <div style={{ height: h, width: w, borderRadius: 6, background: 'rgba(180,150,100,0.07)', animation: 'pulse 1.5s ease-in-out infinite' }} />
}

type AstroTab = 'cosmic' | 'moon' | 'transits' | 'chart' | 'spirit' | 'crystals' | 'love' | 'forecasts' | 'deep'

function TabCosmic() {
  const [brief, setBrief] = useState<{ overall_vibe?: string; tagline?: string; energy?: string; avoid?: string; focus?: string; mantra?: string; affirmation?: string; colors?: string[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/astrology/daily-brief').then(r => r.json()).then(d => setBrief(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, borderRadius: 26, padding: '18px 20px', background: 'linear-gradient(135deg, rgba(201,169,110,0.16), rgba(201,169,110,0.06))' }}>
        <div style={LBL}><span>✨</span>Today's Cosmic Weather</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <Shimmer key={i} h={12} w={i===2?'70%':'100%'} />)}</div>
        ) : brief ? (
          <>
            {brief.tagline && <p style={{ fontSize: 16, fontWeight: 700, color: '#100C1E', marginBottom: 10, lineHeight: 1.4 }}>{brief.tagline}</p>}
            {brief.overall_vibe && <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.72)', lineHeight: 1.6, marginBottom: 12 }}>{brief.overall_vibe}</p>}
            {brief.energy && (
              <div style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,169,110,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Energy</p>
                <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.75)', lineHeight: 1.5 }}>{brief.energy}</p>
              </div>
            )}
            {brief.focus && (
              <div style={{ background: 'rgba(168,196,218,0.07)', border: '1px solid rgba(168,196,218,0.15)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(168,196,218,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Focus</p>
                <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.75)', lineHeight: 1.5 }}>{brief.focus}</p>
              </div>
            )}
            {brief.avoid && (
              <div style={{ background: 'rgba(201,107,90,0.07)', border: '1px solid rgba(201,107,90,0.15)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(201,107,90,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Avoid</p>
                <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.65)', lineHeight: 1.5 }}>{brief.avoid}</p>
              </div>
            )}
            {brief.mantra && <p style={{ fontSize: 14, color: '#C9A96E', fontStyle: 'italic', lineHeight: 1.6, marginTop: 4, textAlign: 'center' }}>✦ {brief.mantra}</p>}
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.4)', fontStyle: 'italic', lineHeight: 1.6 }}>Connect your profile for a personalized daily reading.</p>
        )}
      </div>
      {[
        { href: '/astrology/daily', label: 'Full Daily Reading', emoji: '📖' },
        { href: '/astrology/transits', label: "Today's Transits", emoji: '🪐' },
      ].map(item => (
        <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
          <div style={GO_DEEPER}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>{item.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#C9A96E' }}>{item.label}</span>
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
          </div>
        </Link>
      ))}
    </div>
  )
}

function TabMoon() {
  const [moon, setMoon] = useState<{ phase: { name: string; emoji: string; illumination: number; description: string }; sign: { name: string; emoji: string; degree: number; keywords: string } } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/astrology/daily-guidance').then(r => r.json()).then(d => setMoon(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const RITUALS = ['🌑 New Moon: Write 3 intentions', '🌕 Full Moon: Release what drains you', '🌙 Each night: 3 gratitudes before sleep', '✦ Moon journal: how am I feeling in my body right now?']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, borderRadius: 26, padding: '20px', background: 'linear-gradient(135deg, rgba(201,169,110,0.20), rgba(201,169,110,0.08))', border: '1px solid rgba(201,169,110,0.2)' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(180,150,100,0.07)' }} />
            <Shimmer h={14} w={200} />
          </div>
        ) : moon ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 60, lineHeight: 1 }}>{moon.phase.emoji}</span>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#100C1E' }}>{moon.phase.name}</p>
            <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)' }}>{Math.round(moon.phase.illumination * 100)}% illuminated</p>
            {moon.sign && (
              <div style={{ marginTop: 8, padding: '8px 16px', borderRadius: 12, background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
                <p style={{ fontSize: 13, color: '#C9A96E' }}>Moon in {moon.sign.name} {moon.sign.emoji}</p>
                <p style={{ fontSize: 11, color: 'rgba(16,12,30,0.45)', marginTop: 3 }}>{moon.sign.keywords}</p>
              </div>
            )}
            {moon.phase.description && <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.62)', lineHeight: 1.6, marginTop: 6 }}>{moon.phase.description}</p>}
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 50 }}>🌙</span>
            <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.45)', marginTop: 8 }}>Moon data loading…</p>
          </div>
        )}
      </div>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>Moon Rituals</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {RITUALS.map((r, i) => <p key={i} style={{ fontSize: 13, color: 'rgba(16,12,30,0.65)', lineHeight: 1.5 }}>{r}</p>)}
        </div>
      </div>
      <Link href="/astrology/moon" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Moon Portal</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabTransits() {
  const [planets, setPlanets] = useState<Array<{ name: string; sign: string; degree: number; retrograde: boolean; emoji: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/astrology/planets').then(r => r.json()).then(d => setPlanets(d.planets ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const KEY_TRANSITS = [
    { planet: 'Jupiter', sign: 'Cancer', note: 'Expanding home, family, emotional security. Your Cancer Moon is activated — this is a lucky year for personal growth.' },
    { planet: 'Saturn',  sign: 'Pisces', note: 'Structure meets intuition. Dreams require discipline. Build quietly.' },
    { planet: 'Pluto',   sign: 'Aquarius', note: 'Generational transformation. Technology and systems evolving.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ ...LBL, marginBottom: 0 }}>Live Sky Now</div>
          <button onClick={() => { setLoading(true); fetch('/api/astrology/planets').then(r => r.json()).then(d => setPlanets(d.planets ?? [])).catch(() => {}).finally(() => setLoading(false)) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(16,12,30,0.3)' }}>
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3,4,5].map(i => <Shimmer key={i} h={11} />)}</div>
        ) : planets.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.3)', fontStyle: 'italic' }}>Unable to load planet data.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {planets.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{p.emoji}</span>
                <span style={{ fontSize: 13, color: 'rgba(16,12,30,0.75)', fontWeight: 600, width: 70 }}>{p.name}</span>
                <span style={{ fontSize: 13, color: 'rgba(16,12,30,0.5)', flex: 1 }}>{p.sign} {p.degree}°</span>
                {p.retrograde && <span style={{ fontSize: 10, fontWeight: 700, color: '#E08B4A', background: 'rgba(201,139,74,0.12)', padding: '2px 6px', borderRadius: 5 }}>℞</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>Key 2026 Transits for You</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {KEY_TRANSITS.map(t => (
            <div key={t.planet} style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(180,150,100,0.04)', border: '1px solid rgba(180,150,100,0.07)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A96E', marginBottom: 5 }}>{t.planet} in {t.sign}</p>
              <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.6)', lineHeight: 1.55 }}>{t.note}</p>
            </div>
          ))}
        </div>
      </div>
      <Link href="/astrology/transits" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Transit Report</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabChart() {
  const BIG3 = [
    { label: 'Sun',    value: 'Scorpio', emoji: '☀️', note: 'Deep, investigative, powerful. You read beneath every surface.' },
    { label: 'Moon',   value: 'Cancer',  emoji: '🌙', note: 'Emotional safety IS the foundation of your success. Home and softness are your path.' },
    { label: 'Rising', value: 'Gemini',  emoji: '⬆️', note: 'Quick, curious, adaptable. People see your wit and range first.' },
  ]
  const PLANETS = [
    { planet: 'Mercury', sign: 'Scorpio',   note: 'Deep, strategic communicator. Speaks truth with surgical precision.' },
    { planet: 'Venus',   sign: 'Capricorn', note: 'Love through loyalty and building. Long-term over instant gratification.' },
    { planet: 'Mars',    sign: 'Libra',     note: 'Acts best when relationally clear. Communication before action.' },
    { planet: 'Jupiter', sign: 'Gemini',    note: 'Abundance through learning, writing, ideas, networking.' },
    { planet: 'Saturn',  sign: 'Gemini',    note: 'Mastery through disciplined communication and mental focus.' },
    { planet: 'N. Node', sign: 'Cancer',    note: 'Life path: emotional depth, home, nurturing — this is your direction.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, borderRadius: 26, padding: '16px 18px' }}>
        <div style={LBL}>Your Big Three</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BIG3.map(p => (
            <div key={p.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{p.emoji}</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(16,12,30,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{p.label}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#100C1E', marginBottom: 5 }}>{p.value}</p>
                <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.55)', lineHeight: 1.5 }}>{p.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>Planetary Placements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PLANETS.map(p => (
            <div key={p.planet} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'rgba(180,150,100,0.04)' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(168,196,218,0.8)', width: 60, flexShrink: 0 }}>{p.planet}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#C9A96E', width: 70, flexShrink: 0 }}>{p.sign}</span>
              <span style={{ fontSize: 11, color: 'rgba(16,12,30,0.45)', lineHeight: 1.5 }}>{p.note}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(16,12,30,0.3)', textAlign: 'center', fontStyle: 'italic' }}>Nov 14, 2000 · 7:04 PM · Sellersville, PA</p>
      <Link href="/astrology/birth-chart" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Birth Chart</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabSpirit() {
  const [guidance, setGuidance] = useState<{ affirmation?: string; shadow_question?: string; gratitude_prompt?: string; ritual?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [gratitude, setGratitude] = useState(['', '', ''])

  useEffect(() => {
    fetch('/api/astrology/rituals').then(r => r.json()).then(d => setGuidance(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {loading ? (
        <div style={{ ...G, padding: '20px' }}><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <Shimmer key={i} h={12} />)}</div></div>
      ) : (
        <>
          {guidance?.affirmation && (
            <div style={{ ...G, borderRadius: 26, padding: '18px 20px', background: 'linear-gradient(135deg, rgba(201,169,110,0.16), rgba(201,169,110,0.05))', border: '1px solid rgba(201,169,110,0.2)', textAlign: 'center' }}>
              <div style={{ ...LBL, justifyContent: 'center' }}>Today's Affirmation</div>
              <p style={{ fontSize: 16, color: '#100C1E', fontStyle: 'italic', lineHeight: 1.6 }}>"{guidance.affirmation}"</p>
            </div>
          )}
          {guidance?.shadow_question && (
            <div style={{ ...G, padding: '16px 18px' }}>
              <div style={LBL}>Shadow Work</div>
              <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.72)', lineHeight: 1.6, fontStyle: 'italic' }}>{guidance.shadow_question}</p>
            </div>
          )}
          {guidance?.ritual && (
            <div style={{ ...G, padding: '16px 18px', background: 'rgba(138,184,138,0.06)', border: '1px solid rgba(138,184,138,0.15)' }}>
              <p style={{ ...LBL, color: 'rgba(138,184,138,0.75)' }}>Today's Ritual</p>
              <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.72)', lineHeight: 1.6 }}>{guidance.ritual}</p>
            </div>
          )}
        </>
      )}
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>3 Gratitudes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gratitude.map((g, i) => (
            <input key={i} value={g} onChange={e => setGratitude(prev => prev.map((v, j) => j === i ? e.target.value : v))}
              placeholder={`Gratitude ${i + 1}…`}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 12, border: '1px solid rgba(180,150,100,0.1)', background: 'rgba(180,150,100,0.05)', color: '#100C1E', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          ))}
        </div>
      </div>
      <Link href="/astrology/rituals" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Spirit + Rituals</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabCrystals() {
  const CRYSTAL_LIBRARY = [
    { name: 'Black Tourmaline', energy: 'Protection · Grounding · Clears negativity',    chakra: 'Root'      },
    { name: 'Labradorite',      energy: 'Intuition · Magic · Transformation',             chakra: 'Third Eye' },
    { name: 'Rose Quartz',      energy: 'Self-love · Compassion · Emotional healing',     chakra: 'Heart'     },
    { name: 'Citrine',          energy: 'Abundance · Confidence · Solar energy',          chakra: 'Solar Plexus' },
    { name: 'Moonstone',        energy: 'Feminine cycles · Intuition · New beginnings',   chakra: 'Crown'     },
    { name: 'Obsidian',         energy: 'Shadow work · Truth · Deep healing',             chakra: 'Root'      },
    { name: 'Amethyst',         energy: 'Peace · Spiritual protection · Clarity',         chakra: 'Crown'     },
    { name: 'Selenite',         energy: 'Cleansing · Divine connection · Clarity',        chakra: 'Crown'     },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, borderRadius: 26, padding: '16px 18px', background: 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))', border: '1px solid rgba(201,169,110,0.2)', textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>🔮</span>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E', marginTop: 8 }}>Crystal of the Day</p>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#C9A96E', marginTop: 4 }}>Labradorite</p>
        <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.5)', marginTop: 6, lineHeight: 1.6 }}>Your magic is activated. Trust what you see beneath the surface — your Scorpio Sun + Cancer Moon picks up on things others miss.</p>
      </div>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>Crystal Library</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CRYSTAL_LIBRARY.map(c => (
            <div key={c.name} style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(180,150,100,0.04)', border: '1px solid rgba(180,150,100,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>{c.name}</p>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(201,169,110,0.6)', background: 'rgba(201,169,110,0.1)', padding: '2px 7px', borderRadius: 6 }}>{c.chakra}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.5)', lineHeight: 1.5 }}>{c.energy}</p>
            </div>
          ))}
        </div>
      </div>
      <Link href="/astrology/crystals" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Crystal Guide</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabLove() {
  const SYNASTRY = [
    { label: 'Emotional Bond',  score: 8,   color: '#C9A96E', note: 'Zoe Cancer Moon + Kaleb Cancer Moon = deeply mirrored emotional needs.' },
    { label: 'Chemistry',       score: 9,   color: '#E08B4A', note: 'Magnetic pull. Kaleb Scorpio Rising + your Scorpio Sun = electric.' },
    { label: 'Long-term Fit',   score: 8.5, color: '#8AB88A', note: 'Shared values on building, loyalty, and legacy.' },
    { label: 'Communication',   score: 6,   color: '#C9A96E', note: 'Work area. Two people who feel deeply but process differently.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, borderRadius: 26, padding: '16px 18px', background: 'rgba(201,90,90,0.06)', border: '1px solid rgba(201,90,90,0.15)' }}>
        <p style={{ ...LBL, color: 'rgba(201,130,130,0.75)' }}>Zoe + Kaleb Synastry</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SYNASTRY.map(s => (
            <div key={s.label}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(16,12,30,0.75)' }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.score}/10</span>
              </div>
              <div style={{ height: 4, borderRadius: 3, background: 'rgba(180,150,100,0.08)', marginBottom: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.score * 10}%`, background: s.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.45)', lineHeight: 1.5 }}>{s.note}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>Love Patterns to Watch</div>
        {['Venus in Capricorn: you express love through acts of service, loyalty, and building. You need that mirrored back.',
          'Mars in Libra: you need relational harmony BEFORE you act. Conflict freezes your momentum — find balance first.',
          "Cancer Moon: emotional safety isn't optional. Without it, you close down. Communicate your needs early."
        ].map((note, i) => <p key={i} style={{ fontSize: 13, color: 'rgba(16,12,30,0.62)', lineHeight: 1.6, marginBottom: 8 }}>✦ {note}</p>)}
      </div>
      <Link href="/love" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Love + Relationships</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabForecasts() {
  const [forecast, setForecast] = useState<{ weekly?: string; monthly?: string; best_days?: string[]; rest_days?: string[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/astrology/weekly-forecast').then(r => r.json()).then(d => setForecast(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const TIMELINE = [
    { period: 'Now–Aug 2026',      theme: 'Jupiter in Cancer', note: 'Massive emotional and financial expansion. Home, family, self-care = priority.' },
    { period: 'Oct–Nov 2026',      theme: 'Venus Retrograde',  note: 'Review relationships and finances. Do not start new love ventures yet.' },
    { period: 'Nov 2026–Dec 2026', theme: 'Jupiter in Leo',    note: 'Spotlight on creativity and recognition. Launch, be seen, lead.' },
    { period: '2027–2028',         theme: 'Jupiter in Virgo',  note: 'Precision pays off. Health, systems, and service become your superpower.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>This Week</div>
        {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Shimmer h={12} /><Shimmer h={12} w="80%" /></div>
          : forecast?.weekly ? <p style={{ fontSize: 14, color: 'rgba(16,12,30,0.72)', lineHeight: 1.6 }}>{forecast.weekly}</p>
          : <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.4)', fontStyle: 'italic' }}>Weekly forecast loading…</p>}
      </div>
      <div style={{ ...G, padding: '16px 18px' }}>
        <div style={LBL}>2026–2028 Outlook</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TIMELINE.map(t => (
            <div key={t.period} style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(180,150,100,0.04)', border: '1px solid rgba(180,150,100,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C9A96E' }}>{t.theme}</span>
                <span style={{ fontSize: 10, color: 'rgba(16,12,30,0.3)' }}>{t.period}</span>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(16,12,30,0.58)', lineHeight: 1.5 }}>{t.note}</p>
            </div>
          ))}
        </div>
      </div>
      <Link href="/astrology/forecasts" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Forecast Report</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabDeepDive() {
  const DEEP = [
    { label: 'North Node in Cancer',    content: "Your soul's direction this lifetime is toward emotional depth, nurturing, and creating a true home — internal and external. Business and success must feel safe and nourishing, not just profitable." },
    { label: 'Chiron in Sagittarius',   content: 'Wound around belief, freedom, and truth. You may have felt your wisdom dismissed or your vision too big for others. Healing comes through trusting your own philosophy.' },
    { label: 'Lilith in Gemini',        content: "Your \"too much\" label lives in your voice and your ideas. You were told you talk too much or think too wildly. Reclaim your multiplicity — you're not scattered, you're layered." },
    { label: '4/6 Projector Profile',   content: "Opportunist/Role Model. You're here to guide others — but only when invited. Your network (4th line) opens doors. Your life becomes a model others learn from (6th line). Rest between your \"on\" periods." },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, padding: '14px 18px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)' }}>
        <p style={{ fontSize: 13, color: 'rgba(201,169,110,0.75)', lineHeight: 1.6, fontStyle: 'italic' }}>These are your deep placements — the ones that explain the patterns that keep showing up in your life.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEEP.map(d => (
          <div key={d.label} style={{ ...G, padding: '16px 18px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#C9A96E', marginBottom: 8 }}>{d.label}</p>
            <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.65)', lineHeight: 1.7 }}>{d.content}</p>
          </div>
        ))}
      </div>
      <Link href="/astrology/deep-dives" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>More Deep Dives</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

function TabToday() {
  const [brief, setBrief] = useState<{ overall_vibe?: string; tagline?: string } | null>(null)
  const [moon, setMoon] = useState<{ phase: { name: string; emoji: string } } | null>(null)
  const [guidance, setGuidance] = useState<{ affirmation?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/astrology/daily-brief').then(r => r.json()).then(d => setBrief(d)).catch(() => {}),
      fetch('/api/astrology/daily-guidance').then(r => r.json()).then(d => setMoon(d)).catch(() => {}),
      fetch('/api/astrology/rituals').then(r => r.json()).then(d => setGuidance(d)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...G, borderRadius: 26, padding: '16px 18px', background: 'linear-gradient(135deg, rgba(201,169,110,0.16), rgba(201,169,110,0.06))' }}>
        <div style={LBL}><span>✨</span>Today's Cosmic Weather</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Shimmer h={12} /><Shimmer h={12} w="80%" /></div>
        ) : brief ? (
          <>
            {brief.tagline && <p style={{ fontSize: 15, fontWeight: 700, color: '#100C1E', marginBottom: 6, lineHeight: 1.4 }}>{brief.tagline}</p>}
            {brief.overall_vibe && <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.65)', lineHeight: 1.5 }}>{brief.overall_vibe}</p>}
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'rgba(16,12,30,0.4)', fontStyle: 'italic' }}>Connect your profile for a reading.</p>
        )}
      </div>

      <div style={{ ...G, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 36, lineHeight: 1 }}>{loading ? '🌙' : (moon?.phase?.emoji ?? '🌙')}</span>
        <div>
          <div style={{ ...LBL, marginBottom: 3 }}>Moon Phase</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#100C1E' }}>{loading ? '…' : (moon?.phase?.name ?? 'Loading')}</p>
        </div>
      </div>

      {(guidance?.affirmation || loading) && (
        <div style={{ ...G, borderRadius: 26, padding: '16px 18px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.04))', border: '1px solid rgba(201,169,110,0.2)' }}>
          <div style={{ ...LBL, justifyContent: 'center' }}>Today's Affirmation</div>
          {loading
            ? <Shimmer h={12} />
            : <p style={{ fontSize: 14, color: '#100C1E', fontStyle: 'italic', lineHeight: 1.6 }}>"{guidance?.affirmation}"</p>
          }
        </div>
      )}

      <Link href="/astrology/daily" style={{ textDecoration: 'none' }}>
        <div style={GO_DEEPER}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#C9A96E' }}>Full Daily Reading</span>
          <ChevronRight className="h-4 w-4" style={{ color: '#C9A96E' }} />
        </div>
      </Link>
    </div>
  )
}

const APPS_GRID = [
  { emoji: '✨', label: 'Cosmic',    href: null  as string | null },
  { emoji: '🌙', label: 'Moon',      href: '/astrology/moon' },
  { emoji: '🪐', label: 'Transits',  href: '/astrology/transits' },
  { emoji: '⭕', label: 'Chart',     href: '/astrology/birth-chart' },
  { emoji: '🪷', label: 'Spirit',    href: '/astrology/rituals' },
  { emoji: '🔮', label: 'Crystals',  href: '/astrology/crystals' },
  { emoji: '💗', label: 'Love',      href: '/love' },
  { emoji: '📅', label: 'Forecasts', href: '/astrology/forecasts' },
  { emoji: '🌌', label: 'Deep Dive', href: '/astrology/deep-dives' },
]

export default function AstrologyPage() {
  const [pagerIndex, setPagerIndex] = useState(0)

  const appsContent = (
    <div>
      <div style={{ ...LBL, marginBottom: 14, paddingTop: 4 }}>All Sections</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {APPS_GRID.map(item =>
          item.href ? (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px 12px', background: 'rgba(180,150,100,0.04)', border: '1px solid rgba(180,150,100,0.07)', borderRadius: 18, cursor: 'pointer', textAlign: 'center' }}>
                <span style={{ fontSize: 28 }}>{item.emoji}</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(16,12,30,0.75)', lineHeight: 1.2 }}>{item.label}</p>
              </div>
            </Link>
          ) : (
            <button key={item.label} onClick={() => setPagerIndex(0)} style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px 12px', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 18, cursor: 'pointer', textAlign: 'center' }}>
                <span style={{ fontSize: 28 }}>{item.emoji}</span>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#C9A96E', lineHeight: 1.2 }}>{item.label}</p>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  )

  const astroPages = [
    { id: 'today', label: '✨ Today', content: <TabToday /> },
    { id: 'apps',  label: 'Apps',    content: appsContent },
  ]

  return (
    <AppLayout noScroll>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, paddingTop: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,169,110,0.14)', border: '1px solid rgba(201,169,110,0.25)' }}>
          <Star className="h-5 w-5" style={{ color: '#C9A96E' }} strokeWidth={1.6} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: '#100C1E' }}>Astrology</h1>
          <p style={{ fontSize: 11, color: 'rgba(16,12,30,0.35)' }}>Scorpio Sun · Cancer Moon · Gemini Rising</p>
        </div>
      </div>

      <CategoryPager pages={astroPages} activeIndex={pagerIndex} onChangeIndex={setPagerIndex} accentColor="#C9A96E" hidePills />
    </AppLayout>
  )
}

export { TabCosmic, TabMoon, TabTransits, TabChart, TabSpirit, TabCrystals, TabLove, TabForecasts, TabDeepDive }
export type { AstroTab }
