'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MessageCircle, Moon, Scissors, LayoutGrid } from 'lucide-react'

const TABS = [
  { href: '/',          label: 'Home',      icon: Home          },
  { href: '/work',      label: 'Work',      icon: Briefcase     },
  { href: '/luna',      label: 'LUNA',      icon: MessageCircle },
  { href: '/astrology', label: 'Astrology', icon: Moon          },
  { href: '/creative',  label: 'Atelier',   icon: Scissors      },
  { href: '/explore',   label: 'Explore',   icon: LayoutGrid    },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname.startsWith(href)
}

export function DesktopSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 z-40"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderRight: '1px solid var(--nav-border)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Sparkle mark */}
      <div className="px-6 pt-8 pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logos/luna-mark.svg" alt="LUNA" className="w-8 h-8" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{
                background: active ? 'rgba(92,69,48,0.14)' : 'transparent',
                color: active ? 'var(--luna-purple)' : 'var(--text-3)',
              }}>
              <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={active ? 2 : 1.6} />
              <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Today's Energy widget */}
      <div className="px-5 pb-8 pt-4">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-4)' }}>Today's Energy</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--luna-purple)' }}>Scattered but capable</p>
        <div
          className="w-11 h-11 rounded-full mt-3"
          style={{
            background: 'radial-gradient(circle at 40% 35%, rgba(140,107,74,0.9) 0%, rgba(92,69,48,0.5) 55%, transparent 78%)',
            boxShadow: '0 0 18px rgba(92,69,48,0.35)',
            animation: 'breathe 5s ease-in-out infinite',
          }}
        />
      </div>
    </aside>
  )
}
