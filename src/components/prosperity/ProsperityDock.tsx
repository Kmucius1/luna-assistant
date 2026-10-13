'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Compass, Clapperboard, Gem, User, ArrowLeft } from 'lucide-react'
import styles from '@/app/prosperity/prosperity.module.css'

const TABS = [
  { href: '/prosperity', label: 'Home', icon: Sparkles },
  { href: '/prosperity/finds', label: 'Finds', icon: Compass },
  { href: '/prosperity/clips', label: 'Clips', icon: Clapperboard },
  { href: '/prosperity/products', label: 'Products', icon: Gem },
  { href: '/prosperity/you', label: 'You', icon: User },
]

function isActive(pathname: string, href: string) {
  return href === '/prosperity' ? pathname === href : pathname.startsWith(href)
}

export function ProsperityDock() {
  const pathname = usePathname()
  return (
    <>
      <Link href="/home" className={styles.exit} aria-label="Back to Luna">
        <ArrowLeft size={14} strokeWidth={1.5} /> Luna
      </Link>
      <nav className={styles.dock} aria-label="Prosperity">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={styles.dockItem}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={active ? 1.8 : 1.4} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
