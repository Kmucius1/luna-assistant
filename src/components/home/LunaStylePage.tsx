'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell,
  Calendar,
  Heart,
  Search,
  ShirtIcon,
  Undo2,
  Upload,
  User,
  X,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './LunaStylePage.module.css'

interface WardrobeItem { id: string; name?: string; category?: string; photo_url?: string }
interface StylePoolImage { id: string; image_url: string; label?: string }

const SAVED_KEY = 'luna_style_saved_v1'

// Real backend has no distinct fashion "title/description/tags" per pool
// image yet — only a lane `label` used to steer future generation. These
// are display-only groupings derived from that label; not fabricated
// per-image copy.
const LANE_DISPLAY: Record<string, { title: string; description: string; tags: string[] }> = {
  default: { title: 'Fashion Killa Edit', description: 'Bold silhouettes, low-rise denim, and statement everything.', tags: ['Swag', 'Night Out', 'Creative', 'Off-Duty'] },
  streetwear: { title: 'Street Luxe Edit', description: 'Oversized layers and leather with a feminine edge.', tags: ['Swag', 'Street', 'Bold'] },
  edgy: { title: 'Edgy Off-Duty', description: 'Deconstructed pieces with statement gold.', tags: ['Edgy', 'Off-Duty', 'Bold'] },
}

interface ClosetBucket {
  id: string
  label: string
  fallbackImage: string
  match: (category: string) => boolean
}

const CLOSET_BUCKETS: ClosetBucket[] = [
  { id: 'tops', label: 'Statement Tops', fallbackImage: '/images/style/closet-tops.jpg', match: c => /top|shirt|dress|hoodie|jacket|corset|bodysuit/.test(c) },
  { id: 'denim', label: 'Baggy Denim', fallbackImage: '/images/style/closet-denim.jpg', match: c => /denim|jean|pant|cargo|trouser|short|skirt/.test(c) },
  { id: 'boots', label: 'Boots + Heels', fallbackImage: '/images/style/closet-boots.jpg', match: c => /boot|heel|shoe|sneaker/.test(c) },
  { id: 'bags', label: 'Bags + Jewelry', fallbackImage: '/images/style/closet-bags.jpg', match: c => /bag|jewelry|belt|sunglasses|hat|accessor/.test(c) },
]

const FALLBACK_DECK: { image: string; label: string }[] = [
  { image: '/images/style/inspo-1.jpg', label: 'default' },
  { image: '/images/style/inspo-2.jpg', label: 'edgy' },
  { image: '/images/style/inspo-3.jpg', label: 'streetwear' },
]

export function LunaStylePage() {
  const [wardrobe, setWardrobe] = useState<WardrobeItem[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pool, setPool] = useState<StylePoolImage[]>([])
  const [poolLoaded, setPoolLoaded] = useState(false)
  const [poolIndex, setPoolIndex] = useState(0)
  const [lastSwiped, setLastSwiped] = useState<{ card: StylePoolImage; vote: 'liked' | 'denied' } | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [closetModalOpen, setClosetModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadWardrobe = useCallback(() => {
    fetch('/api/atelier/wardrobe', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setWardrobe(data.items ?? []))
      .catch(() => setWardrobe([]))
  }, [])

  useEffect(() => { loadWardrobe() }, [loadWardrobe])

  useEffect(() => {
    fetch(`/api/atelier/style-pool?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setPool(data.images ?? []))
      .catch(() => setPool([]))
      .finally(() => setPoolLoaded(true))
  }, [])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
      if (Array.isArray(stored)) setSaved(stored)
    } catch { /* ignore */ }
  }, [])

  const deck = pool.length > 0 ? pool : FALLBACK_DECK.map((d, i) => ({ id: `fallback-${i}`, image_url: d.image, label: d.label }))
  const usingFallbackDeck = pool.length === 0

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        await fetch('/api/atelier/wardrobe/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, sourceLabel: 'style-page-upload' }),
        })
      }
      loadWardrobe()
    } catch {
      /* wardrobe/detect never hard-errors to the client anyway */
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function persistSaved(next: string[]) {
    setSaved(next)
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
    if (vote === 'liked' && !saved.includes(card.image_url)) {
      persistSaved([...saved, card.image_url])
    }
    setLastSwiped({ card, vote })
    setPoolIndex(i => i + 1)
  }

  function undoSwipe() {
    if (!lastSwiped) return
    if (lastSwiped.vote === 'liked') {
      persistSaved(saved.filter(url => url !== lastSwiped.card.image_url))
    }
    setPoolIndex(i => Math.max(0, i - 1))
    setLastSwiped(null)
  }

  const bucketData = useMemo(() => {
    return CLOSET_BUCKETS.map(bucket => {
      const items = (wardrobe ?? []).filter(item => bucket.match((item.category ?? '').toLowerCase()))
      return {
        ...bucket,
        count: items.length,
        image: items[0]?.photo_url || bucket.fallbackImage,
      }
    })
  }, [wardrobe])

  const currentCard = deck[poolIndex]
  const nextCard = deck[poolIndex + 1]
  const afterCard = deck[poolIndex + 2]
  const closetEmpty = wardrobe !== null && wardrobe.length === 0

  return (
    <AppLayout noPad noScroll>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Style</h1>
            <p>Curate your closet. Dress with intention.</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="Notifications"><Bell size={18} strokeWidth={1.6} /></button>
            <Link href="/settings" className={styles.iconButton} aria-label="Profile"><User size={18} strokeWidth={1.6} /></Link>
          </div>
        </div>

        <div className={styles.uploadHero}>
          <div className={styles.uploadText}>
            <div className={styles.uploadLabel}>Today&apos;s Outfit</div>
            <h2>Upload today&apos;s look and let AI organize it for you.</h2>
            <button type="button" className={styles.uploadButton} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Organizing…' : 'Upload Outfit'} <Upload size={15} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={handleUpload} />
          </div>
          <div className={styles.uploadPhoto}>
            <Image src="/images/style/closet-hero.jpg" alt="Zoe's closet" fill sizes="(max-width: 640px) 45vw, 300px" />
          </div>
        </div>

        <div id="closet" className={styles.closetSection}>
          <div className={styles.sectionHeader}>
            <h2>AI Closet</h2>
            {!closetEmpty && <button type="button" onClick={() => setClosetModalOpen(true)}>View all ›</button>}
          </div>
          {closetEmpty ? (
            <div className={styles.emptyState}>
              <p>Your closet is waiting. Upload an outfit and Luna will organize the pieces for you.</p>
              <button type="button" className={styles.emptyButton} onClick={() => fileInputRef.current?.click()}>Upload First Outfit <Upload size={13} /></button>
            </div>
          ) : (
            <div className={styles.closetRow}>
              {bucketData.map(bucket => (
                <div key={bucket.id} className={styles.closetCard}>
                  <div className={styles.closetPhoto}><Image src={bucket.image} alt={bucket.label} fill sizes="80px" unoptimized={bucket.image.startsWith('data:')} /></div>
                  <h3>{bucket.label}</h3>
                  <p>{bucket.count} {bucket.count === 1 ? 'item' : 'items'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div id="inspiration" className={styles.inspirationSection}>
          <div className={styles.sectionHeader}>
            <h2>Outfit Inspiration</h2>
            <button type="button">See all ›</button>
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
                    <Image src={currentCard.image_url} alt={currentCard.label ?? 'Outfit inspiration'} fill sizes="(max-width: 640px) 55vw, 300px" />
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
        </div>

        <div id="saved" className={styles.savedSection}>
          <div className={styles.sectionHeader}>
            <h2>Saved Looks</h2>
            {saved.length > 0 && <button type="button">View all ›</button>}
          </div>
          {saved.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Your saved looks will live here. Swipe right on an outfit you love.</p>
            </div>
          ) : (
            <div className={styles.savedRow}>
              {saved.slice().reverse().map(url => (
                <button key={url} type="button" className={styles.savedThumb} onClick={() => setModalImage(url)}>
                  <Image src={url} alt="Saved look" fill sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.quickGrid}>
          <Link href="/plan-my-day" className={styles.quickCard}>
            <Calendar size={18} strokeWidth={1.6} />
            <strong>Plan a Look</strong>
            <span>Build outfits for your week</span>
          </Link>
          <div className={styles.quickCard}>
            <span className={styles.quickBadge}>Soon</span>
            <ShirtIcon size={18} strokeWidth={1.6} />
            <strong>Build from Closet</strong>
            <span>Create with what you own</span>
          </div>
          <div className={styles.quickCard}>
            <span className={styles.quickBadge}>Soon</span>
            <Search size={18} strokeWidth={1.6} />
            <strong>Find Similar</strong>
            <span>Discover new pieces</span>
          </div>
        </div>
      </div>

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

      {closetModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setClosetModalOpen(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalBody}>
              <h3>Full Closet</h3>
              <div className={styles.closetFullGrid}>
                {(wardrobe ?? []).map(item => (
                  <div key={item.id} className={styles.closetFullItem}>
                    {item.photo_url && <Image src={item.photo_url} alt={item.name ?? item.category ?? 'Item'} fill sizes="90px" unoptimized={item.photo_url.startsWith('data:')} />}
                  </div>
                ))}
              </div>
              <button type="button" className={styles.modalClose} style={{ marginTop: 14 }} onClick={() => setClosetModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
