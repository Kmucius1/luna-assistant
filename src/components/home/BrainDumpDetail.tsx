'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Pin, Archive, Trash2, ListChecks, Clock, StickyNote, Check } from 'lucide-react'
import styles from './BrainDumpDetail.module.css'

interface Entry {
  id: string; raw_content: string; entry_type: string; title: string | null; category: string | null
  is_pinned: boolean; is_archived: boolean; created_at: string
  ai_summary: string | null; ai_suggested_title: string | null; ai_suggested_category: string | null
  ai_confidence: 'low' | 'medium' | 'high' | null; analysis_status: string
  transcript: string | null; audio_duration_seconds: number | null; linked_type: string | null
}

export function BrainDumpDetail({ id }: { id: string }) {
  const router = useRouter()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionNote, setActionNote] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch(`/api/brain-dump/entries/${id}`).then(r => r.json()).then(d => { setEntry(d.entry ?? null); setAudioUrl(d.audio_url ?? null) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [id])

  async function patch(updates: Record<string, unknown>) {
    await fetch(`/api/brain-dump/entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
    load()
  }

  async function turnIntoTask() {
    if (!entry) return
    const res = await fetch('/api/tasks/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: entry.ai_suggested_title ?? entry.raw_content.slice(0, 80), source: 'brain_dump', source_id: entry.id }),
    })
    const data = await res.json()
    await patch({ status: 'converted', linked_type: 'task', linked_id: data.task?.id ?? null })
    setActionNote('Turned into a task — still here as the original.')
  }

  async function addToLater() {
    if (!entry) return
    await fetch('/api/brain-dump/later', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: entry.raw_content, source: 'brain_dump', source_entry_id: entry.id }),
    })
    load()
    setActionNote('Added to Later — still here as the original.')
  }

  async function deleteEntry() {
    await fetch(`/api/brain-dump/entries/${id}`, { method: 'DELETE' })
    router.push('/brain-dump')
  }

  if (loading) return <div className={styles.page}><p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 30 }}>Loading…</p></div>
  if (!entry) return <div className={styles.page}><p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 30 }}>Couldn&apos;t find that entry.</p></div>

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/brain-dump" className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => patch({ is_pinned: !entry.is_pinned })} className={styles.iconButton} style={entry.is_pinned ? { background: 'var(--gold-soft)', borderColor: 'var(--gold)' } : {}}><Pin size={16} /></button>
          <button type="button" onClick={() => patch({ is_archived: !entry.is_archived })} className={styles.iconButton}><Archive size={16} /></button>
          <button type="button" onClick={() => setConfirmDelete(true)} className={styles.iconButton}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.meta}>{new Date(entry.created_at).toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
        <p className={styles.rawContent}>{entry.raw_content}</p>
        {audioUrl && <audio controls src={audioUrl} className={styles.audioPlayer} />}
        {entry.transcript && entry.entry_type === 'voice' && entry.transcript !== entry.raw_content && (
          <p style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 8, fontStyle: 'italic' }}>Transcript: {entry.transcript}</p>
        )}
      </div>

      {entry.analysis_status === 'done' && (entry.ai_suggested_title || entry.ai_summary) && (
        <div className={styles.suggestionCard}>
          <div className={styles.sectionLabel}>Luna&apos;s Read {entry.ai_confidence === 'low' && <span className={styles.uncertain}>· Uncertain</span>}</div>
          {entry.ai_suggested_title && <p><strong>{entry.ai_suggested_title}</strong></p>}
          {entry.ai_summary && <p>{entry.ai_summary}</p>}
          {entry.ai_suggested_category && <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>Suggested category: {entry.ai_suggested_category}</p>}
        </div>
      )}
      {entry.analysis_status === 'processing' && <p style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center' }}>Luna is looking this over…</p>}

      {actionNote && <p style={{ fontSize: 11.5, color: 'var(--gold)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Check size={12} /> {actionNote}</p>}

      {entry.linked_type ? (
        <p style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center' }}>This entry became a {entry.linked_type.replace('_', ' ')} — the original stays here too.</p>
      ) : (
        <div className={styles.iconRow}>
          <button type="button" onClick={turnIntoTask} className={styles.iconRowButton}><ListChecks size={16} /> Task</button>
          <button type="button" onClick={addToLater} className={styles.iconRowButton}><Clock size={16} /> Later</button>
          <button type="button" className={styles.iconRowButton}><StickyNote size={16} /> Keep Only</button>
        </div>
      )}

      {confirmDelete && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmDelete(false)}>
          <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
            <p>Delete this Brain Dump entry? This can&apos;t be undone.</p>
            <div className={styles.confirmActions}>
              <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: '#F0EDE6', color: 'var(--ink-2)' }}>Cancel</button>
              <button type="button" onClick={deleteEntry} style={{ background: '#C96B5A', color: '#fff' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
