'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, Sparkles } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './StyleViews.module.css'

interface WardrobeItem { id: string; name: string; category: string; photo_url?: string }
interface OutfitResult { anchor: WardrobeItem; outfit: WardrobeItem[]; styling_note: string }

interface FindSimilarSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function FindSimilarSheet({ isOpen, onClose }: FindSimilarSheetProps) {
  const [items, setItems] = useState<WardrobeItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OutfitResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setResult(null)
    setError(null)
    fetch('/api/atelier/wardrobe', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setItems(data.items ?? []))
      .catch(() => setItems([]))
  }, [isOpen])

  async function pick(item: WardrobeItem) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/atelier/find-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't build that outfit")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Find Similar" subtitle="Pick a piece — LUNA builds an outfit around it from your closet" height="80vh">
      {loading ? (
        <div className={styles.emptyState}><p><Loader2 size={16} className="animate-spin" style={{ display: 'inline' }} /> Building your outfit…</p></div>
      ) : result ? (
        <>
          <div className={styles.similarAnchorRow}>
            <div className={styles.similarThumb}>{result.anchor.photo_url && <Image src={result.anchor.photo_url} alt={result.anchor.name} fill sizes="72px" unoptimized={result.anchor.photo_url.startsWith('data:')} />}</div>
            <div>
              <span className={styles.sectionHint} style={{ marginLeft: 0 }}>Anchor piece</span>
              <p className={styles.similarAnchorName}>{result.anchor.name}</p>
            </div>
          </div>

          {result.outfit.length === 0 ? (
            <div className={styles.emptyState}><p>{result.styling_note}</p></div>
          ) : (
            <>
              <div className={styles.closetFullGrid}>
                {result.outfit.map(item => (
                  <div key={item.id} className={styles.closetFullItem}>
                    {item.photo_url && <Image src={item.photo_url} alt={item.name} fill sizes="90px" unoptimized={item.photo_url.startsWith('data:')} />}
                  </div>
                ))}
              </div>
              <p className={styles.similarNote}><Sparkles size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />{result.styling_note}</p>
            </>
          )}
          <button type="button" className={styles.emptyButton} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setResult(null)}>Try another piece</button>
        </>
      ) : (
        <>
          {error && <p className={styles.wceMissing}>{error}</p>}
          {items === null ? (
            <p className={styles.sectionHint} style={{ marginLeft: 0 }}>Loading your closet…</p>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}><p>Add a few pieces to your closet first, then come back here.</p></div>
          ) : (
            <div className={styles.closetFullGrid}>
              {items.map(item => (
                <button key={item.id} type="button" className={styles.closetFullItem} style={{ border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => pick(item)}>
                  {item.photo_url && <Image src={item.photo_url} alt={item.name} fill sizes="90px" unoptimized={item.photo_url.startsWith('data:')} />}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </BottomSheet>
  )
}
