'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { LayoutGrid, Upload } from 'lucide-react'

import styles from './StyleViews.module.css'

interface WardrobeItem { id: string; name?: string; category?: string; photo_url?: string }

interface ClosetBucket {
  id: string
  label: string
  fallbackImage: string
  match: (category: string) => boolean
}

const CLOSET_BUCKETS: ClosetBucket[] = [
  { id: 'tops', label: 'Statement Tops', fallbackImage: '/images/style/closet-tops.jpg', match: c => /top|shirt|dress|hoodie|jacket|corset|bodysuit/.test(c) },
  { id: 'denim', label: 'Baggy Denim', fallbackImage: '/images/style/closet-denim.jpg', match: c => /denim|jean|pant|cargo|trouser|short|skirt/.test(c) },
  { id: 'shoes', label: 'Shoes', fallbackImage: '/images/style/closet-boots.jpg', match: c => /boot|heel|shoe|sneaker/.test(c) },
  { id: 'bags', label: 'Bags + Jewelry', fallbackImage: '/images/style/closet-bags.jpg', match: c => /bag|jewelry|belt|sunglasses|hat|accessor/.test(c) },
]

// wardrobe/detect stores the AI's specific detected term (e.g. "sneakers",
// "ankle boots") as the prefix of `name`. Only claim a specific term when
// every item in the bucket agrees on it — otherwise fall back to the
// honest generic "Shoes".
function specificFootwearLabel(items: WardrobeItem[]): string {
  const terms = items
    .map(i => i.name?.split(' — from ')[0]?.trim().toLowerCase())
    .filter((t): t is string => !!t)
  const unique = [...new Set(terms)]
  if (unique.length === 1) {
    return unique[0].split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  }
  return 'Shoes'
}

// Camera-roll photos on a modern phone are routinely 3000-4000px+ and
// several MB — sent raw as base64 JSON, that's a multi-MB request that can
// silently fail (timeout/size limit) with no error ever surfacing to the
// upload flow's catch block. Downscaling client-side before it ever leaves
// the browser fixes that at the source, for every upload source alike.
async function resizeImageForUpload(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxDim && height <= maxDim) { resolve(dataUrl); return }
      const scale = maxDim / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(dataUrl); return }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function StyleClosetView() {
  const [wardrobe, setWardrobe] = useState<WardrobeItem[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadWardrobe = useCallback(() => {
    fetch('/api/atelier/wardrobe', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setWardrobe(data.items ?? []))
      .catch(() => setWardrobe([]))
  }, [])
  useEffect(() => { loadWardrobe() }, [loadWardrobe])

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    setUploadError(null)
    let succeeded = 0
    let itemsFound = 0
    const failed: string[] = []
    for (const file of files) {
      try {
        const dataUrl = await resizeImageForUpload(file)
        const res = await fetch('/api/atelier/wardrobe/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl, sourceLabel: 'style-page-upload' }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json() as { items?: unknown[]; error?: string }
        if (data.error && !data.items?.length) throw new Error(data.error)
        succeeded++
        itemsFound += data.items?.length ?? 0
      } catch (err) {
        failed.push(file.name)
        console.error('[StyleClosetView] upload failed for', file.name, err)
      }
    }
    if (failed.length) {
      setUploadError(
        succeeded > 0
          ? `Saved ${succeeded} photo${succeeded === 1 ? '' : 's'}, but ${failed.length} couldn't be uploaded (${failed.join(', ')}). Try those again.`
          : `Couldn't upload ${failed.length === 1 ? 'that photo' : 'those photos'} — try again, or a clearer/smaller shot.`
      )
    } else if (succeeded > 0 && itemsFound === 0) {
      setUploadError("Saved, but LUNA couldn't pick out individual pieces from that shot — try a clearer, well-lit full-body photo.")
    }
    if (succeeded > 0) loadWardrobe()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [loadWardrobe])

  const bucketData = useMemo(() => {
    return CLOSET_BUCKETS.map(bucket => {
      const items = (wardrobe ?? []).filter(item => bucket.match((item.category ?? '').toLowerCase()))
      const label = bucket.id === 'shoes' && items.length > 0 ? specificFootwearLabel(items) : bucket.label
      return { ...bucket, label, count: items.length, image: items[0]?.photo_url || bucket.fallbackImage }
    })
  }, [wardrobe])

  const closetEmpty = wardrobe !== null && wardrobe.length === 0

  return (
    <>
      <div className={styles.sectionHeader}><LayoutGrid size={13} /> AI Closet</div>
      {closetEmpty ? (
        <div className={styles.emptyState}>
          <p>Your closet is waiting. Upload an outfit and Luna will organize the pieces for you.</p>
          <button type="button" className={styles.emptyButton} onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Organizing…' : 'Upload First Outfit'} <Upload size={13} /></button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
          {uploadError && <p className={styles.uploadErrorText}>{uploadError}</p>}
        </div>
      ) : (
        <>
          {uploadError && <p className={styles.uploadErrorText}>{uploadError}</p>}
          <div className={styles.closetRow}>
            {bucketData.map(bucket => (
              <div key={bucket.id} className={styles.closetCard}>
                <div className={styles.closetPhoto}><Image src={bucket.image} alt={bucket.label} fill sizes="112px" unoptimized={bucket.image.startsWith('data:')} /></div>
                <span className={styles.closetLabel}>{bucket.label}</span>
                <span className={styles.closetCount}>{bucket.count} {bucket.count === 1 ? 'item' : 'items'}</span>
              </div>
            ))}
          </div>

          <div className={styles.sectionHeader}>
            All Items
            <button type="button" className={styles.uploadButton} style={{ minHeight: 32, padding: '6px 14px', fontSize: 10.5, marginLeft: 'auto' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Organizing…' : 'Add'} <Upload size={12} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleUpload} />
          </div>
          <div className={styles.closetFullGrid}>
            {(wardrobe ?? []).map(item => (
              <div key={item.id} className={styles.closetFullItem}>
                {item.photo_url && <Image src={item.photo_url} alt={item.name ?? item.category ?? 'Item'} fill sizes="90px" unoptimized={item.photo_url.startsWith('data:')} />}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
