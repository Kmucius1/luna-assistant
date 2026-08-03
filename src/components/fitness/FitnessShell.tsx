'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Dumbbell, Calendar, TrendingUp, Sliders, Camera, type LucideIcon } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './FitnessShell.module.css'

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/fitness', label: 'Today', icon: Dumbbell },
  { href: '/fitness/plan', label: 'Plan', icon: Calendar },
  { href: '/fitness/track', label: 'Track', icon: TrendingUp },
  { href: '/fitness/setup', label: 'Setup', icon: Sliders },
  { href: '/fitness/photos', label: 'Photos', icon: Camera },
]

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/fitness') return pathname === '/fitness'
  return pathname.startsWith(href)
}

interface FitnessShellProps {
  children: React.ReactNode
  title: string
}

export function FitnessShell({ children, title }: FitnessShellProps) {
  const pathname = usePathname()

  return (
    <AppLayout noPad noScroll hideBottomNav swipeTabs={TABS.map(t => t.href)}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/home" className={styles.iconButton} aria-label="Back to Home"><ChevronLeft size={18} /></Link>
          <div className={styles.topBarTitle}><Dumbbell size={13} /> {title}</div>
          <span style={{ width: 36 }} />
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
