import Image from 'next/image'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from './ComingSoonRoom.module.css'

interface ComingSoonRoomProps {
  label: string
  image: string
  tagline: string
  planned: string[]
}

export function ComingSoonRoom({ label, image, tagline, planned }: ComingSoonRoomProps) {
  return (
    <AppLayout noPad>
      <div className={styles.wrap}>
        <div className={styles.hero}>
          <Image src={image} alt={label} fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.overlay} />
          <div className={styles.content}>
            <span className={styles.badge}>Coming Soon</span>
            <h1>{label}</h1>
            <p>{tagline}</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2>What&apos;s planned</h2>
          <ul className={styles.list}>
            {planned.map(item => <li key={item}>{item}</li>)}
          </ul>
          <Link href="/" className={styles.back}>← Back to Home</Link>
        </div>
      </div>
    </AppLayout>
  )
}
