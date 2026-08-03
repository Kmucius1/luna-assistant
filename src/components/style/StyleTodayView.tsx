'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Maximize2, Upload } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './StyleViews.module.css'

interface DailyOutfit { occasion?: string; outfit_caption?: string; image_url?: string | null }

export function StyleTodayView() {
  const [uploading, setUploading] = useState(false)
  const [pick, setPick] = useState<DailyOutfit | null>(null)
  const [expanded, setExpanded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/atelier/daily-outfit', { cache: 'no-store' })
      .then(res => res.json())
      .then(setPick)
      .catch(() => setPick(null))
  }, [])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch {
      /* wardrobe/detect never hard-errors to the client anyway */
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [])

  return (
    <>
      <div className={styles.pickTopRow}>
        <div className={styles.sectionHeader}>Today&apos;s Pick</div>
        <button type="button" className={styles.logButton} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Organizing…' : 'Log What I\'m Wearing'} <Upload size={12} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
      </div>

      {pick?.image_url ? (
        <button type="button" className={styles.pickHero} onClick={() => setExpanded(true)}>
          <Image src={pick.image_url} alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.pickHeroOverlay} />
          <span className={styles.pickHeroHint}><Maximize2 size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />Tap to enlarge</span>
          <div className={styles.pickHeroContent}>
            <span className={styles.pickHeroLabel}>{pick.occasion ?? "Today's Outfit"}</span>
            <h2 className={styles.pickHeroTitle}>What I&apos;m Wearing Today</h2>
            <p className={styles.pickHeroCaption}>{pick.outfit_caption}</p>
          </div>
        </button>
      ) : (
        <div className={styles.emptyState}>
          <p>Luna is still picking today&apos;s outfit — check back in a moment.</p>
        </div>
      )}

      <BottomSheet isOpen={expanded} onClose={() => setExpanded(false)} title={pick?.occasion ?? "Today's Outfit"} subtitle={pick?.outfit_caption}>
        {pick?.image_url && (
          <div className={styles.sheetPhoto}><Image src={pick.image_url} alt="" fill sizes="90vw" /></div>
        )}
      </BottomSheet>
    </>
  )
}
