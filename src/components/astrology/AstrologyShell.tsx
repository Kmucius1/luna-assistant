'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Sparkles, User, Moon, PieChart, Clock, Heart, Grid3x3 } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './AstrologyShell.module.css'

const TABS = [
  { href: '/astrology', label: 'Today', icon: Sparkles },
  { href: '/astrology/chart', label: 'My Chart', icon: PieChart },
  { href: '/astrology/timing', label: 'Timing', icon: Clock },
  { href: '/astrology/connections', label: 'Connections', icon: Heart },
  { href: '/astrology/more', label: 'More', icon: Grid3x3 },
] as const

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/astrology') return pathname === '/astrology'
  return pathname.startsWith(href)
}

interface AstrologyShellProps {
  children: React.ReactNode
  backHref?: string
}

export function AstrologyShell({ children, backHref }: AstrologyShellProps) {
  const pathname = usePathname()

  return (
    <AppLayout noPad noScroll hideBottomNav swipeTabs={TABS.map(t => t.href)}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          {backHref ? (
            <Link href={backHref} className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
          ) : <span style={{ width: 36 }} />}
          <div className={styles.topBarTitle}><Moon size={13} /> Astrology <Sparkles size={11} /></div>
          <Link href="/profile" className={styles.iconButton} aria-label="Profile"><User size={16} /></Link>
        </div>

        <div className={styles.content}>{children}</div>

        <nav className={styles.subNav}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = isTabActive(pathname, tab.href)
            return (
              <Link key={tab.href} href={tab.href} className={`${styles.subNavTab} ${active ? styles.subNavTabActive : ''}`}>
                <Icon size={20} strokeWidth={active ? 2.1 : 1.7} />
                <span className={styles.subNavLabel}>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </AppLayout>
  )
}
