'use client'

import { useCallback, useEffect, useState } from 'react'
import { Send, Users } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './WorkViews.module.css'

interface TeamUpdate { id: string; content: string; account_name?: string; created_at: string }

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  if (d < 3_600_000) return `${Math.max(1, Math.floor(d / 60_000))}m ago`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`
  return `${Math.floor(d / 86_400_000)}d ago`
}

interface TeamUpdatesSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function TeamUpdatesSheet({ isOpen, onClose }: TeamUpdatesSheetProps) {
  const [updates, setUpdates] = useState<TeamUpdate[] | null>(null)
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(() => {
    fetch('/api/dryp/team-updates', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setUpdates(data.updates ?? []))
      .catch(() => setUpdates([]))
  }, [])

  useEffect(() => { if (isOpen) load() }, [isOpen, load])

  async function post() {
    if (!message.trim()) return
    setPosting(true)
    setError(false)
    try {
      const res = await fetch('/api/dryp/team-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!res.ok) throw new Error()
      setMessage('')
      load()
    } catch {
      setError(true)
    } finally {
      setPosting(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Team Updates" subtitle="What the team's been up to across every client" height="80vh">
      <label className={styles.sheetLabel}>Post a check-in</label>
      <textarea className={styles.sheetTextarea} rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="What are you working on?" />
      <button type="button" className={styles.sheetSubmit} onClick={post} disabled={posting || !message.trim()}>
        <Send size={13} /> {posting ? 'Posting…' : 'Post Update'}
      </button>
      {error && <p className={styles.sheetErrorMsg}>Couldn&apos;t post that — try again.</p>}

      <label className={styles.sheetLabel} style={{ marginTop: 18 }}><Users size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />Recent activity</label>
      {updates === null ? (
        <p className={styles.sheetMsg}>Loading…</p>
      ) : updates.length === 0 ? (
        <p className={styles.sheetMsg}>No recent team activity yet.</p>
      ) : (
        updates.map(u => (
          <div key={u.id} className={styles.feedRow}>
            <span className={styles.feedText}>{u.content}</span>
            <span className={styles.feedMeta}>
              {u.account_name && <span className={styles.feedAccountTag}>{u.account_name}</span>}
              <span>{timeAgo(u.created_at)}</span>
            </span>
          </div>
        ))
      )}
    </BottomSheet>
  )
}
