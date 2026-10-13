'use client'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Pause, Play, Upload } from 'lucide-react'
import {
  ASPECTS,
  editorReducer,
  emptyState,
  formatTime,
  timelineToSource,
  sourceToTimeline,
  totalLength,
  type AspectKey,
} from '@/lib/prosperity/clip-editor'
import { Inspector } from './Inspector'
import { Timeline } from './Timeline'
import { Toolbar } from './Toolbar'
import { useThumbnails } from './useThumbnails'
import styles from './clip-studio.module.css'

interface Source {
  url: string
  name: string
  size: number
  duration: number
  width: number
  height: number
}

const MIN_PPS = 0.2
const MAX_PPS = 600
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv)$/i

function formatSize(bytes: number): string {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
  return `${Math.max(1, Math.round(bytes / 1e6))} MB`
}

export function ClipStudio() {
  const [source, setSource] = useState<Source | null>(null)
  const [state, dispatch] = useReducer(editorReducer, undefined, emptyState)
  const [playhead, setPlayheadState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [aspect, setAspect] = useState<AspectKey>('9:16')
  const [pxPerSec, setPxPerSec] = useState(40)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [stage, setStage] = useState({ w: 0, h: 0 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef(0)
  const activeIdxRef = useRef(0)
  const playingRef = useRef(false)

  const { clips, selectedId } = state.present
  const clipsRef = useRef(clips)
  const total = totalLength(clips)
  const selected = clips.find(c => c.id === selectedId) ?? null
  const selectedIndex = selected ? clips.indexOf(selected) : -1

  const sourceAspect = source ? source.width / Math.max(source.height, 1) : 16 / 9
  const thumbs = useThumbnails(source?.url ?? null, source?.duration ?? 0, sourceAspect)

  const setPlayhead = useCallback((t: number) => {
    playheadRef.current = t
    setPlayheadState(t)
  }, [])

  useEffect(() => {
    clipsRef.current = clips
  }, [clips])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  const applyClip = useCallback((index: number) => {
    const v = videoRef.current
    const c = clipsRef.current[index]
    if (!v || !c) return
    v.playbackRate = c.speed
    v.volume = c.volume
    v.muted = c.muted
  }, [])

  const seek = useCallback((t: number) => {
    const v = videoRef.current
    const list = clipsRef.current
    const point = timelineToSource(list, t)
    if (!v || !point) return
    activeIdxRef.current = point.index
    v.currentTime = point.sourceTime
    applyClip(point.index)
    setPlayhead(Math.min(Math.max(t, 0), totalLength(list)))
  }, [applyClip, setPlayhead])

  const pause = useCallback(() => {
    videoRef.current?.pause()
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    const v = videoRef.current
    if (!v || clipsRef.current.length === 0) return
    if (playheadRef.current >= totalLength(clipsRef.current) - 0.05) seek(0)
    else seek(playheadRef.current)
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [seek])

  // Playback engine: the single <video> plays straight through the cut list,
  // jumping to the next clip's start whenever the current clip's end is reached.
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const loop = () => {
      const v = videoRef.current
      const list = clipsRef.current
      const idx = activeIdxRef.current
      const c = list[idx]
      if (!v || !c) {
        pause()
        return
      }
      const t = v.currentTime
      if (t >= c.end - 0.03 || t < c.start - 0.5) {
        const next = idx + 1
        if (next >= list.length) {
          v.pause()
          setPlayhead(totalLength(list))
          setPlaying(false)
          return
        }
        activeIdxRef.current = next
        v.currentTime = list[next].start
        applyClip(next)
        if (v.paused) v.play().catch(() => setPlaying(false))
      } else {
        setPlayhead(sourceToTimeline(list, idx, t))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, applyClip, pause, setPlayhead])

  // After any edit: while playing just refresh clip settings; while paused,
  // re-sync the picture to the (clamped) playhead.
  useEffect(() => {
    if (!source) return
    if (playingRef.current) {
      applyClip(activeIdxRef.current)
      return
    }
    seek(Math.min(playheadRef.current, totalLength(clips)))
  }, [clips, source, seek, applyClip])

  // Measure the stage so the frame keeps its exact ratio at any window size.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setStage({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [source])

  const fit = useCallback(() => {
    const el = scrollRef.current
    const len = totalLength(clipsRef.current)
    if (!el || len <= 0) return
    const next = (el.clientWidth - 32) / len
    setPxPerSec(Math.min(Math.max(next, MIN_PPS), MAX_PPS))
    el.scrollLeft = 0
  }, [])

  const loadFile = useCallback(async (file: File) => {
    setError(null)
    if (!file.type.startsWith('video/') && !VIDEO_EXT.test(file.name)) {
      setError('That does not look like a video file. Try an MP4 or MOV.')
      return
    }
    setLoading(true)
    const url = URL.createObjectURL(file)
    try {
      const probe = document.createElement('video')
      probe.preload = 'metadata'
      probe.src = url
      await new Promise<void>((resolve, reject) => {
        probe.onloadedmetadata = () => resolve()
        probe.onerror = () => reject(new Error('unsupported'))
      })
      const duration = probe.duration
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('unsupported')

      if (source) URL.revokeObjectURL(source.url)
      pause()
      setSource({
        url,
        name: file.name,
        size: file.size,
        duration,
        width: probe.videoWidth,
        height: probe.videoHeight,
      })
      dispatch({ type: 'load', duration })
      setPlayhead(0)
      activeIdxRef.current = 0
    } catch {
      URL.revokeObjectURL(url)
      setError('This browser could not open that video. Try an MP4 (H.264) or a MOV from your phone.')
    } finally {
      setLoading(false)
    }
  }, [source, pause, setPlayhead])

  // Fit the whole video into the timeline once it has loaded.
  useEffect(() => {
    if (source) requestAnimationFrame(fit)
  }, [source, fit])

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url)
    }
    // Only on unmount; replacing a source revokes the previous URL in loadFile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Warn before leaving with unsaved edits (nothing is saved server-side yet).
  const edited = state.past.length > 0
  useEffect(() => {
    if (!edited) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [edited])

  const split = useCallback(() => {
    dispatch({ type: 'split', at: playheadRef.current })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!source) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
      } else if (e.key === ' ' && tag !== 'BUTTON') {
        e.preventDefault()
        if (playingRef.current) pause()
        else play()
      } else if (e.key.toLowerCase() === 's' && !mod) {
        split()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        dispatch({ type: 'delete', id: selectedId })
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const step = (e.shiftKey ? 1 : 0.1) * (e.key === 'ArrowLeft' ? -1 : 1)
        seek(Math.min(Math.max(playheadRef.current + step, 0), totalLength(clipsRef.current)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [source, selectedId, pause, play, split, seek])

  function zoomBy(factor: number) {
    setPxPerSec(p => Math.min(Math.max(p * factor, MIN_PPS), MAX_PPS))
  }

  // Preview framing for the clip under the playhead
  const point = timelineToSource(clips, playhead)
  const activeClip = point ? clips[point.index] : null
  const ratio = ASPECTS[aspect]
  const frameW = Math.max(0, Math.min(stage.w, stage.h * ratio))
  const frameH = ratio > 0 ? frameW / ratio : 0

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="video/*,.mov,.mp4,.m4v,.webm,.mkv"
      className={styles.hidden}
      onChange={e => {
        const f = e.target.files?.[0]
        if (f) loadFile(f)
        e.target.value = ''
      }}
    />
  )

  return (
    <div
      className={styles.studio}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={e => {
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) loadFile(f)
      }}
    >
      {fileInput}

      {!source ? (
        <div className={styles.empty}>
          <button
            type="button"
            className={dragOver ? styles.dropzoneActive : styles.dropzone}
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            <Upload size={34} strokeWidth={1.2} />
            <span className={styles.dropTitle}>{loading ? 'Opening your video…' : 'Drop a video here'}</span>
            <span className={styles.dropSub}>or tap to choose one from your files or camera roll</span>
          </button>
          <p className={styles.note}>
            Your video stays on this device while you edit. Nothing is uploaded or posted.
          </p>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <span className={styles.fileName} title={source.name}>{source.name}</span>
            <span className={styles.fileMeta}>
              {formatTime(source.duration).replace(/\.\d$/, '')} · {source.width}×{source.height} · {formatSize(source.size)}
            </span>
          </div>

          <div className={styles.stage} ref={stageRef}>
            <div
              className={styles.frame}
              style={{ width: frameW, height: frameH }}
              onClick={() => (playing ? pause() : play())}
            >
              <video
                ref={videoRef}
                src={source.url}
                playsInline
                preload="auto"
                className={styles.video}
                style={{
                  objectPosition: `${50 + (activeClip?.pan ?? 0) * 50}% 50%`,
                  transform: `scale(${activeClip?.zoom ?? 1})`,
                }}
              />
              {!playing && (
                <span className={styles.bigPlay} aria-hidden="true"><Play size={30} strokeWidth={1.4} /></span>
              )}
            </div>
          </div>

          <div className={styles.transport}>
            <button
              type="button"
              className={styles.playBtn}
              onClick={() => (playing ? pause() : play())}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={22} strokeWidth={1.5} /> : <Play size={22} strokeWidth={1.5} />}
            </button>
            <span className={styles.time}>
              {formatTime(playhead)} <em>/ {formatTime(total)}</em>
            </span>
            <span className={styles.count}>{clips.length} clip{clips.length === 1 ? '' : 's'}</span>
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <Toolbar
            hasSource
            hasSelection={!!selected}
            canUndo={state.past.length > 0}
            canRedo={state.future.length > 0}
            canMoveLeft={selectedIndex > 0}
            canMoveRight={selectedIndex >= 0 && selectedIndex < clips.length - 1}
            aspect={aspect}
            onAspect={setAspect}
            onUpload={() => fileRef.current?.click()}
            onUndo={() => dispatch({ type: 'undo' })}
            onRedo={() => dispatch({ type: 'redo' })}
            onSplit={split}
            onDelete={() => selected && dispatch({ type: 'delete', id: selected.id })}
            onDuplicate={() => selected && dispatch({ type: 'duplicate', id: selected.id })}
            onMove={direction => selected && dispatch({ type: 'move', id: selected.id, direction })}
            onZoomIn={() => zoomBy(1.5)}
            onZoomOut={() => zoomBy(1 / 1.5)}
            onFit={fit}
          />

          {selected && (
            <Inspector
              clip={selected}
              onChange={patch => dispatch({ type: 'update', id: selected.id, patch })}
            />
          )}

          <div className={styles.timelinePanel}>
            {clips.length === 0 ? (
              <p className={styles.timelineEmpty}>
                Every clip was deleted. Undo to bring one back, or upload another video.
              </p>
            ) : (
              <Timeline
                clips={clips}
                selectedId={selectedId}
                playhead={playhead}
                pxPerSec={pxPerSec}
                sourceDuration={source.duration}
                thumbs={thumbs}
                onSeek={seek}
                onSelect={id => dispatch({ type: 'select', id })}
                onTrim={(id, start, end) => dispatch({ type: 'trim', id, start, end })}
                scrollRef={scrollRef}
              />
            )}
          </div>
        </>
      )}

      {dragOver && source && <div className={styles.dropOverlay}>Drop to replace the video</div>}
    </div>
  )
}
