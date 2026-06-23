'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Sparkles, BriefcaseIcon, MessageCircle,
  Star, Scissors, Archive, Moon, Mic
} from 'lucide-react'

const TABS = [
  { href: '/',          label: 'Home',      icon: Home          },
  { href: '/morning',   label: 'Morning',   icon: Sparkles      },
  { href: '/chat',      label: 'LUNA',      icon: MessageCircle },
  { href: '/work',      label: 'Work',      icon: BriefcaseIcon },
  { href: '/astrology', label: 'Astrology', icon: Star          },
  { href: '/atelier',   label: 'Atelier',   icon: Scissors      },
  { href: '/vault',     label: 'Vault',     icon: Archive       },
  { href: '/night',     label: 'Night',     icon: Moon          },
]

export function DesktopTabBar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Floating dictation button */}
      <Link href="/dictation"
        className="hidden lg:flex fixed bottom-[100px] right-8 z-50 w-14 h-14 rounded-full items-center justify-center transition-all duration-200 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #8B6FB8 0%, #6A4F9B 100%)',
          boxShadow: '0 4px 24px rgba(139,111,184,0.5), 0 0 0 1px rgba(139,111,184,0.3)',
        }}>
        <Mic className="h-6 w-6 text-white" strokeWidth={1.8} />
      </Link>

      {/* Bottom dock — full width bar */}
      <nav className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 items-center justify-center px-8"
        style={{
          height: 80,
          background: 'rgba(10, 8, 28, 0.94)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
        <div className="flex items-center gap-1 w-full max-w-4xl"
          style={{
            pointerEvents: 'all',
          }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {TABS.map(({ href, label, icon: Icon, badge }: any) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="relative flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-200 group flex-1"
                style={{
                  background: active ? 'rgba(201,169,110,0.12)' : 'transparent',
                  borderRadius: 16,
                }}>
                <div className="relative">
                  <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-110"
                    style={{ color: active ? '#C9A96E' : 'rgba(255,255,255,0.5)' }}
                    strokeWidth={active ? 2.2 : 1.6} />
                  {badge && !active && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: '#8B6FB8', border: '1.5px solid var(--dock-bg)' }}>
                      <span className="text-white font-bold" style={{ fontSize: 9 }}>{badge}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium whitespace-nowrap transition-colors"
                  style={{ color: active ? '#C9A96E' : 'rgba(255,255,255,0.45)', fontWeight: active ? 700 : 500 }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
