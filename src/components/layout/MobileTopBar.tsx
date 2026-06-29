'use client'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

export function MobileTopBar() {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() {
      setTime(
        new Intl.DateTimeFormat(undefined, {
          hour: 'numeric', minute: '2-digit', hour12: true,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).format(new Date())
      )
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 22px 10px', flexShrink: 0,
    }}>
      {/* Time */}
      <span style={{ fontSize: 16, fontWeight: 700, color: 'white', minWidth: 52 }}>{time}</span>

      {/* LUNA wordmark */}
      <span style={{
        fontSize: 22, fontWeight: 800, letterSpacing: '0.18em',
        background: 'linear-gradient(135deg, #E0D0FF 0%, #C4A9E8 50%, #9B7FD4 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>LUNA</span>

      {/* Bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 52, justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <Bell style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.55)' }} strokeWidth={1.6} />
          <div style={{
            position: 'absolute', top: -2, right: -2,
            width: 7, height: 7, borderRadius: '50%',
            background: '#4A90FF', border: '1.5px solid #08041a',
          }} />
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6B4C8C, #3D2060)',
          border: '1.5px solid rgba(196,169,232,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Z</span>
        </div>
      </div>
    </div>
  )
}
