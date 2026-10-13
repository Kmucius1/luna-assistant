'use client'
import { Volume2, VolumeX } from 'lucide-react'
import type { Clip } from '@/lib/prosperity/clip-editor'
import styles from './clip-studio.module.css'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

interface Props {
  clip: Clip
  onChange: (patch: Partial<Pick<Clip, 'speed' | 'zoom' | 'pan' | 'volume' | 'muted'>>) => void
}

export function Inspector({ clip, onChange }: Props) {
  return (
    <div className={styles.inspector} aria-label="Selected clip settings">
      <label className={styles.field}>
        <span>Speed</span>
        <select value={clip.speed} onChange={e => onChange({ speed: Number(e.target.value) })}>
          {SPEEDS.map(s => <option key={s} value={s}>{s}x</option>)}
        </select>
      </label>

      <label className={styles.field}>
        <span>Punch-in {clip.zoom.toFixed(2)}x</span>
        <input
          type="range" min={1} max={3} step={0.05} value={clip.zoom}
          onChange={e => onChange({ zoom: Number(e.target.value) })}
        />
      </label>

      <label className={styles.field}>
        <span>Framing {clip.pan === 0 ? 'center' : clip.pan < 0 ? 'left' : 'right'}</span>
        <input
          type="range" min={-1} max={1} step={0.02} value={clip.pan}
          onChange={e => onChange({ pan: Number(e.target.value) })}
        />
      </label>

      <label className={styles.field}>
        <span>Volume {Math.round(clip.volume * 100)}%</span>
        <input
          type="range" min={0} max={1} step={0.05} value={clip.volume}
          onChange={e => onChange({ volume: Number(e.target.value) })}
        />
      </label>

      <button
        type="button"
        className={styles.tool}
        onClick={() => onChange({ muted: !clip.muted })}
        aria-pressed={clip.muted}
        aria-label={clip.muted ? 'Unmute clip' : 'Mute clip'}
      >
        {clip.muted ? <VolumeX size={20} strokeWidth={1.5} /> : <Volume2 size={20} strokeWidth={1.5} />}
        <span>{clip.muted ? 'Muted' : 'Sound'}</span>
      </button>
    </div>
  )
}
