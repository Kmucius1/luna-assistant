import styles from '@/app/prosperity/prosperity.module.css'

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className={styles.page}>
      <div className={styles.eyebrow}>Luna Prosperity</div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.sub}>{body}</p>
    </div>
  )
}
