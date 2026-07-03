'use client'
import { useState, useEffect } from 'react'
import { Search, Bell, Sun, Moon, Settings, LogOut } from 'lucide-react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { LunaSearchOverlay } from '@/components/ui/LunaSearch'
import { createClient } from '@/lib/supabase/client'

const MOON_PHASES = [
  { name: 'New Moon',        emoji: '🌑' },
  { name: 'Waxing Crescent', emoji: '🌒' },
  { name: 'First Quarter',   emoji: '🌓' },
  { name: 'Waxing Gibbous',  emoji: '🌔' },
  { name: 'Full Moon',       emoji: '🌕' },
  { name: 'Waning Gibbous',  emoji: '🌖' },
  { name: 'Last Quarter',    emoji: '🌗' },
  { name: 'Waning Crescent', emoji: '🌘' },
]

function getCurrentMoonPhase() {
  const known = new Date('2024-01-11').getTime()
  const days  = (Date.now() - known) / (1000 * 60 * 60 * 24)
  return MOON_PHASES[Math.floor(((days % 29.53) / 29.53) * 8)] ?? MOON_PHASES[0]
}

export function DesktopHeader() {
  const [showMenu, setShowMenu] = useState(false)
  const { theme, toggle } = useTheme()
  const moon = getCurrentMoonPhase()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const [searchOpen, setSearchOpen] = useState(false)

  // ⌘K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header
      className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-16 items-center"
      style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderBottom: '1px solid var(--header-border)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}>

      {/* Left — moon phase */}
      <div className="flex items-center gap-2 pl-7 w-56 flex-shrink-0">
        <span className="text-lg leading-none">{moon.emoji}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-2)' }}>{moon.name} · 82%</p>
          <p className="text-[11px] leading-tight" style={{ color: 'var(--text-4)' }}>Illuminating your next step</p>
        </div>
      </div>

      {/* Center — LUNA wordmark */}
      <div className="flex-1 flex items-center justify-center">
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="font-display text-2xl font-bold tracking-[0.24em]" style={{ color: 'var(--text-1)' }}>LUNA</span>
          <span className="text-sm" style={{ color: '#b98bff' }}>✦</span>
        </Link>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 pr-7 w-56 justify-end flex-shrink-0">

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all hover:scale-105 tap-scale"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--surface-border)',
          }}>
          <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Search</span>
          <span className="text-xs px-1 py-0.5 rounded ml-0.5"
            style={{ background: 'var(--surface-border)', color: 'var(--text-4)', fontSize: 10 }}>⌘K</span>
        </button>
        {searchOpen && <LunaSearchOverlay onClose={() => setSearchOpen(false)} />}

        {/* Theme toggle */}
        <button onClick={toggle}
          className="w-8 h-8 rounded-full flex items-center justify-center tap-scale transition-all"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
          {theme === 'dark'
            ? <Sun  className="h-3.5 w-3.5" style={{ color: '#C9A96E' }} strokeWidth={2} />
            : <Moon className="h-3.5 w-3.5" style={{ color: 'var(--violet)' }} strokeWidth={2} />
          }
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center tap-scale">
          <Bell className="h-4 w-4" style={{ color: 'var(--text-2)' }} strokeWidth={1.6} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full badge-pulse"
            style={{ background: '#9b5cff' }} />
        </button>

        {/* Settings */}
        <Link href="/settings">
          <div className="w-8 h-8 rounded-full flex items-center justify-center tap-scale"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <Settings className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} strokeWidth={1.8} />
          </div>
        </Link>

        {/* Avatar + logout menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(v => !v)}
            className="w-8 h-8 rounded-full flex items-center justify-center tap-scale flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #9b5cff, #7C3FE0)', border: '2px solid rgba(155,92,255,0.4)', boxShadow: '0 0 12px rgba(155,92,255,0.3)', cursor: 'pointer' }}>
            <span className="text-white font-bold" style={{ fontSize: 11 }}>Z</span>
          </button>
          {showMenu && (
            <>
              <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 50, background: 'rgba(20,16,48,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 6, minWidth: 160, backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <Link href="/settings" onClick={() => setShowMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <Settings className="h-3.5 w-3.5" /> Settings
                </Link>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, color: '#E05E5E', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
