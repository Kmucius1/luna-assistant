'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Briefcase, CheckSquare, Calendar, FolderOpen, ClipboardList, type LucideIcon } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './WorkShell.module.css'

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/work', label: 'Today', icon: Briefcase },
  { href: '/work/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/work/agenda', label: 'Agenda', icon: Calendar },
  { href: '/work/projects', label: 'Projects', icon: FolderOpen },
  { href: '/work/notes', label: 'Notes', icon: ClipboardList },
]

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/work') return pathname === '/work'
  return pathname.startsWith(href)
}

interface WorkShellProps {
  children: React.ReactNode
  title: string
}

export function WorkShell({ children, title }: WorkShellProps) {
  const pathname = usePathname()

  return (
    <AppLayout noPad noScroll hideBottomNav swipeTabs={TABS.map(t => t.href)}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/home" className={styles.iconButton} aria-label="Back to Home"><ChevronLeft size={18} /></Link>
          <div className={styles.topBarTitle}><Briefcase size={13} /> {title}</div>
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
