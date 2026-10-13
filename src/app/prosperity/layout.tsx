import type { Metadata } from 'next'
import { ProsperityDock } from '@/components/prosperity/ProsperityDock'
import styles from './prosperity.module.css'

export const metadata: Metadata = {
  title: 'Luna Prosperity',
  description: 'Luna finds the opportunity. Luna explains it. Luna helps create it. You approve it. You get paid.',
}

export default function ProsperityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>{children}</main>
      <ProsperityDock />
    </div>
  )
}
