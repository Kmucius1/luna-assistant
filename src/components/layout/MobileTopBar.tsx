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
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -5, right: -5, bottom: -5, left: -5, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,150,60,0.16) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 38%, #fce8a0 0%, #d8a840 25%, #9a6215 55%, #4a2e08 100%)', boxShadow: '0 0 10px rgba(200,140,40,0.28)', animation: 'spin-slow 240s linear infinite' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(circle at 30% 65%, rgba(0,0,0,0.18) 0%, transparent 18%), radial-gradient(circle at 65% 30%, rgba(255,255,255,0.08) 0%, transparent 20%)' }} />
      </div>
    </div>
  )
}

export function MobileTopBar() {
  const moon = getMoon()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 'calc(env(safe-area-inset-top, 44px) + 4px)',
      paddingLeft: 18, paddingRight: 18, paddingBottom: 8,
      flexShrink: 0,
    }}>
      {/* Left: moon + phase + tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <SmallMoon />
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.58)', margin: 0, lineHeight: 1.3 }}>
            {moon.name} · {moon.pct}%
          </p>
          <p style={{ fontSize: 10, color: 'rgba(185,139,255,0.42)', margin: 0, lineHeight: 1.25 }}>
            Illuminating your next step
          </p>
        </div>
      </div>

      {/* Center: LUNA wordmark with sparkle */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ position: 'absolute', top: -8, right: 4, fontSize: 9, color: '#b98bff', lineHeight: 1 }}>✦</span>
        <span className="font-display" style={{ fontSize: 23, fontWeight: 700, letterSpacing: '0.24em', color: 'white' }}>LUNA</span>
      </div>

      {/* Right: bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <Bell style={{ width: 19, height: 19, color: 'rgba(255,255,255,0.58)' }} strokeWidth={1.5} />
          <div style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#4A90FF', border: '1.5px solid #0a0618' }} />
        </div>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C4DCC, #4A20A0)',
          border: '2px solid rgba(185,139,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Z</span>
        </div>
      </div>
    </div>
  )
}
