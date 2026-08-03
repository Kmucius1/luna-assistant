'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, Soup, BookOpen, ShoppingCart, Package, Heart, type LucideIcon } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './FoodShell.module.css'

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/food', label: 'Meal Plan', icon: Soup },
  { href: '/food/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/food/groceries', label: 'Groceries', icon: ShoppingCart },
  { href: '/food/pantry', label: 'Pantry', icon: Package },
  { href: '/food/favorites', label: 'Favorites', icon: Heart },
]

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/food') return pathname === '/food'
  return pathname.startsWith(href)
}

interface FoodShellProps {
  children: React.ReactNode
  title: string
}

export function FoodShell({ children, title }: FoodShellProps) {
  const pathname = usePathname()

  return (
    <AppLayout noPad noScroll hideBottomNav swipeTabs={TABS.map(t => t.href)}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/home" className={styles.iconButton} aria-label="Back to Home"><ChevronLeft size={18} /></Link>
          <div className={styles.topBarTitle}><Soup size={13} /> {title}</div>
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
