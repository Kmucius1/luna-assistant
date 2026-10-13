'use client'
import {
  Upload, Undo2, Redo2, Scissors, Trash2, Copy, ZoomIn, ZoomOut, Maximize2,
  ChevronLeft, ChevronRight, Captions, Download,
} from 'lucide-react'
import { ASPECTS, type AspectKey } from '@/lib/prosperity/clip-editor'
import styles from './clip-studio.module.css'

interface Props {
  hasSource: boolean
  hasSelection: boolean
  canUndo: boolean
  canRedo: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  aspect: AspectKey
  onAspect: (a: AspectKey) => void
  onUpload: () => void
  onUndo: () => void
  onRedo: () => void
  onSplit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMove: (direction: -1 | 1) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

function Btn({
  label, onClick, disabled, children, soon,
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  soon?: boolean
}) {
  return (
    <button
      type="button"
      className={styles.tool}
      onClick={onClick}
      disabled={disabled}
      title={soon ? `${label} — coming next` : label}
      aria-label={label}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

export function Toolbar(p: Props) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Editing tools">
      <Btn label="Upload" onClick={p.onUpload}><Upload size={20} strokeWidth={1.5} /></Btn>
      <span className={styles.sep} />
      <Btn label="Undo" onClick={p.onUndo} disabled={!p.canUndo}><Undo2 size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Redo" onClick={p.onRedo} disabled={!p.canRedo}><Redo2 size={20} strokeWidth={1.5} /></Btn>
      <span className={styles.sep} />
      <Btn label="Split" onClick={p.onSplit} disabled={!p.hasSource}><Scissors size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Duplicate" onClick={p.onDuplicate} disabled={!p.hasSelection}><Copy size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Delete" onClick={p.onDelete} disabled={!p.hasSelection}><Trash2 size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Move left" onClick={() => p.onMove(-1)} disabled={!p.canMoveLeft}><ChevronLeft size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Move right" onClick={() => p.onMove(1)} disabled={!p.canMoveRight}><ChevronRight size={20} strokeWidth={1.5} /></Btn>
      <span className={styles.sep} />
      <label className={styles.aspect}>
        <span>Frame</span>
        <select
          value={p.aspect}
          onChange={e => p.onAspect(e.target.value as AspectKey)}
          disabled={!p.hasSource}
          aria-label="Frame shape"
        >
          {(Object.keys(ASPECTS) as AspectKey[]).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </label>
      <Btn label="Zoom out" onClick={p.onZoomOut} disabled={!p.hasSource}><ZoomOut size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Zoom in" onClick={p.onZoomIn} disabled={!p.hasSource}><ZoomIn size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Fit" onClick={p.onFit} disabled={!p.hasSource}><Maximize2 size={20} strokeWidth={1.5} /></Btn>
      <span className={styles.sep} />
      <Btn label="Captions" disabled soon><Captions size={20} strokeWidth={1.5} /></Btn>
      <Btn label="Export" disabled soon><Download size={20} strokeWidth={1.5} /></Btn>
    </div>
  )
}
