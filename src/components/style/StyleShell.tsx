'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ShirtIcon, LayoutGrid, Sparkles as SparklesIcon, Search, Heart, type LucideIcon } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './StyleShell.module.css'

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/style', label: 'Today', icon: ShirtIcon },
  { href: '/style/closet', label: 'Closet', icon: LayoutGrid },
  { href: '/style/explorer', label: 'Explorer', icon: SparklesIcon },
  { href: '/style/find', label: 'Find', icon: Search },
  { href: '/style/saved', label: 'Saved', icon: Heart },
]

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/style') return pathname === '/style'
  return pathname.startsWith(href)
}

interface StyleShellProps {
  children: React.ReactNode
  title: string
}

export function StyleShell({ children, title }: StyleShellProps) {
  const pathname = usePathname()

  return (
    <AppLayout noPad noScroll hideBottomNav swipeTabs={TABS.map(t => t.href)}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/home" className={styles.iconButton} aria-label="Back to Home"><ChevronLeft size={18} /></Link>
          <div className={styles.topBarTitle}><ShirtIcon size={13} /> {title}</div>
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
