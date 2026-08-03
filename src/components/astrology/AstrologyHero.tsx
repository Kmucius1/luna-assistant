import Image from 'next/image'
import styles from './AstrologyHero.module.css'

interface AstrologyHeroProps {
  image: string
  label: string
  title: string
  subtitle: string
}

export function AstrologyHero({ image, label, title, subtitle }: AstrologyHeroProps) {
  return (
    <div className={styles.hero}>
      <Image src={image} alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}
