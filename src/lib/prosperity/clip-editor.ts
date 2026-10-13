// Pure editing model for Luna Clip Studio. No React, no DOM — so it can be
// tested in isolation and reused by the exporter later.
//
// Model: one source video, and a timeline made of clips laid end to end.
// Each clip is a [start, end] range of the SOURCE, with its own speed,
// punch-in zoom, horizontal pan and volume. Timeline time is the sum of
// each clip's (end - start) / speed.

export const MIN_CLIP_SECONDS = 0.2
export const HISTORY_LIMIT = 100

export type AspectKey = '9:16' | '4:5' | '1:1' | '16:9'

export const ASPECTS: Record<AspectKey, number> = {
  '9:16': 9 / 16,
  '4:5': 4 / 5,
  '1:1': 1,
  '16:9': 16 / 9,
}

export interface Clip {
  id: string
  /** Source seconds */
  start: number
  end: number
  speed: number
  /** Punch-in, 1 = none */
  zoom: number
  /** Horizontal framing, -1 (left) .. 1 (right) */
  pan: number
  volume: number
  muted: boolean
}

export interface EditorDoc {
  clips: Clip[]
  selectedId: string | null
}

export interface EditorState {
  past: EditorDoc[]
  present: EditorDoc
  future: EditorDoc[]
  sourceDuration: number
  /** Key of the last coalescable edit (e.g. a slider drag), so a continuous
      drag collapses into a single undo step instead of one per pixel. */
  lastEdit?: string
}

export type EditorAction =
  | { type: 'load'; duration: number }
  | { type: 'select'; id: string | null }
  | { type: 'split'; at: number }
  | { type: 'delete'; id: string }
  | { type: 'duplicate'; id: string }
  | { type: 'trim'; id: string; start: number; end: number }
  | { type: 'update'; id: string; patch: Partial<Pick<Clip, 'speed' | 'zoom' | 'pan' | 'volume' | 'muted'>> }
  | { type: 'move'; id: string; direction: -1 | 1 }
  | { type: 'undo' }
  | { type: 'redo' }

let idCounter = 0
export function newClipId(): string {
  idCounter += 1
  return `c${Date.now().toString(36)}${idCounter}`
}

export function makeClip(start: number, end: number, base?: Partial<Clip>): Clip {
  return {
    id: newClipId(),
    start,
    end,
    speed: 1,
    zoom: 1,
    pan: 0,
    volume: 1,
    muted: false,
    ...base,
  }
}

export function emptyState(): EditorState {
  return { past: [], present: { clips: [], selectedId: null }, future: [], sourceDuration: 0 }
}

export function clipLength(c: Clip): number {
  return (c.end - c.start) / c.speed
}

export function totalLength(clips: Clip[]): number {
  return clips.reduce((sum, c) => sum + clipLength(c), 0)
}

/** Timeline start offset of each clip. */
export function clipOffsets(clips: Clip[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const c of clips) {
    out.push(acc)
    acc += clipLength(c)
  }
  return out
}

export interface TimelinePoint {
  index: number
  /** Source seconds */
  sourceTime: number
}

/** Map a timeline time to the clip under it and the matching source time. */
export function timelineToSource(clips: Clip[], t: number): TimelinePoint | null {
  if (clips.length === 0) return null
  const offsets = clipOffsets(clips)
  const total = totalLength(clips)
  const clamped = Math.min(Math.max(t, 0), total)
  for (let i = clips.length - 1; i >= 0; i--) {
    if (clamped >= offsets[i]) {
      const c = clips[i]
      const local = Math.min((clamped - offsets[i]) * c.speed, c.end - c.start)
      return { index: i, sourceTime: c.start + local }
    }
  }
  return { index: 0, sourceTime: clips[0].start }
}

/** Timeline time for a source time inside clip `index`. */
export function sourceToTimeline(clips: Clip[], index: number, sourceTime: number): number {
  const c = clips[index]
  if (!c) return 0
  const offsets = clipOffsets(clips)
  const local = Math.min(Math.max(sourceTime - c.start, 0), c.end - c.start)
  return offsets[index] + local / c.speed
}

function clampNumber(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi)
}

function commit(state: EditorState, next: EditorDoc, coalesceKey?: string): EditorState {
  if (coalesceKey && state.lastEdit === coalesceKey && state.past.length > 0) {
    return { ...state, present: next, future: [] }
  }
  const past = [...state.past, state.present].slice(-HISTORY_LIMIT)
  return { ...state, past, present: next, future: [], lastEdit: coalesceKey }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { clips, selectedId } = state.present

  switch (action.type) {
    case 'load': {
      const first = makeClip(0, action.duration)
      return {
        past: [],
        future: [],
        sourceDuration: action.duration,
        present: { clips: [first], selectedId: first.id },
      }
    }

    case 'select': {
      if (action.id === selectedId) return state
      // Selection is not an edit: it must not create an undo step.
      return { ...state, present: { ...state.present, selectedId: action.id } }
    }

    case 'split': {
      const point = timelineToSource(clips, action.at)
      if (!point) return state
      const c = clips[point.index]
      const at = point.sourceTime
      if (at - c.start < MIN_CLIP_SECONDS || c.end - at < MIN_CLIP_SECONDS) return state
      const left = { ...c, end: at }
      const right = makeClip(at, c.end, {
        speed: c.speed,
        zoom: c.zoom,
        pan: c.pan,
        volume: c.volume,
        muted: c.muted,
      })
      const next = [...clips.slice(0, point.index), left, right, ...clips.slice(point.index + 1)]
      return commit(state, { clips: next, selectedId: right.id })
    }

    case 'delete': {
      const idx = clips.findIndex(c => c.id === action.id)
      if (idx === -1) return state
      const next = clips.filter(c => c.id !== action.id)
      const fallback = next[Math.min(idx, next.length - 1)]?.id ?? null
      return commit(state, {
        clips: next,
        selectedId: selectedId === action.id ? fallback : selectedId,
      })
    }

    case 'duplicate': {
      const idx = clips.findIndex(c => c.id === action.id)
      if (idx === -1) return state
      const copy = makeClip(clips[idx].start, clips[idx].end, {
        speed: clips[idx].speed,
        zoom: clips[idx].zoom,
        pan: clips[idx].pan,
        volume: clips[idx].volume,
        muted: clips[idx].muted,
      })
      const next = [...clips.slice(0, idx + 1), copy, ...clips.slice(idx + 1)]
      return commit(state, { clips: next, selectedId: copy.id })
    }

    case 'trim': {
      const idx = clips.findIndex(c => c.id === action.id)
      if (idx === -1) return state
      const start = clampNumber(action.start, 0, state.sourceDuration)
      const end = clampNumber(action.end, 0, state.sourceDuration)
      if (end - start < MIN_CLIP_SECONDS) return state
      if (start === clips[idx].start && end === clips[idx].end) return state
      const next = clips.map((c, i) => (i === idx ? { ...c, start, end } : c))
      return commit(state, { clips: next, selectedId })
    }

    case 'update': {
      const idx = clips.findIndex(c => c.id === action.id)
      if (idx === -1) return state
      const p = action.patch
      const patch: Partial<Clip> = {}
      if (p.speed !== undefined) patch.speed = clampNumber(p.speed, 0.25, 4)
      if (p.zoom !== undefined) patch.zoom = clampNumber(p.zoom, 1, 3)
      if (p.pan !== undefined) patch.pan = clampNumber(p.pan, -1, 1)
      if (p.volume !== undefined) patch.volume = clampNumber(p.volume, 0, 1)
      if (p.muted !== undefined) patch.muted = p.muted
      const next = clips.map((c, i) => (i === idx ? { ...c, ...patch } : c))
      const key = `update:${action.id}:${Object.keys(patch).sort().join(',')}`
      return commit(state, { clips: next, selectedId }, key)
    }

    case 'move': {
      const idx = clips.findIndex(c => c.id === action.id)
      const to = idx + action.direction
      if (idx === -1 || to < 0 || to >= clips.length) return state
      const next = [...clips]
      ;[next[idx], next[to]] = [next[to], next[idx]]
      return commit(state, { clips: next, selectedId })
    }

    case 'undo': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        ...state,
        past: state.past.slice(0, -1),
        lastEdit: undefined,
        present: previous,
        future: [state.present, ...state.future],
      }
    }

    case 'redo': {
      if (state.future.length === 0) return state
      const [next, ...rest] = state.future
      return { ...state, past: [...state.past, state.present], present: next, future: rest, lastEdit: undefined }
    }
  }
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const tenths = Math.floor((s * 10) % 10)
  return `${m}:${String(sec).padStart(2, '0')}.${tenths}`
}
