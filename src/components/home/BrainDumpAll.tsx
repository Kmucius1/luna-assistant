'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, Mic, Brain, ChevronRight } from 'lucide-react'
import styles from './LunaBrainDumpPage.module.css'

interface Entry { id: string; raw_content: string; entry_type: string; title: string | null; category: string | null; ai_suggested_title: string | null; created_at: string }

const CATEGORIES = ['thoughts', 'todos', 'ideas', 'feelings', 'work', 'personal', 'creative', 'content', 'shopping', 'research', 'people', 'money', 'health', 'later', 'other']

function timeAgo(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function BrainDumpAll() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  function load() {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (search.trim()) params.set('search', search.trim())
    if (category) params.set('category', category)
    fetch(`/api/brain-dump/entries?${params}`).then(r => r.json()).then(d => setEntries(d.entries ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [search, category])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/brain-dump" className={styles.iconButton} aria-label="Back"><ChevronLeft size={18} /></Link>
        <h1>All Brain Dumps</h1>
        <span style={{ width: 36 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(180,150,100,0.18)', borderRadius: 14, padding: '10px 12px' }}>
        <Search size={15} color="#8A8098" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by words, category, or date…" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 13 }} />
      </div>

      <div className={styles.categoryRow}>
        <button type="button" onClick={() => setCategory(null)} className={`${styles.categoryChip} ${!category ? styles.categoryChipActive : ''}`} style={{ width: 'auto', padding: '10px 14px' }}><span>All</span></button>
        {CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => setCategory(c === category ? null : c)} className={`${styles.categoryChip} ${category === c ? styles.categoryChipActive : ''}`} style={{ width: 'auto', padding: '10px 14px' }}>
            <span style={{ textTransform: 'capitalize' }}>{c}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-3)', padding: 20 }}>Searching…</p>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Luna couldn&apos;t find that thought yet. Try different wording, or ask Luna directly.</p>
        </div>
      ) : entries.map(entry => (
        <Link key={entry.id} href={`/brain-dump/${entry.id}`} className={styles.entryRow}>
          <div className={styles.entryIcon}>{entry.entry_type === 'voice' ? <Mic size={16} /> : <Brain size={16} />}</div>
          <div className={styles.entryInfo}>
            <strong>{entry.title ?? entry.ai_suggested_title ?? entry.raw_content.slice(0, 60)}</strong>
            <div className={styles.entryMeta}>
              <span>{timeAgo(entry.created_at)}</span>
              {entry.category && <span className={styles.entryBadge}>{entry.category}</span>}
            </div>
          </div>
          <ChevronRight size={16} className={styles.entryArrow} />
        </Link>
      ))}
    </div>
  )
}
