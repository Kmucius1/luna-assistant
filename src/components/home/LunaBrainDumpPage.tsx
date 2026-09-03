'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft, MoreHorizontal, Sparkles, Mic, PenLine, Check, Pause, Play, X,
  Brain, ListChecks, Lightbulb, Heart, Briefcase, MoreHorizontal as OtherIcon, ChevronRight,
} from 'lucide-react'

import styles from './LunaBrainDumpPage.module.css'

const DRAFT_KEY = 'luna_brain_dump_draft_v1'

const CATEGORIES = [
  { id: 'thoughts', label: 'Thoughts', icon: Brain },
  { id: 'todos', label: 'To-Dos', icon: ListChecks },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'feelings', label: 'Feelings', icon: Heart },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'other', label: 'Other', icon: OtherIcon },
] as const

interface Entry {
  id: string; raw_content: string; entry_type: string; title: string | null
  category: string | null; ai_suggested_title: string | null; created_at: string
}

interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; resultIndex: number }
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
}
// SmartInput.tsx already declares `Window.SpeechRecognition` globally —
// redeclaring it here would conflict, so this reads it back via a local cast instead.
type SpeechRecognitionWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return `Today, ${time}`
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
}

export function LunaBrainDumpPage() {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [nextCategory, setNextCategory] = useState<string | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [loadingEntries, setLoadingEntries] = useState(true)

  const [recording, setRecording] = useState(false)
  const [paused, setPaused] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore any draft left from a previous visit (e.g. accidental navigation).
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY)
      if (draft) setText(draft)
    } catch {}
    loadEntries()
  }, [])

  // Autosave draft as the user types — nothing is lost to a crash or nav-away.
  useEffect(() => {
    try {
      if (text.trim()) localStorage.setItem(DRAFT_KEY, text)
      else localStorage.removeItem(DRAFT_KEY)
    } catch {}
  }, [text])

  function loadEntries() {
    setLoadingEntries(true)
    fetch('/api/brain-dump/entries?limit=5').then(r => r.json()).then(d => setEntries(d.entries ?? [])).finally(() => setLoadingEntries(false))
  }

  async function saveEntry(rawContent: string, opts: { entryType?: string; audioStoragePath?: string; audioDuration?: number; transcript?: string } = {}) {
    if (!rawContent.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/brain-dump/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_content: rawContent.trim(),
          entry_type: opts.entryType ?? 'text',
          category: nextCategory,
          audio_storage_path: opts.audioStoragePath,
          audio_duration_seconds: opts.audioDuration,
          transcript: opts.transcript,
        }),
      })
      const data = await res.json()
      if (data.entry) {
        setText('')
        try { localStorage.removeItem(DRAFT_KEY) } catch {}
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2200)
        loadEntries()
        // Background classification — never blocks the save, never overwrites raw_content.
        fetch('/api/brain-dump/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: data.entry.id }),
        }).catch(() => {})
      }
    } catch {
      // Draft is still in localStorage/text state — nothing lost, user can just retry.
    } finally {
      setSaving(false)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start()
      mediaRecorderRef.current = recorder

      const win = window as SpeechRecognitionWindow
      const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'
        recognition.onresult = (e: SpeechRecognitionEvent) => {
          let final = ''
          for (let i = 0; i < e.results.length; i++) final += e.results[i][0].transcript
          setTranscript(final)
        }
        recognition.start()
        recognitionRef.current = recognition
      }

      setRecording(true); setPaused(false); setRecordSeconds(0); setTranscript('')
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch {
      alert('Microphone access is needed to record. Check your browser permissions.')
    }
  }

  function togglePause() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (paused) { recorder.resume(); timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000) }
    else { recorder.pause(); if (timerRef.current) clearInterval(timerRef.current) }
    setPaused(p => !p)
  }

  function cleanupRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    mediaRecorderRef.current = null
    recognitionRef.current = null
    streamRef.current = null
    setRecording(false); setPaused(false); setRecordSeconds(0)
  }

  function cancelRecording() {
    cleanupRecording()
    setTranscript('')
  }

  async function finishRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    const finalTranscript = transcript
    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      recorder.stop()
    })
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const duration = recordSeconds
    cleanupRecording()

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      const uploadRes = await fetch('/api/brain-dump/audio-upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      // Even if the upload path is missing, still save with whatever transcript we captured —
      // never discard the words just because the audio upload had trouble.
      await saveEntry(finalTranscript || '(voice note)', {
        entryType: 'voice',
        audioStoragePath: uploadData.storage_path,
        audioDuration: duration,
        transcript: finalTranscript || undefined,
      })
    } finally {
      setTranscript('')
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/home" className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
        <h1>Brain Dump <Sparkles size={13} /></h1>
        <button type="button" className={styles.iconButton} aria-label="More"><MoreHorizontal size={17} /></button>
      </div>

      <div className={styles.heroWrap}>
        <div className={styles.heroPhoto}><Image src="/images/rooms/brain-dump-hero.jpg" alt="" fill sizes="(max-width: 640px) 100vw, 640px" priority /></div>
        <div className={styles.heroFade} />
        <div className={styles.heroContent}>
          <h2>Hey Zoe,</h2>
          <p>Get it out. Clear your mind.<br />Luna will help you sort it out.</p>
        </div>
      </div>

      <div className={styles.captureCard}>
        <div className={styles.captureHeader}>
          <div>
            <div className={styles.captureLabel}>Dump It Here</div>
            <p className={styles.captureSub}>Write anything that&apos;s on your mind.<br />No structure. No pressure.</p>
          </div>
          <div className={styles.captureActions}>
            <button type="button" onClick={recording ? undefined : startRecording} className={`${styles.micButton} ${recording ? styles.recording : ''}`} aria-label="Record voice"><Mic size={16} /></button>
            <button type="button" className={styles.otherButton} aria-label="Attach"><PenLine size={15} /></button>
          </div>
        </div>

        {recording ? (
          <div className={styles.recordingBar}>
            <span className={styles.recordingDot} />
            <span>{Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')} {paused ? '(paused)' : 'recording…'}</span>
            <div className={styles.recordingActions}>
              <button type="button" onClick={togglePause}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>
              <button type="button" onClick={cancelRecording}><X size={14} /></button>
              <button type="button" onClick={finishRecording} style={{ color: '#5A8A6A' }}><Check size={14} /> Save</button>
            </div>
          </div>
        ) : (
          <>
            <textarea
              className={styles.captureField}
              placeholder="Start typing, talking, or jotting something down…"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
            />
            <div className={styles.saveRow}>
              {justSaved ? <span className={styles.savedNote}><Check size={13} /> Saved to Brain Dump.</span> : <span />}
              <button type="button" onClick={() => saveEntry(text)} disabled={!text.trim() || saving} className={styles.saveButton}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>

      <div>
        <div className={styles.sectionHeader}>Quick Categories <span /></div>
        <div className={styles.categoryRow} style={{ marginTop: 8 }}>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const active = nextCategory === cat.id
            return (
              <button key={cat.id} type="button" onClick={() => setNextCategory(active ? null : cat.id)} className={`${styles.categoryChip} ${active ? styles.categoryChipActive : ''}`}>
                <Icon size={18} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className={styles.sectionHeader}>Recent Brain Dumps <Link href="/brain-dump/all">View all</Link></div>
        <div style={{ marginTop: 8 }}>
          {loadingEntries ? (
            <p className={styles.emptyState}><span /></p>
          ) : entries.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Your mind has room to breathe. Anything you capture will be saved here until you&apos;re ready to sort it.</p>
            </div>
          ) : entries.map(entry => (
            <Link key={entry.id} href={`/brain-dump/${entry.id}`} className={styles.entryRow}>
              <div className={styles.entryIcon}>
                {entry.entry_type === 'voice' ? <Mic size={16} /> : entry.category ? (CATEGORIES.find(c => c.id === entry.category)?.icon ? (() => { const I = CATEGORIES.find(c => c.id === entry.category)!.icon; return <I size={16} /> })() : <Brain size={16} />) : <Brain size={16} />}
              </div>
              <div className={styles.entryInfo}>
                <strong>{entry.title ?? entry.ai_suggested_title ?? entry.raw_content.slice(0, 60)}</strong>
                <div className={styles.entryMeta}>
                  <span>{timeAgo(entry.created_at)}</span>
                  {entry.category && <span className={styles.entryBadge}>{CATEGORIES.find(c => c.id === entry.category)?.label ?? entry.category}</span>}
                </div>
              </div>
              <ChevronRight size={16} className={styles.entryArrow} />
            </Link>
          ))}
        </div>
      </div>

      <Link href="/luna?tab=chat&prompt=Help me organize today's Brain Dumps" className={styles.askCard} style={{ textDecoration: 'none' }}>
        <div className={styles.askIcon}><Sparkles size={16} /></div>
        <div style={{ flex: 1 }}>
          <strong>Want Luna to help?</strong>
          <p>I can organize your thoughts, turn them into tasks, or help you plan your next steps.</p>
        </div>
        <span className={styles.askButton}>Ask Luna <Sparkles size={12} /></span>
      </Link>
    </div>
  )
}
