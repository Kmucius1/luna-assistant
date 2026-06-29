'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MessageCircle, Moon, Compass } from 'lucide-react'

const TABS = [
  { href: '/',          label: 'Home',      icon: Home          },
  { href: '/work',      label: 'Work',      icon: Briefcase     },
  { href: '/luna',      label: 'LUNA',      icon: MessageCircle },
  { href: '/astrology', label: 'Astrology', icon: Moon          },
  { href: '/explore',   label: 'Explore',   icon: Compass       },
]

export function DesktopTabBar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4 px-8"
      style={{ pointerEvents: 'none' }}>
      <div className="flex items-center gap-1 px-3 py-2.5 rounded-[28px]"
        style={{
          background: 'var(--dock-bg)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid var(--dock-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
          pointerEvents: 'all',
        }}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200 group"
              style={{
                background: active ? 'var(--tab-active-bg)' : 'transparent',
                minWidth: 72,
              }}>
              <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-110"
                style={{ color: active ? 'var(--tab-active-text)' : 'var(--tab-inactive-text)' }} strokeWidth={1.6} />
              <span className="text-xs font-medium whitespace-nowrap transition-colors"
                style={{ color: active ? 'var(--tab-active-text)' : 'var(--tab-inactive-text)' }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
