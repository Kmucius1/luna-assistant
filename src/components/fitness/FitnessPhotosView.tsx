'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Camera, Plus } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './FitnessViews.module.css'

interface ProgressPhoto {
  id: string
  date_key: string
  photo_url: string
  note: string | null
}

function formatLogDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(dateKey + 'T12:00:00'))
}

export function FitnessPhotosView() {
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)

  function loadPhotos() {
    fetch('/api/fitness/photos?limit=24').then(r => r.json()).then(d => setPhotos(d.photos ?? [])).catch(() => setPhotos([]))
  }
  useEffect(loadPhotos, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUploading(true)
    setPhotoError(false)
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/fitness/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      })
      if (!res.ok) { setPhotoError(true); setPhotoUploading(false); e.target.value = ''; return }
      loadPhotos()
    } catch { setPhotoError(true) }
    setPhotoUploading(false)
    e.target.value = ''
  }

  return (
    <>
      <div className={styles.sectionHeader}><Camera size={13} /> Progress Photos</div>
      <div className={styles.photoGrid}>
        <label className={styles.photoAddTile}>
          {photoUploading ? '…' : <Plus size={20} />}
          <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} disabled={photoUploading} />
        </label>
        {(photos ?? []).map(p => (
          <button key={p.id} type="button" className={styles.photoThumb} onClick={() => setSelectedPhoto(p)}>
            <Image src={p.photo_url} alt="" fill sizes="90px" unoptimized />
          </button>
        ))}
      </div>
      {photoError && <p className={styles.trackErrorMsg}>Couldn&apos;t save that — check your connection and try again.</p>}
      {photos && photos.length === 0 && <div className={styles.emptyCard}><p>Your progress photos will show up here.</p></div>}

      <BottomSheet isOpen={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title={selectedPhoto ? formatLogDate(selectedPhoto.date_key) : undefined}>
        {selectedPhoto && (
          <div className={styles.photoDetail}>
            <Image src={selectedPhoto.photo_url} alt="" width={600} height={800} unoptimized style={{ width: '100%', height: 'auto', borderRadius: 16 }} />
          </div>
        )}
      </BottomSheet>
    </>
  )
}
