'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Heart, Sparkles, Undo2, X } from 'lucide-react'

import styles from './StyleViews.module.css'

interface StylePoolImage { id: string; image_url: string; label?: string }

const SAVED_KEY = 'luna_style_saved_v1'

const LANE_DISPLAY: Record<string, { title: string; description: string; tags: string[] }> = {
  default: { title: 'Fashion Killa Edit', description: 'Bold silhouettes, low-rise denim, and statement everything.', tags: ['Swag', 'Night Out', 'Creative', 'Off-Duty'] },
  streetwear: { title: 'Street Luxe Edit', description: 'Oversized layers and leather with a feminine edge.', tags: ['Swag', 'Street', 'Bold'] },
  edgy: { title: 'Edgy Off-Duty', description: 'Deconstructed pieces with statement gold.', tags: ['Edgy', 'Off-Duty', 'Bold'] },
}

const FALLBACK_DECK: { image: string; label: string }[] = [
  { image: '/images/style/inspo-1.jpg', label: 'default' },
  { image: '/images/style/inspo-2.jpg', label: 'edgy' },
  { image: '/images/style/inspo-3.jpg', label: 'streetwear' },
]

export function StyleExplorerView() {
  const [pool, setPool] = useState<StylePoolImage[]>([])
  const [poolLoaded, setPoolLoaded] = useState(false)
  const [poolFetchFailed, setPoolFetchFailed] = useState(false)
  const [poolIndex, setPoolIndex] = useState(0)
  const [lastSwiped, setLastSwiped] = useState<{ card: StylePoolImage; vote: 'liked' | 'denied' } | null>(null)

  useEffect(() => {
    fetch(`/api/atelier/style-pool?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setPool(data.images ?? []))
      .catch(() => setPoolFetchFailed(true))
      .finally(() => setPoolLoaded(true))
  }, [])

  // The static fallback deck exists only for a genuine fetch failure — it
  // has no vote tracking, so using it whenever the pool is merely empty
  // (i.e. she's voted on everything currently available) would show the
  // same 3 images on every repeat visit.
  const usingFallbackDeck = poolFetchFailed
  const deck = usingFallbackDeck
    ? FALLBACK_DECK.map((d, i) => ({ id: `fallback-${i}`, image_url: d.image, label: d.label }))
    : pool

  function persistSaved(next: string[]) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  function swipe(vote: 'liked' | 'denied') {
    const card = deck[poolIndex]
    if (!card) return
    if (!usingFallbackDeck) {
      fetch('/api/atelier/style-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_id: card.id, vote }),
      }).catch(() => {})
    }
    if (vote === 'liked') {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
        if (Array.isArray(saved) && !saved.includes(card.image_url)) persistSaved([...saved, card.image_url])
      } catch { /* ignore */ }
    }
    setLastSwiped({ card, vote })
    setPoolIndex(i => i + 1)
  }

  function undoSwipe() {
    if (!lastSwiped) return
    if (lastSwiped.vote === 'liked') {
      try {
        const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
        if (Array.isArray(saved)) persistSaved(saved.filter((url: string) => url !== lastSwiped.card.image_url))
      } catch { /* ignore */ }
    }
    setPoolIndex(i => Math.max(0, i - 1))
    setLastSwiped(null)
  }

  const currentCard = deck[poolIndex]
  const nextCard = deck[poolIndex + 1]
  const afterCard = deck[poolIndex + 2]

  return (
    <>
      <div className={styles.sectionHeader}>
        <Sparkles size={13} /> Outfit Inspiration
        <span className={styles.sectionHint}>Swipe to curate your taste</span>
      </div>
      {!poolLoaded ? (
        <div className={styles.swipeEmpty}>Loading inspiration…</div>
      ) : currentCard ? (
        <>
          <div className={styles.swipeStage}>
            {afterCard && <div className={`${styles.swipeCard} ${styles.swipeCardBehind2}`} />}
            {nextCard && <div className={`${styles.swipeCard} ${styles.swipeCardBehind1}`} />}
            <div className={`${styles.swipeCard} ${styles.swipeCardActive}`}>
              <div className={styles.swipePhotoHalf}>
                <Image src={currentCard.image_url} alt={currentCard.label ?? 'Outfit inspiration'} fill sizes="(max-width: 640px) 100vw, 640px" />
              </div>
              <div className={styles.swipeInfoHalf}>
                {(() => {
                  const meta = LANE_DISPLAY[currentCard.label ?? 'default'] ?? LANE_DISPLAY.default
                  return (
                    <>
                      <div className={styles.swipeLabel}>{(currentCard.label ?? 'Street Luxe').replace(/_/g, ' ')}</div>
                      <h3>{meta.title}</h3>
                      <p>{meta.description}</p>
                      <div className={styles.swipeTags}>{meta.tags.map(t => <span key={t}>{t}</span>)}</div>
                    </>
                  )
                })()}
              </div>
            </div>
            <div className={styles.swipeActions}>
              <button type="button" className={styles.swipeButton} onClick={() => swipe('denied')} aria-label="Not my style"><X size={19} /></button>
              <button type="button" className={`${styles.swipeButton} ${styles.swipeButtonLove}`} onClick={() => swipe('liked')} aria-label="Love it"><Heart size={19} /></button>
            </div>
          </div>
          {lastSwiped && (
            <button type="button" className={styles.undoButton} onClick={undoSwipe}><Undo2 size={13} /> Undo last swipe</button>
          )}
        </>
      ) : (
        <div className={styles.swipeEmpty}>You&apos;re all caught up — check back tomorrow for new inspiration.</div>
      )}
    </>
  )
}
