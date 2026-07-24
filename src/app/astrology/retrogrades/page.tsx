'use client'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, CheckCircle, XCircle } from 'lucide-react'

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

type RetroData = {
  retrograde_count: number
  retrogrades: Array<{
    name: string; sign: string; degree: number; emoji: string
    meaning: { theme: string; do: string[]; avoid: string[]; luna: string }
  }>
  next_mercury_retro: string | null
  is_mercury_retrograde: boolean
}

export default function RetrogradesPage() {
  const [data, setData] = useState<RetroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    fetch(`/api/astrology/retrogrades?tz=${encodeURIComponent(tz)}`)
      .then(r => r.json()).then(d => {
        setData(d)
        setLoading(false)
        if (d.retrogrades?.[0]) setExpanded(d.retrogrades[0].name)
      })
      .catch(() => setLoading(false))
  }, [])

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
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Retrogrades</h1>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>Planets in review · what turns inward</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-[20px] shimmer" />)}</div>
        ) : data ? (
          <>
            {/* Status hero */}
            <div className="relative rounded-[22px] p-5 mb-5 overflow-hidden"
              style={{
                background: data.retrograde_count > 0
                  ? 'linear-gradient(145deg, rgba(201,169,110,0.16) 0%, rgba(201,169,110,0.24) 60%, rgba(201,169,110,0.10) 100%)'
                  : 'linear-gradient(145deg, rgba(90,184,120,0.14) 0%, rgba(90,184,120,0.20) 60%, rgba(90,184,120,0.08) 100%)',
                border: `1px solid ${data.retrograde_count > 0 ? 'rgba(201,169,110,0.25)' : 'rgba(90,140,120,0.25)'}`,
              }}>
              <div className="relative z-10">
                {data.retrograde_count === 0 ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5" style={{ color: '#5A8A7A' }} />
                      <p className="font-bold" style={{ color: '#100C1E' }}>Clear skies — no planets retrograde</p>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(16,12,30,0.65)' }}>
                      All planets are moving direct. This is a great time for launching, starting, and moving forward with intention.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{ color: 'rgba(201,169,110,0.9)' }}>Currently Retrograde</p>
                    <p className="font-display text-2xl font-bold mb-1" style={{ color: '#100C1E' }}>
                      {data.retrograde_count} {data.retrograde_count === 1 ? 'planet' : 'planets'} in review
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.retrogrades.map(r => (
                        <span key={r.name} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold"
                          style={{ background: 'rgba(201,169,110,0.18)', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.3)' }}>
                          <RotateCcw className="h-3 w-3" /> {r.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {data.next_mercury_retro && !data.is_mercury_retrograde && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(180,150,100,0.15)' }}>
                    <p className="text-xs" style={{ color: 'rgba(16,12,30,0.5)' }}>
                      Next Mercury Retrograde: {data.next_mercury_retro}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* What is retrograde? */}
            <div className="rounded-[18px] p-4 mb-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>What Is Retrograde?</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                A planet is retrograde when it appears to move backward from Earth's perspective. The planet itself isn't actually reversing — it's an optical illusion based on orbital speed. Astrologically, retrograde periods turn that planet's themes inward. Rather than expressing outwardly, the energy calls for review, revision, reflection, and reconnection.
              </p>
            </div>

            {/* Active retrogrades */}
            {data.retrogrades.length === 0 ? (
              <div className="rounded-[20px] p-6 text-center"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>All planets are direct. No retrogrades active.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-4)' }}>Active Retrogrades</p>
                {data.retrogrades.map(r => (
                  <div key={r.name}>
                    <button className="w-full rounded-[20px] p-5 text-left"
                      onClick={() => setExpanded(expanded === r.name ? null : r.name)}
                      style={{ background: 'var(--surface)', border: `1px solid ${expanded === r.name ? 'rgba(201,169,110,0.35)' : 'var(--surface-border)'}` }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{r.emoji}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold" style={{ color: 'var(--text-1)' }}>{r.name} Retrograde</p>
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: 'rgba(201,169,110,0.15)', color: '#C9A96E' }}>
                              <RotateCcw className="h-2.5 w-2.5" /> ℞
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{r.degree}° {r.sign}</p>
                        </div>
                      </div>
                      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{r.meaning.theme}</p>

                      {expanded === r.name && (
                        <div className="mt-4 space-y-3">
                          {/* LUNA speaks */}
                          <div className="rounded-[14px] p-3"
                            style={{ background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.2)' }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--violet)' }}>LUNA</p>
                            <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-1)' }}>{r.meaning.luna}</p>
                          </div>

                          {/* Do / Avoid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-[14px] p-3"
                              style={{ background: 'rgba(90,140,120,0.1)', border: '1px solid rgba(90,140,120,0.2)' }}>
                              <div className="flex items-center gap-1 mb-2">
                                <CheckCircle className="h-3.5 w-3.5" style={{ color: '#5A8A7A' }} />
                                <p className="text-xs font-bold" style={{ color: '#5A8A7A' }}>DO</p>
                              </div>
                              <ul className="space-y-1">
                                {r.meaning.do.map((item, i) => (
                                  <li key={i} className="text-xs leading-snug" style={{ color: 'var(--text-2)' }}>· {item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="rounded-[14px] p-3"
                              style={{ background: 'rgba(201,107,90,0.1)', border: '1px solid rgba(201,107,90,0.2)' }}>
                              <div className="flex items-center gap-1 mb-2">
                                <XCircle className="h-3.5 w-3.5" style={{ color: '#C96B5A' }} />
                                <p className="text-xs font-bold" style={{ color: '#C96B5A' }}>AVOID</p>
                              </div>
                              <ul className="space-y-1">
                                {r.meaning.avoid.map((item, i) => (
                                  <li key={i} className="text-xs leading-snug" style={{ color: 'var(--text-2)' }}>· {item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[20px] p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p style={{ color: 'var(--text-3)' }}>Could not load retrograde data.</p>
          </div>
        )}
      </AppLayout>
    </div>
  )
}
