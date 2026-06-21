'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Calendar, CheckSquare, Sparkles, BookOpen, Users, Settings } from 'lucide-react'

const TABS = [
  { href: '/',           label: 'Home',          icon: Home,          badge: null },
  { href: '/messages',   label: 'Messages',      icon: MessageCircle, badge: 4    },
  { href: '/calendar',   label: 'Calendar',      icon: Calendar,      badge: null, dateLabel: true },
  { href: '/tasks',      label: 'Tasks',         icon: CheckSquare,   badge: null },
  { href: '/spirit',     label: 'Spirit',        icon: Sparkles,      badge: null },
  { href: '/journal',    label: 'Journal',       icon: BookOpen,      badge: null },
  { href: '/relationships', label: 'Relationships', icon: Users,       badge: null },
  { href: '/settings',   label: 'Settings',      icon: Settings,      badge: null },
]

export function DesktopTabBar() {
  const pathname = usePathname()
  const today = new Date().getDate()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4 px-8"
      style={{ pointerEvents: 'none' }}>
      <div className="flex items-center gap-1 px-3 py-2 rounded-[28px]"
        style={{
          background: 'rgba(18,15,42,0.88)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.04) inset',
          pointerEvents: 'all',
        }}>
        {TABS.map(({ href, label, icon: Icon, badge, dateLabel }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-[20px] transition-all duration-200"
              style={{
                background: active ? 'rgba(139,111,184,0.85)' : 'transparent',
                minWidth: 68,
              }}>
              {/* Icon or calendar date */}
              {dateLabel ? (
                <div className="relative flex flex-col items-center">
                  <Icon className="h-5 w-5" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)' }} strokeWidth={1.6} />
                  <div className="absolute -bottom-0.5 -right-2 text-[9px] font-bold"
                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                    {today}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Icon className="h-5 w-5" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)' }} strokeWidth={1.6} />
                  {badge && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: '#8B6FB8', fontSize: 9 }}>
                      {badge}
                    </div>
                  )}
                </div>
              )}
              <span className="text-[11px] font-medium whitespace-nowrap"
                style={{ color: active ? '#fff' : 'rgba(255,255,255,0.50)' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
