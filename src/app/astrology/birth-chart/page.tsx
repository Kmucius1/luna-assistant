'use client'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Star, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const ZOE_CHART = {
  bigThree: [
    { label: 'Sun',    sign: 'Scorpio',    degree: '22°', emoji: '☀️', color: '#8B4B8B',
      short: 'Identity and core self',
      description: 'Scorpio Sun is the seeker of truth, depth, and transformation. You are drawn to what is real, hidden, and powerful. You cannot live on the surface — you need meaning, emotional honesty, and experiences that change you. Your presence is magnetic without trying. You sense what people are not saying. You transform through every major life event rather than breaking. Your shadow is the urge to control, obsess, or retreat when you feel unsafe. Your highest expression is the woman who burns in her truth and rises from it.',
      howItShowsUp: ['You go deep before going wide in any relationship','You sense inauthenticity immediately and lose interest','You have phases of intense focus followed by complete shedding','You protect your inner world until trust is earned','Your emotions are your compass even when you try to override them'],
    },
    { label: 'Moon',   sign: 'Cancer',     degree: '4°',  emoji: '🌙', color: '#4A7FA8',
      short: 'Emotional world and needs',
      description: 'Cancer Moon is the most sensitive and emotionally intelligent moon placement. Your emotional body is your primary intelligence — it registers everything before your mind catches up. Home, safety, food, water, and familiar comfort are not luxuries. They are requirements. Without emotional safety, work, creativity, and visibility cannot fully function. Your North Node is also in Cancer — this means your whole soul evolution is toward emotional wisdom, receiving care, and building a home inside yourself. You are not too sensitive. You are tuned in.',
      howItShowsUp: ['You need to feel safe before you can be visible','Your productivity is directly tied to your emotional state','Food, water, and home environment deeply affect your energy','You absorb the emotional energy of rooms and people instantly','You nurture others sometimes before nurturing yourself'],
    },
    { label: 'Rising', sign: 'Gemini',     degree: '12°', emoji: '✨', color: '#5A8A7A',
      short: 'First impression and outward self',
      description: 'Gemini Rising is how the world first experiences you — quick, expressive, communicative, curious, and lightly magnetic. You appear approachable, witty, and interesting. People often do not realize how deep you are because your exterior is so conversational and easy. Your voice is your first instrument. Your words land. You adapt naturally to different people and environments. The shadow is that you can seem scattered or be misread as shallow when you are anything but. Your Scorpio interior and your Gemini exterior create a fascinating tension between lightness and depth.',
      howItShowsUp: ['People describe you as easy to talk to', 'You can read a room and adjust your energy quickly','Your voice and words are your most natural power','You appear versatile and multi-faceted, sometimes confusingly so','You are genuinely curious about most things and people'],
    },
  ],
  planets: [
    { planet: 'Mercury', sign: 'Scorpio',     degree: '3°',  emoji: '☿',
      meaning: 'Your mind goes deep, not wide. You think in patterns, hidden meanings, and emotional truth. Research, psychology, and seeing what others miss are your strengths. You communicate with precision and intensity. You can tell when someone is lying. Idle small talk exhausts you.' },
    { planet: 'Venus',   sign: 'Sagittarius', degree: '29°', emoji: '♀',
      meaning: 'Late-degree Sagittarius Venus (cusp Capricorn) means your love is adventurous, philosophically attracted, freedom-needing, and expansive, but with growing capacity for discipline and long-term building. You are attracted to depth + fun. You love bold, stylish, and worldly people. Beauty is an experience, not just an aesthetic. Your style is fearless.' },
    { planet: 'Mars',    sign: 'Libra',       degree: '6°',  emoji: '♂',
      meaning: 'Mars in Libra acts through beauty, fairness, and communication. You are motivated by justice, aesthetics, and balanced action. You avoid conflict until values are crossed, then you become precise and decisive. Your anger is rarely explosive — it speaks in words. You need your environment to be beautiful to feel motivated.' },
    { planet: 'Jupiter', sign: 'Gemini',      degree: '7°',  emoji: '♃',
      meaning: 'Jupiter in Gemini: growth and abundance come through communication, ideas, learning, and many interests. You expand by talking, writing, connecting, and exploring. Multiple income streams and projects are your natural state. The risk is scattering — too many threads.' },
    { planet: 'Saturn',  sign: 'Taurus',      degree: '27°', emoji: '♄',
      meaning: 'Saturn in Taurus: your discipline and maturity lesson is around money, body, and stability. Slow wealth is the teaching. You build what lasts through patience, quality, and calm decision-making. Panic spending or financial instability are the not-self themes. The gift is lasting material security built over time.' },
    { planet: 'Uranus',  sign: 'Aquarius',    degree: '17°', emoji: '⛢',
      meaning: 'Generational — your whole generation is rewiring collective consciousness, community, and innovation. Personally: you disrupt systems by existing authentically. You belong to a collective that sees the future differently.' },
    { planet: 'Neptune', sign: 'Aquarius',    degree: '4°',  emoji: '♆',
      meaning: 'Generational — collective idealism, humanitarian vision, and spiritual dissolution of old structures. Personally: your dreams are often about community, future possibilities, and collective healing.' },
    { planet: 'Pluto',   sign: 'Sagittarius', degree: '11°', emoji: '♇',
      meaning: 'Generational — your generation transforms through belief systems, philosophy, religion, and expanded consciousness. Personally: deep power through your capacity to change your beliefs entirely when you encounter truth.' },
  ],
  angles: [
    { label: 'North Node', sign: 'Cancer',     degree: '17°', emoji: '☊',
      meaning: 'Your soul\'s growth direction. Toward emotional intelligence, home-building, nurturing, receiving care, and trusting your intuition over ambition. Away from Capricorn over-achieving and cold control.' },
    { label: 'Midheaven',  sign: 'Virgo',      degree: '12°', emoji: '⬆',
      meaning: 'Your career and public legacy. You are here to serve through systems, tools, clarity, and craft. The analyst. The helper. The person who turns complex things into something useful. Your work is remembered for its precision and genuine usefulness.' },
    { label: 'Chiron',     sign: 'Sagittarius', degree: '15°', emoji: '⚷',
      meaning: 'Your recurring wound is around beliefs, freedom, and teaching. You may have been taught your beliefs were wrong, or felt trapped in others\' philosophies. The healing is claiming your own truth — and teaching others how to find theirs.' },
    { label: 'Lilith',     sign: 'Gemini',     degree: '20°', emoji: '⚸',
      meaning: 'Your raw feminine power lives in your voice, your mind, and your refusal to be simplified. Lilith in Gemini rebels through language. She refuses to stay quiet, small, or easy to categorize. Let her speak.' },
  ],
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-4)' }}>{title}</p>
      {children}
    </div>
  )
}

function PlanetCard({ planet, sign, degree, emoji, meaning }: {
  planet: string; sign: string; degree: string; emoji: string; meaning: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <button onClick={() => setOpen(!open)} className="w-full rounded-[18px] p-4 text-left transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{planet}</p>
            <p className="text-xs" style={{ color: 'var(--violet)' }}>{degree} {sign}</p>
          </div>
        </div>
        {open ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
               : <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-4)' }} />}
      </div>
      {open && (
        <p className="text-sm leading-relaxed mt-3 pt-3 text-left" style={{ color: 'var(--text-2)', borderTop: '1px solid var(--surface-border)' }}>
          {meaning}
        </p>
      )}
    </button>
  )
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

export default function BirthChartPage() {
  const [activeTab, setActiveTab] = useState<'big3' | 'planets' | 'angles'>('big3')
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>('Sun')

  return (
    <div className="min-h-screen" style={THEME_VARS}>
      <AppLayout>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pt-2">
          <Link href="/astrology">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <ArrowLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
            </div>
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Birth Chart</h1>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>November 14, 2000 · 7:04 PM · Sellersville PA</p>
          </div>
        </div>

        {/* Chart summary card */}
        <div className="relative rounded-[22px] p-5 mb-5 overflow-hidden"
          style={{ background: 'linear-gradient(145deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.24) 60%, rgba(201,169,110,0.10) 100%)', border: '1px solid rgba(201,169,110,0.3)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 100% 0%, rgba(201,169,110,0.18) 0%, transparent 60%)', filter: 'blur(16px)' }} />
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(201,169,110,0.9)' }}>Zoe Taylor · Natal Chart</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {ZOE_CHART.bigThree.map(p => (
                <div key={p.label} className="text-center rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(180,150,100,0.18)' }}>
                  <p className="text-lg mb-1">{p.emoji}</p>
                  <p className="font-bold text-xs" style={{ color: '#100C1E' }}>{p.sign}</p>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(16,12,30,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.label} {p.degree}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Mercury Scorpio', emoji: '☿' },
                { label: 'Venus Sag 29°', emoji: '♀' },
                { label: 'Mars Libra', emoji: '♂' },
                { label: 'Saturn Taurus', emoji: '♄' },
                { label: 'North Node Cancer', emoji: '☊' },
                { label: 'Midheaven Virgo', emoji: '⬆' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,150,100,0.18)' }}>
                  <span style={{ fontSize: 11 }}>{t.emoji}</span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(16,12,30,0.65)', fontWeight: 600 }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {(['big3','planets','angles'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab ? 'var(--violet)' : 'var(--surface)',
                color: activeTab === tab ? '#100C1E' : 'var(--text-3)',
                border: `1px solid ${activeTab === tab ? 'var(--violet)' : 'var(--surface-border)'}`,
              }}>
              {tab === 'big3' ? 'Big 3' : tab === 'planets' ? 'Planets' : 'Nodes & Angles'}
            </button>
          ))}
        </div>

        {/* Big 3 tab */}
        {activeTab === 'big3' && (
          <div className="space-y-3">
            {ZOE_CHART.bigThree.map(p => (
              <div key={p.label}>
                <button className="w-full rounded-[20px] p-5 text-left transition-all"
                  onClick={() => setExpandedPlanet(expandedPlanet === p.label ? null : p.label)}
                  style={{ background: 'var(--surface)', border: `1px solid ${expandedPlanet === p.label ? p.color + '44' : 'var(--surface-border)'}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold" style={{ color: 'var(--text-1)' }}>{p.label}</p>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: p.color + '22', color: p.color }}>{p.sign} {p.degree}</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.short}</p>
                      </div>
                    </div>
                    {expandedPlanet === p.label
                      ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-4)' }} />
                      : <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-4)' }} />}
                  </div>
                  {expandedPlanet === p.label && (
                    <div className="pt-4 mt-2" style={{ borderTop: '1px solid var(--surface-border)' }}>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>{p.description}</p>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>How It Shows Up</p>
                      <ul className="space-y-1.5">
                        {p.howItShowsUp.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                            <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Planets tab */}
        {activeTab === 'planets' && (
          <div className="space-y-2">
            {ZOE_CHART.planets.map(p => (
              <PlanetCard key={p.planet} planet={p.planet} sign={p.sign} degree={p.degree} emoji={p.emoji} meaning={p.meaning} />
            ))}
          </div>
        )}

        {/* Nodes & Angles tab */}
        {activeTab === 'angles' && (
          <div className="space-y-3">
            {ZOE_CHART.angles.map(a => (
              <div key={a.label} className="rounded-[18px] p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl">{a.emoji}</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--text-1)' }}>{a.label}</p>
                    <p className="text-xs" style={{ color: 'var(--violet)' }}>{a.degree} {a.sign}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{a.meaning}</p>
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    </div>
  )
}
