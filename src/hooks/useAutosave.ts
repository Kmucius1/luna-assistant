'use client'
import { useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
  key: string            // localStorage key
  value: string          // current value to watch
  debounceMs?: number    // default 800ms
  onRestore?: (v: string) => void  // called on mount if draft exists
}

export function useAutosave({ key, value, debounceMs = 800, onRestore }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')
  const restored  = useRef(false)

  // Restore draft on mount
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    try {
      const draft = localStorage.getItem(`luna_draft_${key}`)
      if (draft && draft !== '' && onRestore) {
        onRestore(draft)
        setStatus('saved')
      }
    } catch {}
  }, [key, onRestore])

  // Autosave on value change
  useEffect(() => {
    if (!value || value === lastSaved.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`luna_draft_${key}`, value)
        lastSaved.current = value
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, debounceMs)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [key, value, debounceMs])

  function clearDraft() {
    try {
      localStorage.removeItem(`luna_draft_${key}`)
      lastSaved.current = ''
      setStatus('idle')
    } catch {}
  }

  return { status, clearDraft }
}

export function clearAutosaveDraft(key: string) {
  try {
    localStorage.removeItem(`luna_draft_${key}`)
  } catch {}
}
