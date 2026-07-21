'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Heart,
  Quote,
  Shirt,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { useLocation } from '@/hooks/useLocation'
import styles from './LunaStylePage.module.css'

interface DailyOutfit { occasion?: string; why?: string; outfit_caption?: string; image_url?: string }
interface StylePoolImage { id: string; image_url: string; label?: string }
interface WardrobeItem { id: string; name?: string; category?: string; photo_url?: string }
interface WishlistItem { id: string; list?: string; text: string }

const SAVED_KEY = 'luna_style_saved_v1'

export function LunaStylePage() {
  const location = useLocation()

  const [outfit, setOutfit] = useState<DailyOutfit | null>(null)
  const [pool, setPool] = useState<StylePoolImage[]>([])
  const [poolIndex, setPoolIndex] = useState(0)
  const [likedCount, setLikedCount] = useState(0)
  const [deniedCount, setDeniedCount] = useState(0)
  const [wardrobe, setWardrobe] = useState<WardrobeItem[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [wishlistText, setWishlistText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (location.permitted === null) return
    const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    if (location.lat != null && location.lon != null) {
      params.set('lat', String(location.lat))
      params.set('lon', String(location.lon))
    }
    fetch(`/api/atelier/daily-outfit?${params.toString()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(setOutfit)
      .catch(() => setOutfit(null))
  }, [location.permitted, location.lat, location.lon])

  const loadPool = useCallback(() => {
    fetch(`/api/atelier/style-pool?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setPool(data.images ?? [])
        setPoolIndex(0)
        setLikedCount(data.likedCount ?? 0)
        setDeniedCount(data.deniedCount ?? 0)
      })
      .catch(() => setPool([]))
  }, [])

  useEffect(() => { loadPool() }, [loadPool])

  const loadWardrobe = useCallback(() => {
    fetch('/api/atelier/wardrobe', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setWardrobe(data.items ?? []))
      .catch(() => setWardrobe([]))
  }, [])

  useEffect(() => { loadWardrobe() }, [loadWardrobe])

  useEffect(() => {
    fetch('/api/atelier/shopping', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setWishlist(data.items ?? []))
      .catch(() => setWishlist([]))
  }, [])

  const currentCard = pool[poolIndex]

  function vote(imageId: string, value: 'liked' | 'denied') {
    fetch('/api/atelier/style-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id: imageId, vote: value }),
    }).catch(() => {})
    if (value === 'liked') setLikedCount(c => c + 1)
    else setDeniedCount(c => c + 1)
    setPoolIndex(i => i + 1)
  }

  function saveForLater(image: StylePoolImage) {
    vote(image.id, 'liked')
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
      localStorage.setItem(SAVED_KEY, JSON.stringify([...saved, image.image_url]))
    } catch { /* ignore */ }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
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
      loadWardrobe()
    } catch {
      /* silently ignore — detect route never hard-errors to the client anyway */
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function addWishlistItem() {
    if (!wishlistText.trim()) return
    const res = await fetch('/api/atelier/shopping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: wishlistText.trim() }),
    })
    const data = await res.json()
    if (data.item) setWishlist(w => [...w, data.item])
    setWishlistText('')
  }

  async function removeWishlistItem(id: string) {
    setWishlist(w => w.filter(i => i.id !== id))
    fetch('/api/atelier/shopping', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  const categoryCounts = (wardrobe ?? []).reduce<Record<string, number>>((acc, item) => {
    const cat = item.category || 'Uncategorized'
    acc[cat] = (acc[cat] ?? 0) + 1
    return acc
  }, {})

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.header}>
          <Image src="/images/rooms/style.png" alt="Style" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.headerOverlay} />
          <div className={styles.headerContent}>
            <h1>Style</h1>
            <p>Wear your confidence.</p>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader} style={{ marginBottom: 8 }}><Shirt size={15} /> Today&apos;s Outfit</p>
          <div className={`${styles.card} ${styles.outfitCard}`}>
            <div className={styles.outfitPhoto}>
              <Image src={outfit?.image_url || '/images/rooms/outfit-sporty.png'} alt={outfit?.outfit_caption ?? 'Today\'s outfit'} fill sizes="(max-width: 640px) 100vw, 480px" />
            </div>
            <p className={styles.outfitOccasion}>{outfit?.occasion ?? 'Loading your look…'}</p>
            {outfit?.outfit_caption && <p className={styles.outfitCaption}>{outfit.outfit_caption}</p>}
            {outfit?.why && (
              <div className={styles.outfitWhy}>
                <Quote size={14} />
                <span>{outfit.why}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader} style={{ marginBottom: 8 }}><Sparkles size={15} /> Outfit Discovery</p>
          <div className={`${styles.card} ${styles.swipeCard}`}>
            <div className={styles.swipePhoto}>
              {currentCard ? (
                <Image src={currentCard.image_url} alt={currentCard.label ?? 'Style inspiration'} fill sizes="(max-width: 640px) 100vw, 480px" />
              ) : (
                <div className={styles.swipeEmpty}>You&apos;re all caught up — check back tomorrow for new inspiration.</div>
              )}
            </div>
            {currentCard && (
              <div className={styles.swipeActions}>
                <button type="button" className={`${styles.swipeButton} ${styles.swipeButtonDeny}`} onClick={() => vote(currentCard.id, 'denied')} aria-label="Not my style"><X size={22} /></button>
                <button type="button" className={`${styles.swipeButton} ${styles.swipeButtonSave}`} onClick={() => saveForLater(currentCard)} aria-label="Save"><Star size={19} /></button>
                <button type="button" className={`${styles.swipeButton} ${styles.swipeButtonLove}`} onClick={() => vote(currentCard.id, 'liked')} aria-label="Love it"><Heart size={24} /></button>
              </div>
            )}
            <p className={styles.swipeStats}>{likedCount} loved &middot; {deniedCount} passed &middot; Luna is learning your style</p>
          </div>
        </div>

        <div>
          <div className={styles.closetHeader}>
            <p className={styles.sectionHeader}>My Closet</p>
            <button type="button" className={styles.uploadButton} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={13} /> {uploading ? 'Detecting…' : 'Upload Outfit'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleUpload} />
          </div>
          <div className={styles.card}>
            {wardrobe && wardrobe.length > 0 && (
              <div className={styles.closetInsights}>
                <span className={styles.insightPill}>{wardrobe.length} items</span>
                {Object.entries(categoryCounts).slice(0, 4).map(([cat, count]) => (
                  <span key={cat} className={styles.insightPill}>{count} {cat}</span>
                ))}
              </div>
            )}
            <div className={styles.closetGrid}>
              {wardrobe === null && <div className={styles.closetEmpty}>Loading your closet…</div>}
              {wardrobe?.length === 0 && <div className={styles.closetEmpty}>Your closet is empty — upload a photo to get started.</div>}
              {wardrobe?.slice(0, 9).map(item => (
                <div key={item.id} className={styles.closetItem}>
                  <div className={styles.closetPhoto}>
                    {item.photo_url && <Image src={item.photo_url} alt={item.name ?? item.category ?? 'Closet item'} fill sizes="120px" unoptimized={item.photo_url.startsWith('data:')} />}
                  </div>
                  <span>{item.name || item.category || 'Item'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader} style={{ marginBottom: 8 }}>Shopping Wishlist</p>
          <div className={styles.card}>
            <div className={styles.wishlistForm}>
              <input
                value={wishlistText}
                onChange={e => setWishlistText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addWishlistItem()}
                placeholder="Add something you want…"
              />
              <button type="button" onClick={addWishlistItem}>Add</button>
            </div>
            <div className={styles.wishlistList}>
              {wishlist.map(item => (
                <div key={item.id} className={styles.wishlistRow}>
                  <span>{item.text}</span>
                  <button type="button" onClick={() => removeWishlistItem(item.id)}><Trash2 size={14} /></button>
                </div>
              ))}
              {wishlist.length === 0 && <div className={styles.closetEmpty}>Nothing on your wishlist yet.</div>}
            </div>
          </div>
        </div>

        <p className={styles.deferredNote}>Outfit Builder, Packing, and Style DNA are coming soon.</p>
      </div>
    </AppLayout>
  )
}
