'use client'
import { useEffect, useRef, useState } from 'react'
import { MIN_CLIP_SECONDS, clipLength, clipOffsets, formatTime, totalLength, type Clip } from '@/lib/prosperity/clip-editor'
import type { Thumbs } from './useThumbnails'
import styles from './clip-studio.module.css'

const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800]
const GUTTER = 16

interface Props {
  clips: Clip[]
  selectedId: string | null
  playhead: number
  pxPerSec: number
  sourceDuration: number
  thumbs: Thumbs
  onSeek: (t: number) => void
  onSelect: (id: string) => void
  onTrim: (id: string, start: number, end: number) => void
  scrollRef: React.RefObject<HTMLDivElement | null>
}

interface TrimDrag {
  id: string
  edge: 'start' | 'end'
  startX: number
  start0: number
  end0: number
  start: number
  end: number
}

export function Timeline({
  clips, selectedId, playhead, pxPerSec, sourceDuration, thumbs,
  onSeek, onSelect, onTrim, scrollRef,
}: Props) {
  const [drag, setDrag] = useState<TrimDrag | null>(null)
  const dragRef = useRef<TrimDrag | null>(null)
  const scrubbing = useRef(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // While trimming, show the in-progress range; commit a single edit on release.
  const shown = clips.map(c => (drag && drag.id === c.id ? { ...c, start: drag.start, end: drag.end } : c))
  const offsets = clipOffsets(shown)
  const total = totalLength(shown)
  const width = total * pxPerSec

  function timeFromEvent(clientX: number) {
    const el = contentRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.min(Math.max((clientX - rect.left - GUTTER) / pxPerSec, 0), total)
  }

  function onRulerDown(e: React.PointerEvent) {
    scrubbing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeek(timeFromEvent(e.clientX))
  }
  function onRulerMove(e: React.PointerEvent) {
    if (scrubbing.current) onSeek(timeFromEvent(e.clientX))
  }
  function onRulerUp(e: React.PointerEvent) {
    scrubbing.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function startTrim(e: React.PointerEvent, clip: Clip, edge: 'start' | 'end') {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const d: TrimDrag = {
      id: clip.id, edge, startX: e.clientX,
      start0: clip.start, end0: clip.end, start: clip.start, end: clip.end,
    }
    dragRef.current = d
    setDrag(d)
  }

  function moveTrim(e: React.PointerEvent, clip: Clip) {
    const d = dragRef.current
    if (!d || d.id !== clip.id) return
    // px -> timeline seconds -> source seconds (a faster clip covers more source per second)
    const deltaSource = ((e.clientX - d.startX) / pxPerSec) * clip.speed
    let { start, end } = d
    if (d.edge === 'start') {
      start = Math.min(Math.max(d.start0 + deltaSource, 0), d.end0 - MIN_CLIP_SECONDS)
    } else {
      end = Math.max(Math.min(d.end0 + deltaSource, sourceDuration), d.start0 + MIN_CLIP_SECONDS)
    }
    const next = { ...d, start, end }
    dragRef.current = next
    setDrag(next)
  }

  function endTrim(e: React.PointerEvent, clip: Clip) {
    const d = dragRef.current
    if (!d || d.id !== clip.id) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    setDrag(null)
    onTrim(clip.id, d.start, d.end)
  }

  // Keep the playhead in view while playing / scrubbing.
  useEffect(() => {
    const sc = scrollRef.current
    if (!sc) return
    const x = GUTTER + playhead * pxPerSec
    if (x < sc.scrollLeft + 24 || x > sc.scrollLeft + sc.clientWidth - 24) {
      sc.scrollLeft = Math.max(0, x - sc.clientWidth / 2)
    }
  }, [playhead, pxPerSec, scrollRef])

  const step = TICK_STEPS.find(s => s * pxPerSec >= 72) ?? TICK_STEPS[TICK_STEPS.length - 1]
  const ticks: number[] = []
  for (let t = 0; t <= total + 1e-6; t += step) ticks.push(t)

  return (
    <div className={styles.timelineScroll} ref={scrollRef}>
      <div
        className={styles.timelineContent}
        ref={contentRef}
        style={{ width: width + GUTTER * 2 }}
      >
        <div
          className={styles.ruler}
          onPointerDown={onRulerDown}
          onPointerMove={onRulerMove}
          onPointerUp={onRulerUp}
          role="slider"
          aria-label="Timeline position"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(playhead)}
        >
          {ticks.map(t => (
            <span key={t} className={styles.tick} style={{ left: GUTTER + t * pxPerSec }}>
              {formatTime(t).replace(/\.0$/, '')}
            </span>
          ))}
        </div>

        <div className={styles.track}>
          {shown.map((clip, i) => {
            const selected = clip.id === selectedId
            const w = clipLength(clip) * pxPerSec
            return (
              <div
                key={clip.id}
                className={selected ? styles.clipSelected : styles.clip}
                style={{ left: GUTTER + offsets[i] * pxPerSec, width: Math.max(w, 2) }}
                onPointerDown={e => {
                  onSelect(clip.id)
                  // Tapping a clip also moves the playhead to where you tapped.
                  const rect = e.currentTarget.getBoundingClientRect()
                  onSeek(offsets[i] + Math.min(Math.max((e.clientX - rect.left) / pxPerSec, 0), clipLength(clip)))
                }}
                aria-label={`Clip ${i + 1}, ${formatTime(clipLength(clip))}`}
                aria-pressed={selected}
              >
                <div className={styles.filmstrip} aria-hidden="true">
                  {thumbs.urls.map((u, ti) => {
                    const t0 = ti * thumbs.interval
                    const t1 = t0 + thumbs.interval
                    if (!u || t1 <= clip.start || t0 >= clip.end) return null
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={ti}
                        src={u}
                        alt=""
                        draggable={false}
                        style={{
                          left: ((t0 - clip.start) / clip.speed) * pxPerSec,
                          width: (thumbs.interval / clip.speed) * pxPerSec + 1,
                        }}
                      />
                    )
                  })}
                </div>
                <span className={styles.clipLabel}>
                  {i + 1}{clip.speed !== 1 ? ` · ${clip.speed}x` : ''}
                </span>
                {selected && (
                  <>
                    <span
                      className={styles.handleStart}
                      onPointerDown={e => startTrim(e, clip, 'start')}
                      onPointerMove={e => moveTrim(e, clip)}
                      onPointerUp={e => endTrim(e, clip)}
                      onPointerCancel={e => endTrim(e, clip)}
                      role="slider"
                      aria-label="Trim clip start"
                      aria-valuenow={Math.round(clip.start)}
                    />
                    <span
                      className={styles.handleEnd}
                      onPointerDown={e => startTrim(e, clip, 'end')}
                      onPointerMove={e => moveTrim(e, clip)}
                      onPointerUp={e => endTrim(e, clip)}
                      onPointerCancel={e => endTrim(e, clip)}
                      role="slider"
                      aria-label="Trim clip end"
                      aria-valuenow={Math.round(clip.end)}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div className={styles.playhead} style={{ left: GUTTER + playhead * pxPerSec }} />
      </div>
    </div>
  )
}
