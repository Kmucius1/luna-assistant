'use client'
import { useState, useEffect } from 'react'
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
function formatTime(d: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(d)
}

function SmallMoon() {
  return (
    <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: -4, right: -4, bottom: -4, left: -4, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,150,60,0.16) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 38%, #fce8a0 0%, #d8a840 25%, #9a6215 55%, #4a2e08 100%)', boxShadow: '0 0 10px rgba(200,140,40,0.28)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: '50%', background: 'radial-gradient(circle at 30% 65%, rgba(0,0,0,0.18) 0%, transparent 18%), radial-gradient(circle at 65% 30%, rgba(255,255,255,0.08) 0%, transparent 20%)' }} />
      </div>
    </div>
  )
}

export function MobileTopBar() {
  const [time, setTime] = useState<string | null>(null)
  const moon = getMoon()

  useEffect(() => {
    setTime(formatTime(new Date()))
    const t = setInterval(() => setTime(formatTime(new Date())), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px 8px', flexShrink: 0,
    }}>
      {/* Left: moon + phase + time + tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <SmallMoon />
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.58)', margin: 0, lineHeight: 1.25 }}>
            {moon.name} · {moon.pct}%
          </p>
          <p style={{ fontSize: 17, fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            {time ?? '—'}
          </p>
          <p style={{ fontSize: 9, color: 'rgba(196,169,232,0.42)', margin: 0, lineHeight: 1.25 }}>
            Illuminating your next step
          </p>
        </div>
      </div>

      {/* Center: LUNA wordmark with sparkle */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ position: 'absolute', top: -8, right: 4, fontSize: 8, color: '#C4A9E8', lineHeight: 1 }}>✦</span>
        <span style={{ fontSize: 21, fontWeight: 900, letterSpacing: '0.22em', color: 'white' }}>LUNA</span>
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
          border: '2px solid rgba(196,169,232,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Z</span>
        </div>
      </div>
    </div>
  )
}
