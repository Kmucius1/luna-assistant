'use client'
import { useEffect, useState } from 'react'

export interface Thumbs {
  urls: string[]
  /** Source seconds covered by each thumbnail */
  interval: number
}

const EMPTY: Thumbs = { urls: [], interval: 1 }

interface Keyed extends Thumbs {
  key: string
}
const MAX_THUMBS = 80
const THUMB_HEIGHT = 72

function waitForSeek(video: HTMLVideoElement): Promise<void> {
  return new Promise(resolve => {
    const done = () => {
      video.removeEventListener('seeked', done)
      clearTimeout(timer)
      resolve()
    }
    // A stuck seek must never freeze the filmstrip: give up after 4s.
    const timer = setTimeout(done, 4000)
    video.addEventListener('seeked', done)
  })
}

/**
 * Builds a filmstrip of small frames from the source on a hidden video element,
 * filling in progressively so the timeline is usable immediately.
 */
export function useThumbnails(url: string | null, duration: number, aspect: number): Thumbs {
  const key = url && duration ? `${url}|${duration}|${aspect}` : ''
  const [thumbs, setThumbs] = useState<Keyed>({ key: '', ...EMPTY })

  useEffect(() => {
    if (!url || !duration) return
    let cancelled = false
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    const count = Math.min(MAX_THUMBS, Math.max(1, Math.ceil(duration / 0.5)))
    const interval = duration / count
    const canvas = document.createElement('canvas')
    canvas.height = THUMB_HEIGHT
    canvas.width = Math.max(16, Math.round(THUMB_HEIGHT * aspect))
    const ctx = canvas.getContext('2d')

    async function run() {
      if (!ctx) return
      await new Promise<void>(resolve => {
        video.onloadeddata = () => resolve()
        video.onerror = () => resolve()
      })
      const urls: string[] = []
      for (let i = 0; i < count; i++) {
        if (cancelled) return
        const t = Math.min(i * interval + interval / 2, Math.max(duration - 0.05, 0))
        video.currentTime = t
        await waitForSeek(video)
        if (cancelled) return
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          urls.push(canvas.toDataURL('image/jpeg', 0.6))
        } catch {
          urls.push('')
        }
        if (urls.length % 8 === 0 || i === count - 1) {
          setThumbs({ key, urls: [...urls], interval })
        }
      }
    }
    run()

    return () => {
      cancelled = true
      video.removeAttribute('src')
      video.load()
    }
  }, [url, duration, aspect, key])

  // Ignore frames that belong to a previously loaded video.
  return thumbs.key === key ? thumbs : EMPTY
}
