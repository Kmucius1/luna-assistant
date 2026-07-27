'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { BookOpen, Mic, Plus, ChevronRight, Heart, Sparkles, Moon, Star, Search } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { SmartInput } from '@/components/ui/SmartInput'
import { addPattern } from '@/lib/patterns'

interface JournalEntry {
  id: string
  type: 'journal' | 'dream' | 'gratitude' | 'shadow' | 'lesson'
  mood?: string
  energy?: number
  content: string
  tags?: string[]
  created_at: string
}

function dateLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today'
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const PROMPTS = [
  { emoji: '🌊', text: 'What am I carrying today?' },
  { emoji: '🪞', text: 'What am I avoiding?' },
  { emoji: '⭐', text: 'What am I proud of?' },
  { emoji: '📖', text: 'What did I learn?' },
  { emoji: '🍃', text: 'What do I need to release?' },
  { emoji: '🔮', text: 'What does my body want to say?' },
  { emoji: '🌙', text: 'What does my soul already know?' },
]

const MOODS = [
  { label: 'Peaceful', emoji: '😌' },
  { label: 'Focused', emoji: '🎯' },
  { label: 'Tender', emoji: '🥺' },
  { label: 'Scattered', emoji: '🌀' },
  { label: 'Grateful', emoji: '🙏' },
  { label: 'Anxious', emoji: '😰' },
  { label: 'Powerful', emoji: '🔥' },
  { label: 'Exhausted', emoji: '😮‍💨' },
]

const TYPE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  journal:   { label: 'Journal',   emoji: '📓', color: '#C9A96E' },
  dream:     { label: 'Dream',     emoji: '🌙', color: '#6A9FB8' },
  gratitude: { label: 'Gratitude', emoji: '🌸', color: '#B88A8A' },
  shadow:    { label: 'Shadow',    emoji: '🪞', color: '#6B6080' },
  lesson:    { label: 'Lesson',    emoji: '📖', color: '#8A9E6B' },
}

export default function JournalPage() {
  const [view, setView] = useState<'home' | 'write' | 'entry'>('home')
  const [writeType, setWriteType] = useState<JournalEntry['type']>('journal')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/journal')
      .then(r => r.json())
      .then(d => setEntries((d.entries ?? []).map((e: { id: string; entry_type: string; mood?: string; content: string; tags?: string[]; created_at: string }) => ({
        id: e.id, type: e.entry_type as JournalEntry['type'], mood: e.mood, content: e.content, tags: e.tags, created_at: e.created_at,
      }))))
      .catch(() => setEntries([]))
  }, [])
  if (!mounted) return null

  const todayEntry = entries.find(e => dateLabel(e.created_at) === 'Today')

  async function saveEntry() {
    if (!content.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_type: writeType, mood: selectedMood || undefined, content, tags: [] }),
      })
      if (!res.ok) throw new Error()
      const { entry } = await res.json()
      setEntries(prev => [{
        id: entry.id, type: entry.entry_type, mood: entry.mood, content: entry.content, tags: entry.tags, created_at: entry.created_at,
      }, ...prev])
      setContent('')
      setSelectedMood('')
      setSelectedPrompt('')
      setView('home')
    } catch {
      /* keep the draft in place so nothing typed is lost */
    } finally {
      setSaving(false)
    }
  }

  if (view === 'write') return (
    <AppLayout>
      <div className="pt-4 pb-4">
        <button onClick={() => setView('home')} className="flex items-center gap-2 mb-5 text-sm" style={{ color: 'var(--text-3)' }}>
          ← Back
        </button>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {Object.entries(TYPE_LABELS).map(([key, { label, emoji }]) => (
            <button key={key} onClick={() => setWriteType(key as JournalEntry['type'])}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: writeType === key ? 'var(--violet)' : 'rgba(201,169,110,0.08)',
                color: writeType === key ? '#100C1E' : 'var(--mid)',
                border: '1px solid',
                borderColor: writeType === key ? 'transparent' : 'rgba(201,169,110,0.1)',
              }}>
              {emoji} {label}
            </button>
          ))}
        </div>

        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
          {writeType === 'dream' ? 'Dream Log' : writeType === 'shadow' ? 'Shadow Work' : 'Journal Entry'}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text-3)' }}>{format(new Date(), 'EEEE, MMMM d · h:mm a')}</p>

        {/* Mood */}
        {writeType === 'journal' && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>How are you feeling?</p>
            <div className="flex gap-2 flex-wrap">
              {MOODS.map(m => (
                <button key={m.label} onClick={() => {
                  const newMood = m.label === selectedMood ? '' : m.label
                  setSelectedMood(newMood)
                  if (newMood) addPattern({ type: 'journal', context: 'mood', value: newMood, source: 'suggestion' })
                }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: selectedMood === m.label ? 'rgba(201,169,110,0.2)' : 'var(--surface)',
                    border: `1.5px solid ${selectedMood === m.label ? 'var(--violet)' : 'rgba(180,150,100,0.18)'}`,
                    color: selectedMood === m.label ? '#C9A96E' : 'var(--text-2)',
                  }}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompts */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-4)' }}>
            {writeType === 'dream' ? 'What do you remember?' : 'Start with a prompt (optional)'}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PROMPTS.map(p => (
              <button key={p.text} onClick={() => {
                setSelectedPrompt(p.text)
                setContent(content + (content ? '\n\n' : '') + p.text + '\n')
              }}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(180,150,100,0.18)',
                  color: 'var(--text-2)',
                }}>
                {p.emoji} {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Smart write area */}
        <SmartInput
          context={
            writeType === 'dream' ? 'dream — what I saw, felt, people, places, symbols' :
            writeType === 'shadow' ? 'shadow work — what I am avoiding, the pattern I see, what I am projecting' :
            writeType === 'gratitude' ? 'gratitude — what I am genuinely grateful for today' :
            writeType === 'lesson' ? 'lesson — what I learned, what changed my perspective' :
            selectedPrompt || 'journal — what I am feeling, thinking, processing, noticing'
          }
          placeholder="Write or speak freely. Nothing needs to be perfect here..."
          value={content}
          onChange={setContent}
          patternType="journal"
          rows={8}
          history={selectedMood ? [selectedMood] : []}
        />

        <button onClick={() => void saveEntry()}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
          style={{ background: content.trim() ? 'var(--violet)' : 'var(--surface-border)', color: content.trim() ? '#100C1E' : 'var(--text-4)' }}
          disabled={!content.trim() || saving}>
          {saving ? 'Saving...' : 'Save entry'}
        </button>
      </div>
    </AppLayout>
  )

  if (viewEntry) return (
    <AppLayout>
      <div className="pt-4 pb-4">
        <button onClick={() => setViewEntry(null)} className="flex items-center gap-2 mb-5 text-sm" style={{ color: 'var(--text-3)' }}>
          ← Back
        </button>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{TYPE_LABELS[viewEntry.type].emoji}</span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            {TYPE_LABELS[viewEntry.type].label}
          </span>
          {viewEntry.mood && (
            <span className="ml-auto text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--violet)' }}>
              {viewEntry.mood}
            </span>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>{dateLabel(viewEntry.created_at)}</p>
        <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-display)' }}>
          {viewEntry.content}
        </p>
        {viewEntry.tags && viewEntry.tags.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {viewEntry.tags.map(t => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(201,169,110,0.08)', color: 'var(--text-3)' }}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="pt-4 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>Journal</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{format(new Date(), 'EEEE, MMMM d')}</p>
          </div>
          <button onClick={() => setView('write')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--violet)', color: '#100C1E' }}>
            <Plus className="h-4 w-4" /> Write
          </button>
        </div>

        {/* Today's check-in */}
        {!todayEntry ? (
          <div className="rounded-2xl p-5 mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.08) 0%, rgba(201,169,110,0.05) 100%)', border: '1.5px dashed rgba(201,169,110,0.2)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>You haven&apos;t journaled today yet.</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>A few honest words is enough.</p>
            <div className="flex gap-2">
              <button onClick={() => setView('write')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--violet)', color: '#100C1E' }}>
                <Plus className="h-4 w-4" /> Write entry
              </button>
              <Link href="/dictation">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--violet)' }}>
                  <Mic className="h-4 w-4" /> Dictate
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5 mb-5"
            style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', backdropFilter: 'blur(14px)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span>📓</span>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Today</p>
              {todayEntry.mood && <span className="ml-auto text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--violet)' }}>{todayEntry.mood}</span>}
            </div>
            <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-2)' }}>{todayEntry.content}</p>
            <button onClick={() => setViewEntry(todayEntry)} className="flex items-center gap-1 mt-3 text-xs font-semibold" style={{ color: 'var(--violet)' }}>
              Read full entry <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Quick journal types */}
        <div className="grid grid-cols-2 gap-2 mb-5 lg:grid-cols-4">
          {[
            { label: 'Gratitude', emoji: '🌸', type: 'gratitude' as const, sub: 'What am I grateful for?' },
            { label: 'Dream log', emoji: '🌙', type: 'dream' as const, sub: 'What did I dream?' },
            { label: 'Shadow work', emoji: '🪞', type: 'shadow' as const, sub: 'What am I avoiding?' },
            { label: 'Lesson', emoji: '📖', type: 'lesson' as const, sub: 'What did I learn?' },
          ].map(({ label, emoji, type, sub }) => (
            <button key={type} onClick={() => { setWriteType(type); setView('write') }}
              className="flex flex-col items-start gap-1 p-4 rounded-2xl text-left transition-all hover:scale-[1.02]"
              style={{ background: 'var(--surface)', border: '1px solid rgba(201,169,110,0.15)', backdropFilter: 'blur(14px)' }}>
              <span className="text-xl">{emoji}</span>
              <p className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{label}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>
            </button>
          ))}
        </div>

        {/* Past entries */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Recent entries</p>
          <button className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(201,169,110,0.06)', color: 'var(--text-3)' }}>
            <Search className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {entries.map(entry => {
            const meta = TYPE_LABELS[entry.type]
            return (
              <button key={entry.id} onClick={() => setViewEntry(entry)}
                className="w-full text-left rounded-2xl p-4 flex items-start gap-3 transition-all"
                style={{ background: 'var(--surface)', border: '1px solid rgba(180,150,100,0.18)', backdropFilter: 'blur(14px)' }}>
                <span className="text-lg flex-shrink-0">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-4)' }}>{dateLabel(entry.created_at)}</span>
                  </div>
                  <p className="text-sm leading-snug truncate" style={{ color: 'var(--text-2)' }}>{entry.content}</p>
                  {entry.mood && <span className="text-xs mt-1 inline-block" style={{ color: 'var(--text-4)' }}>{entry.mood}</span>}
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: 'var(--text-4)' }} />
              </button>
            )
          })}
        </div>

        {/* Spirit prompts */}
        <div className="mt-6 rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.06), rgba(168,196,218,0.06))', border: '1px solid rgba(201,169,110,0.1)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Today&apos;s prompts</p>
          </div>
          <div className="space-y-2">
            {PROMPTS.slice(0, 3).map(p => (
              <button key={p.text} onClick={() => {
                setSelectedPrompt(p.text)
                setContent(p.text + '\n')
                setView('write')
              }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid rgba(180,150,100,0.18)' }}>
                <span>{p.emoji}</span>
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>{p.text}</span>
                <ChevronRight className="h-3.5 w-3.5 ml-auto" style={{ color: 'var(--text-4)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
