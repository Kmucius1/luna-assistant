'use client'
import { Bell } from 'lucide-react'

const MOON_PHASES = [
  { name: 'New Moon',        pct: 0   },
  { name: 'Waxing Crescent', pct: 14  },
  { name: 'First Quarter',   pct: 28  },
  { name: 'Waxing Gibbous',  pct: 82  },
  { name: 'Full Moon',       pct: 100 },
  { name: 'Waning Gibbous',  pct: 72  },
  { name: 'Last Quarter',    pct: 50  },
  { name: 'Waning Crescent', pct: 18  },
]
function getMoon() {
  const days = (Date.now() - new Date('2024-01-11').getTime()) / 86_400_000
  return MOON_PHASES[Math.floor(((days % 29.53) / 29.53) * 8)] ?? MOON_PHASES[0]
}

function SmallMoon() {
  return (
    <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: -4, right: -4, bottom: -4, left: -4, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,150,60,0.18) 0%, transparent 70%)' }} />
      {/* Moon body */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 38%, #fce8a0 0%, #d8a840 25%, #9a6215 55%, #4a2e08 100%)', boxShadow: '0 0 8px rgba(200,140,40,0.3)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(circle at 30% 65%, rgba(0,0,0,0.2) 0%, transparent 18%), radial-gradient(circle at 65% 30%, rgba(255,255,255,0.08) 0%, transparent 20%)' }} />
      </div>
    </div>
  )
}

export function MobileTopBar() {
  const moon = getMoon()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px 10px', flexShrink: 0,
    }}>
      {/* Left: moon + phase text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <SmallMoon />
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.62)', margin: 0, lineHeight: 1.3 }}>
            {moon.name} · {moon.pct}%
          </p>
          <p style={{ fontSize: 9, color: 'rgba(196,169,232,0.42)', margin: 0, lineHeight: 1.3 }}>
            Illuminating your next step
          </p>
        </div>
      </div>

      {/* Center: LUNA wordmark with star above A */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{
          position: 'absolute', top: -9, right: 3,
          fontSize: 9, color: '#C4A9E8', lineHeight: 1,
        }}>✦</span>
        <span style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '0.20em',
          color: 'white', fontFamily: 'inherit',
        }}>LUNA</span>
      </div>

      {/* Right: bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <Bell style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.62)' }} strokeWidth={1.6} />
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 7, height: 7, borderRadius: '50%',
            background: '#4A90FF', border: '1.5px solid #0a0618',
          }} />
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C4DCC, #4A20A0)',
          border: '2px solid rgba(196,169,232,0.38)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Z</span>
        </div>
      </div>
    </div>
  )
}
