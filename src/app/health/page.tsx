'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import { Heart, Moon, Droplet, Flame, TrendingUp, Sun, Waves, PenLine } from 'lucide-react'

// ─── Shared glass card style (matches Home's locked design system) ───────────
const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 24,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}
const LBL: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#5C4530',
  display: 'flex', alignItems: 'center', gap: 6,
  marginBottom: 10,
}

const WEEK_ENERGY = [
  { day: 'M', pct: 62 }, { day: 'T', pct: 71 }, { day: 'W', pct: 58 },
  { day: 'T', pct: 78 }, { day: 'F', pct: 84 }, { day: 'S', pct: 66 }, { day: 'S', pct: 73 },
]

const STATS = [
  { icon: Moon,       label: 'Sleep',       value: '7h 42m',        status: 'Good',        delta: '↑ 12%', color: '#6BE38B' },
  { icon: Droplet,    label: 'Hydration',   value: '1.6 L',         status: 'On Track',    delta: '↑ 8%',  color: '#B8A78C' },
  { icon: Flame,      label: 'Movement',    value: '6,421 steps',   status: 'Good',        delta: '↑ 15%', color: '#6BE38B' },
  { icon: TrendingUp, label: 'Energy Peak', value: '4:00 – 6:00 PM',status: 'Later Today', delta: 'Prepare for flow', color: '#E6B84A' },
]

function EnergyGauge({ pct = 78, size = 128 }: { pct?: number; size?: number }) {
  const stroke = size * 0.09
  const r = (size - stroke) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, animation: 'breathe 5s ease-in-out infinite' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(201,169,110,0.18)" strokeWidth={stroke} />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke="#5C4530" strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(201,169,110,0.5))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.26, fontWeight: 900, color: '#100C1E', lineHeight: 1 }}>{pct}</span>
        <span style={{ fontSize: size * 0.085, fontWeight: 700, color: '#5E5474', marginTop: 2 }}>Good Energy</span>
      </div>
    </div>
  )
}

export default function HealthPage() {
  const [journalOpen, setJournalOpen] = useState(false)

  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#F5EFE3', margin: 0 }}>Health &amp; Wellness</h1>
        <p style={{ fontSize: 13, color: 'rgba(245,239,227,0.72)', margin: '-8px 0 0' }}>Body, energy, and rest — the full day</p>

        {/* Wellness & Energy */}
        <div style={{ ...G, padding: '18px 20px' }}>
          <div style={LBL}><Heart style={{ width: 11, height: 11 }} />Wellness &amp; Energy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <EnergyGauge pct={78} size={128} />
            <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STATS.map(({ icon: Icon, label, value, status, delta, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(180,150,100,0.14)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(201,169,110,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 15, height: 15, color: '#5C4530' }} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 11, color: '#5E5474', margin: 0 }}>{value}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 11.5, fontWeight: 700, color, margin: 0 }}>{status}</p>
                    <p style={{ fontSize: 9.5, color: '#5E5474', margin: 0 }}>{delta}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Energy */}
        <div style={{ ...G, padding: '18px 20px' }}>
          <div style={LBL}><Waves style={{ width: 11, height: 11 }} />This Week's Flow</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 100 }}>
            {WEEK_ENERGY.map(({ day, pct }, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: '100%', maxWidth: 28, height: `${pct}%`, borderRadius: 8,
                  background: 'linear-gradient(180deg, #5C4530 0%, rgba(201,169,110,0.35) 100%)',
                }} />
                <span style={{ fontSize: 10, color: '#5E5474', fontWeight: 600 }}>{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Focus reset */}
        <div style={{ ...G, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Sun style={{ width: 24, height: 24, color: '#E6B84A', flexShrink: 0 }} strokeWidth={1.6} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#100C1E', margin: 0 }}>Your energy peak is 4–6 PM.</p>
            <p style={{ fontSize: 11.5, color: '#5E5474', margin: '2px 0 0' }}>Save your hardest task for that window.</p>
          </div>
        </div>

        {/* Journal prompt */}
        <div
          onClick={() => setJournalOpen(v => !v)}
          style={{ ...G, padding: '16px 20px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(247,238,220,0.95), rgba(240,228,198,0.92))' }}
        >
          <div style={LBL}><PenLine style={{ width: 11, height: 11 }} />Reflect on Today</div>
          <p style={{ fontSize: 13, color: '#8A6D3B', fontStyle: 'italic', margin: 0 }}>
            "What did my body ask for today, and did I listen?"
          </p>
          {journalOpen && (
            <Link href="/journal" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, marginTop: 12,
                background: 'linear-gradient(135deg, #5C4530 0%, #B08D52 100%)', boxShadow: '0 0 18px rgba(201,169,110,0.35)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Open Journal →</span>
              </div>
            </Link>
          )}
        </div>

      </div>
    </AppLayout>
  )
}
