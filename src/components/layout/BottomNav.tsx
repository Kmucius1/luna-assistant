'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, MessageCircle, Moon, LayoutGrid } from 'lucide-react'

// Home is the 12-room app grid at /home — also where "/" redirects to,
// so this tab matches the app's real landing page (see
// LUNA_V2_MIGRATION_PLAN.md). /today is one of the 12 rooms, reached
// from here, not a separate top-level destination.
const TABS = [
  { href: '/home',              label: 'Home',      icon: Home          },
  { href: '/food',              label: 'Food',      icon: Utensils      },
  { href: '/luna',             label: 'LUNA',      icon: MessageCircle },
  { href: '/astrology',        label: 'Astrology', icon: Moon          },
  { href: '/explore',          label: 'Explore',   icon: LayoutGrid    },
]

function isActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home'
  if (href === '/food') return pathname.startsWith('/food')
  if (href === '/astrology') return pathname.startsWith('/astrology') || pathname.startsWith('/manifest')
  return pathname.startsWith(href)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed left-0 right-0"
      style={{
        bottom: 0,
        zIndex: 100,
        borderTop: '1px solid var(--dock-border)',
        borderRadius: '28px 28px 0 0',
        background: 'var(--dock-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: '0 -10px 28px rgba(70,50,30,0.14)',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        gap: 2, padding: '10px 10px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
      }}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '8px 4px 6px',
                borderRadius: 26,
                textDecoration: 'none',
                background: active ? 'rgba(92,69,48,0.14)' : 'transparent',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon
                style={{
                  width: 22, height: 22,
                  color: active ? 'var(--luna-purple)' : 'var(--text-3)',
                  strokeWidth: active ? 2 : 1.5,
                  transition: 'color 0.18s',
                }}
              />
              <span style={{
                fontSize: 10, marginTop: 4, fontWeight: active ? 700 : 500,
                color: active ? 'var(--luna-purple)' : 'var(--text-3)',
                letterSpacing: '0.01em',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
