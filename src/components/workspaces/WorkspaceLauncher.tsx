'use client'

import Link from 'next/link'
import { ChevronRight, Sparkles, type LucideIcon } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from './WorkspaceLauncher.module.css'

export interface WorkspaceApp {
  title: string
  description: string
  href: string
  icon: LucideIcon
  art: 'fashion' | 'closet' | 'oracle' | 'sewing' | 'generated' | 'vault' | 'wishlist' | 'tasks' | 'calendar' | 'mail' | 'money' | 'crm' | 'reports' | 'documents' | 'contacts' | 'daily' | 'chart' | 'transits' | 'moon' | 'love' | 'tarot' | 'rituals' | 'journal' | 'manifest' | 'cosmic'
}

interface WorkspaceLauncherProps {
  eyebrow: string
  title: string
  description: string
  apps: WorkspaceApp[]
  theme: 'creative' | 'work' | 'astrology'
}

export function WorkspaceLauncher({ eyebrow, title, description, apps, theme }: WorkspaceLauncherProps) {
  return (
    <AppLayout noPad noScroll>
      <div className={`${styles.page} ${styles[theme]}`}>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroIcon}><Sparkles size={20} strokeWidth={1.5} /></div>
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </section>

        <section className={styles.scroller} aria-label={`${title} apps`}>
          {apps.map(({ title: appTitle, description: appDescription, href, icon: Icon, art }) => (
            <Link key={appTitle} href={href} className={`${styles.card} ${styles[`art_${art}`]}`}>
              <div className={styles.cardArt} aria-hidden="true">
                <div className={styles.orbit} />
                <Icon size={40} strokeWidth={1.15} />
              </div>
              <div className={styles.cardCopy}>
                <div className={styles.appIcon}><Icon size={18} strokeWidth={1.6} /></div>
                <div>
                  <h2>{appTitle}</h2>
                  <p>{appDescription}</p>
                </div>
              </div>
              <div className={styles.openButton}>Open <ChevronRight size={15} /></div>
            </Link>
          ))}
        </section>

        <div className={styles.hint}>Swipe through your apps, then tap one to open it.</div>
      </div>
    </AppLayout>
  )
}
