'use client'

import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GreetingHeader, useTodayContext } from '@/components/home/GreetingHeader'
import { TilePager } from '@/components/ui/TilePager'
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
  const { now, weather, weatherError } = useTodayContext()

  return (
    <AppLayout noPad noScroll>
      <div className={`${styles.page} ${styles[theme]}`}>
        <GreetingHeader now={now} weather={weather} weatherError={weatherError} backHref="/home" />
        <p className={styles.subheading}>{eyebrow} · {title} — {description}</p>

        <div className={styles.pagerWrap}>
          <TilePager
            items={apps}
            keyFor={a => a.title}
            renderItem={({ title: appTitle, description: appDescription, href, icon: Icon, art }) => (
              <Link href={href} className={`${styles.card} ${styles[`art_${art}`]}`}>
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
            )}
          />
        </div>

        <div className={styles.hint}>Swipe or tap a dot for more, then tap an app to open it.</div>
      </div>
    </AppLayout>
  )
}
