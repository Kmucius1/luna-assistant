'use client'
import { useState, useEffect } from 'react'
import { Search, Bell, Sun, Moon, Zap, Settings, LogOut } from 'lucide-react'
import { format } from 'date-fns'
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
  const [time, setTime]   = useState('')
  const [ampm, setAmpm]   = useState('')
  const [date, setDate]   = useState('')
  const [seconds, setSeconds] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const { theme, toggle } = useTheme()
  const moon = getCurrentMoonPhase()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(format(now, 'h:mm'))
      setAmpm(format(now, 'a'))
      setDate(format(now, 'EEE, MMM d'))
      setSeconds(now.getSeconds())
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
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
      className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-14 items-center"
      style={{
        background: 'rgba(10, 8, 28, 0.94)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>

      {/* Left — LUNA wordmark */}
      <div className="flex items-center pl-7 w-48 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)' }}>
            <Moon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="font-display text-base font-bold tracking-[0.22em]"
            style={{ color: 'var(--text-1)' }}>
            LUNA
          </span>
        </Link>
      </div>

      {/* Center — clock + date + moon */}
      <div className="flex-1 flex items-center justify-center gap-5">

        {/* Time — large, like a status bar */}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-xl font-semibold tabular-nums"
            style={{ color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            {time}
          </span>
          <span className="text-xs font-semibold"
            style={{ color: 'var(--text-3)' }}>{ampm}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4" style={{ background: 'var(--surface-border)' }} />

        {/* Date */}
        <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>{date}</span>

        {/* Divider */}
        <div className="w-px h-4" style={{ background: 'var(--surface-border)' }} />

        {/* Moon */}
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{moon.emoji}</span>
          <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>{moon.name}</span>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 pr-7 w-48 justify-end flex-shrink-0">

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
            style={{ background: '#8B6FB8' }} />
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
            style={{ background: 'linear-gradient(135deg, #8B6FB8, #6A4F9B)', border: '2px solid rgba(139,111,184,0.4)', boxShadow: '0 0 12px rgba(139,111,184,0.3)', cursor: 'pointer' }}>
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
