'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, Briefcase, MessageCircle, Moon, Scissors, LayoutGrid, Sparkles } from 'lucide-react'

// Home is the 12-room app grid at /home — also where "/" redirects to,
// so this tab matches the app's real landing page (see
// LUNA_V2_MIGRATION_PLAN.md). /today is one of the 12 rooms, reached
// from here, not a separate top-level destination.
const TABS = [
  { href: '/home',           label: 'Home',      icon: Home          },
  { href: '/food',           label: 'Food',      icon: Utensils      },
  { href: '/work-home',      label: 'Work',      icon: Briefcase     },
  { href: '/luna',           label: 'LUNA',      icon: MessageCircle },
  { href: '/astrology',      label: 'Astrology', icon: Moon          },
  { href: '/spirit',         label: 'Spirit',    icon: Sparkles      },
  { href: '/creative-home',  label: 'Creative',  icon: Scissors      },
  { href: '/explore',        label: 'Explore',   icon: LayoutGrid    },
]

export function DesktopTabBar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/home') return pathname === '/home'
    if (href === '/food') return pathname.startsWith('/food')
    if (href === '/work-home') return pathname.startsWith('/work') || pathname.startsWith('/tasks') || pathname.startsWith('/calendar') || pathname.startsWith('/email') || pathname.startsWith('/money')
    if (href === '/astrology') return pathname.startsWith('/astrology') || pathname.startsWith('/manifest')
    if (href === '/spirit') return pathname.startsWith('/spirit') || pathname.startsWith('/tarot')
    if (href === '/creative-home') return pathname.startsWith('/creative')
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4 px-8"
      style={{ pointerEvents: 'none' }}>
      <div className="flex items-center gap-1 px-3 py-2.5 rounded-[28px]"
        style={{
          // Hardcoded warm dark-brown dock, not var(--dock-bg) — locked to
          // this palette regardless of the site-wide theme toggle, matching
          // the approved desktop reference (light header + warm dark dock).
          background: 'rgba(35,28,20,0.94)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(201,169,110,0.22)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          pointerEvents: 'all',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200 group"
              style={{
                background: active ? '#FBF8F2' : 'transparent',
                minWidth: 72,
              }}>
              <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-110"
                style={{ color: active ? '#100C1E' : 'rgba(245,239,226,0.65)' }} strokeWidth={1.6} />
              <span className="text-xs font-medium whitespace-nowrap transition-colors"
                style={{ color: active ? '#100C1E' : 'rgba(245,239,226,0.65)' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
