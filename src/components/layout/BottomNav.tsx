'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Utensils, Briefcase, MessageCircle, Moon, Scissors, LayoutGrid, Sparkles } from 'lucide-react'

// Home is the 12-room app grid at /home; the app's own landing
// page ("/") redirects straight to /today instead (see
// LUNA_V2_MIGRATION_PLAN.md) — they're deliberately two different screens.
const TABS = [
  { href: '/home',              label: 'Home',      icon: Home          },
  { href: '/food',              label: 'Food',      icon: Utensils      },
  { href: '/work-home',        label: 'Work',      icon: Briefcase     },
  { href: '/luna',             label: 'LUNA',      icon: MessageCircle },
  { href: '/astrology',        label: 'Astrology', icon: Moon          },
  { href: '/spirit',           label: 'Spirit',    icon: Sparkles      },
  { href: '/creative-home',    label: 'Creative',  icon: Scissors      },
  { href: '/explore',          label: 'Explore',   icon: LayoutGrid    },
]

function isActive(pathname: string, href: string) {
  if (href === '/home') return pathname === '/home'
  if (href === '/food') return pathname.startsWith('/food')
  if (href === '/work-home') return pathname.startsWith('/work') || pathname.startsWith('/tasks') || pathname.startsWith('/calendar') || pathname.startsWith('/email') || pathname.startsWith('/money')
  if (href === '/astrology') return pathname.startsWith('/astrology') || pathname.startsWith('/manifest')
  if (href === '/spirit') return pathname.startsWith('/spirit') || pathname.startsWith('/tarot')
  if (href === '/creative-home') return pathname.startsWith('/creative')
  return pathname.startsWith(href)
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed left-0 right-0 z-50"
      style={{
        bottom: 0,
        borderTop: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '28px 28px 0 0',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 -4px 32px rgba(100,60,200,0.14), 0 -1px 0 rgba(255,255,255,0.05)',
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
                background: active ? 'rgba(155,92,255,0.28)' : 'transparent',
                boxShadow: active ? '0 0 20px rgba(155,92,255,0.30)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon
                style={{
                  width: 22, height: 22,
                  color: active ? 'var(--luna-purple-2)' : 'rgba(255,255,255,0.38)',
                  strokeWidth: active ? 2 : 1.5,
                  transition: 'color 0.18s',
                }}
              />
              <span style={{
                fontSize: 10, marginTop: 4, fontWeight: active ? 700 : 500,
                color: active ? 'white' : 'rgba(255,255,255,0.35)',
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
