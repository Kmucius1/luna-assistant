'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import styles from './WorkViews.module.css'

interface BrainDumpEntry { id: string; raw_content: string; title: string | null; ai_suggested_title: string | null; created_at: string }

export function NotesView() {
  const [notes, setNotes] = useState<BrainDumpEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function loadNotes() {
    fetch('/api/brain-dump/entries?category=work&limit=20', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setNotes(data?.entries ?? []))
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }
  useEffect(loadNotes, [])

  async function addNote() {
    if (!draft.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/brain-dump/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_content: draft.trim(), category: 'work' }),
      })
      if (res.ok) { setDraft(''); loadNotes() }
    } catch { /* keep the draft so she can retry */ }
    setSaving(false)
  }

  return (
    <>
      <div className={styles.sectionHeader}>Work Notes</div>

      <div className={styles.noteAddCard}>
        <textarea
          className={styles.noteAddInput}
          placeholder="Capture a work note — a meeting takeaway, an idea, a client detail…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={2}
        />
        <button type="button" className={styles.noteAddButton} onClick={addNote} disabled={saving || !draft.trim()}>
          <Plus size={14} /> {saving ? 'Saving…' : 'Add Note'}
        </button>
      </div>

      {loading ? (
        <div className={styles.card}><div className={styles.emptyNote}>Loading&hellip;</div></div>
      ) : notes.length === 0 ? (
        <div className={styles.card}><div className={styles.emptyNote}>No work notes yet — capture one above.</div></div>
      ) : (
        notes.map(note => (
          <div key={note.id} className={`${styles.card} ${styles.noteCard}`}>
            {(note.title ?? note.ai_suggested_title) && <p className={styles.noteTitle}>{note.title ?? note.ai_suggested_title}</p>}
            <p className={styles.noteQuote}>&ldquo;{note.raw_content}&rdquo;</p>
            <span className={styles.noteTime}>{new Date(note.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        ))
      )}
    </>
  )
}
