'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MessageCircle, Moon, LayoutGrid } from 'lucide-react'

const TABS = [
  { href: '/',          label: 'Home',      icon: Home          },
  { href: '/work',      label: 'Work',      icon: Briefcase     },
  { href: '/luna',      label: 'LUNA',      icon: MessageCircle },
  { href: '/astrology', label: 'Astrology', icon: Moon          },
  { href: '/explore',   label: 'Explore',   icon: LayoutGrid    },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
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
        background: 'rgba(10,6,28,0.94)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxShadow: '0 -4px 32px rgba(100,60,200,0.14), 0 -1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
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
                background: active ? 'rgba(124,58,237,0.28)' : 'transparent',
                boxShadow: active ? '0 0 20px rgba(139,92,246,0.30)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              <Icon
                style={{
                  width: 22, height: 22,
                  color: active ? '#C4A9E8' : 'rgba(255,255,255,0.38)',
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
