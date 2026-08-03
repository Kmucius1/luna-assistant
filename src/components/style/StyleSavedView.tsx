'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'

import styles from './StyleViews.module.css'

const SAVED_KEY = 'luna_style_saved_v1'

export function StyleSavedView() {
  const [saved, setSaved] = useState<string[]>([])
  const [modalImage, setModalImage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
      if (Array.isArray(stored)) setSaved(stored)
    } catch { /* ignore */ }
  }, [])

  return (
    <>
      <div className={styles.sectionHeader}>
        <Heart size={13} /> Saved Looks
        {saved.length > 0 && <span className={styles.sectionHint}>{saved.length} saved</span>}
      </div>
      {saved.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Your saved looks will live here. Swipe right on an outfit you love in Explorer.</p>
        </div>
      ) : (
        <div className={styles.savedGrid}>
          {saved.slice().reverse().map(url => (
            <button key={url} type="button" className={styles.savedThumb} onClick={() => setModalImage(url)}>
              <Image src={url} alt="Saved look" fill sizes="150px" />
            </button>
          ))}
        </div>
      )}

      {modalImage && (
        <div className={styles.modalOverlay} onClick={() => setModalImage(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalPhoto}><Image src={modalImage} alt="Saved look detail" fill sizes="360px" /></div>
            <div className={styles.modalBody}>
              <p>Full styling breakdown (items owned, missing pieces, occasion notes) is coming soon — for now this saves the look so you can find it again.</p>
              <button type="button" className={styles.modalClose} onClick={() => setModalImage(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
