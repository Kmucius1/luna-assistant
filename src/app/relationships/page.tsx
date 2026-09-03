'use client'
import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  MessageCircle, Plus, Sparkles, Clock, AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { SmartInput } from '@/components/ui/SmartInput'

type RelType = 'all' | 'family' | 'friends' | 'clients' | 'team'

interface Person {
  id: string
  name: string
  initials: string
  type: 'family' | 'friends' | 'clients' | 'team'
  role: string
  lastContact: string
  health: 'strong' | 'good' | 'nurture' | 'overdue'
  note: string
  color: string
  birthday?: string
  needsAttention?: boolean
}

const PEOPLE: Person[] = [
  {
    id: '1',
    name: 'Mom',
    initials: 'M',
    type: 'family',
    role: 'Mother',
    lastContact: 'Today',
    health: 'strong',
    note: 'Proud of you. Thinking of you.',
    color: '#E8B4B8',
  },
  {
    id: '2',
    name: 'Jasmine Lee',
    initials: 'JL',
    type: 'clients',
    role: 'Client — Brand Strategy',
    lastContact: 'Today',
    health: 'strong',
    note: "Can't wait to see the deck!",
    color: '#4F9A94',
  },
  {
    id: '3',
    name: 'Marcus',
    initials: 'MA',
    type: 'friends',
    role: 'Friend',
    lastContact: 'Yesterday',
    health: 'good',
    note: 'Coffee this week?',
    color: '#6A9FB8',
    needsAttention: true,
  },
  {
    id: '4',
    name: 'Kaleb',
    initials: 'KM',
    type: 'team',
    role: 'Partner — Ad-Vantage',
    lastContact: '2 days ago',
    health: 'strong',
    note: 'Review Q2 campaign strategy',
    color: '#5A9E5A',
  },
  {
    id: '5',
    name: 'EHM Team',
    initials: 'EH',
    type: 'clients',
    role: 'Client — Mortgage Strategies',
    lastContact: '3 days ago',
    health: 'good',
    note: 'CRM launch call this week',
    color: '#5C4530',
  },
  {
    id: '6',
    name: 'Leanne',
    initials: 'L',
    type: 'clients',
    role: 'Client — Lovely Lash Shop',
    lastContact: '1 week ago',
    health: 'nurture',
    note: 'Check in on website feedback',
    color: '#B88A8A',
    needsAttention: true,
  },
  {
    id: '7',
    name: 'Dad',
    initials: 'D',
    type: 'family',
    role: 'Father',
    lastContact: '2 weeks ago',
    health: 'overdue',
    note: 'Call him soon — it has been a while.',
    color: '#8A9E6B',
    needsAttention: true,
  },
]

const HEALTH_COLORS: Record<string, string> = {
  strong:  '#5A9E5A',
  good:    '#6A9FB8',
  nurture: '#5C4530',
  overdue: '#B85A5A',
}

const HEALTH_LABELS: Record<string, string> = {
  strong:  'Strong',
  good:    'Good',
  nurture: 'Nurture',
  overdue: 'Overdue',
}

const TYPE_FILTERS: { key: RelType; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'family',  label: 'Family' },
  { key: 'friends', label: 'Friends' },
  { key: 'clients', label: 'Clients' },
  { key: 'team',    label: 'Team' },
]

const AI_PROMPTS = [
  'How do I reconnect after being distant?',
  'What is a thoughtful way to follow up with a client?',
  'How do I set a boundary with someone I care about?',
  'How do I show appreciation to my team?',
]

function PersonCard({ person, dark = false }: { person: Person; dark?: boolean }) {
  const cardBg    = dark ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.8)'
  const cardBorder = dark ? 'rgba(180,150,100,0.18)' : 'rgba(201,169,110,0.15)'
  const nameColor = dark ? '#100C1E' : 'var(--depth)'
  const subColor  = dark ? '#5E5474' : 'var(--mid)'
  const noteColor = dark ? '#8A8098' : 'var(--mist)'

  return (
    <div className="rounded-2xl p-4 flex items-start gap-4 transition-all"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${person.color}, ${person.color}aa)` }}>
        {person.initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="text-sm font-semibold" style={{ color: nameColor }}>{person.name}</p>
            <p className="text-xs mt-0.5" style={{ color: subColor }}>{person.role}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {person.needsAttention && (
              <AlertCircle className="h-3.5 w-3.5" style={{ color: '#5C4530' }} />
            )}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `${HEALTH_COLORS[person.health]}18`,
                color: HEALTH_COLORS[person.health],
              }}>
              {HEALTH_LABELS[person.health]}
            </span>
          </div>
        </div>
        <p className="text-xs truncate mb-2" style={{ color: noteColor }}>{person.note}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" style={{ color: noteColor }} />
            <span className="text-xs" style={{ color: noteColor }}>{person.lastContact}</span>
          </div>
          <Link href="/messages">
            <button className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-lg transition-all"
              style={{
                background: dark ? 'rgba(201,169,110,0.15)' : 'rgba(201,169,110,0.1)',
                color: '#5C4530',
              }}>
              <MessageCircle className="h-3 w-3" />
              Message
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RelationshipsPage() {
  const [filter, setFilter]     = useState<RelType>('all')
  const [aiInput, setAiInput]   = useState('')
  const [aiReply, setAiReply]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const filtered = filter === 'all' ? PEOPLE : PEOPLE.filter(p => p.type === filter)
  const needsAttention = PEOPLE.filter(p => p.needsAttention).length

  async function askAI() {
    if (!aiInput.trim()) return
    setAiLoading(true)
    setAiReply('')
    try {
      const res = await fetch('/api/ai/message-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation: aiInput, type: 'relationship_advice' }),
      })
      const data = await res.json()
      setAiReply(data.suggestion ?? data.reply ?? 'Here is some guidance based on what you shared.')
    } catch {
      setAiReply('Lead with empathy and honesty. Trust what you already know.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <>
      {/* ── MOBILE ── */}
      <div className="lg:hidden min-h-screen"
        style={{
          background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)',
          '--text-1': '#100C1E',
          '--text-2': '#32284A',
          '--text-3': '#5E5474',
          '--depth': '#100C1E',
          '--mid': '#5E5474',
          '--mist': '#8A8098',
          '--violet': '#5C4530',
          '--violet-deep': '#B8974F',
          '--surface': 'rgba(255,255,255,0.6)',
          '--surface-strong': 'rgba(255,255,255,0.75)',
          '--surface-border': 'rgba(180,150,100,0.18)',
        } as React.CSSProperties}>
        <AppLayout noPad>
          <div className="px-4 pt-12 pb-nav space-y-4">

            {/* Header */}
            <div className="mb-2">
              <p className="text-base font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Your Circle</p>
              <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-1)' }}>Relationships</h1>
              {needsAttention > 0 && (
                <p className="text-sm mt-1" style={{ color: 'var(--violet)' }}>
                  {needsAttention} connection{needsAttention > 1 ? 's' : ''} need your attention
                </p>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {TYPE_FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: filter === f.key ? 'var(--violet)' : 'rgba(255,255,255,0.8)',
                    color: filter === f.key ? '#100C1E' : 'var(--mid)',
                    border: `1px solid ${filter === f.key ? 'transparent' : 'rgba(201,169,110,0.15)'}`,
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* People list */}
            <div className="space-y-3">
              {filtered.map(person => (
                <PersonCard key={person.id} person={person} dark={false} />
              ))}
            </div>

            {/* Add person */}
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium"
              style={{ background: 'var(--surface)', border: '1.5px dashed rgba(201,169,110,0.35)', color: 'var(--violet)' }}>
              <Plus className="h-4 w-4" />
              Add someone
            </button>

            {/* AI Coach */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface-strong)', border: '1px solid rgba(201,169,110,0.15)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4" style={{ color: 'var(--violet)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Relationship Coach</p>
              </div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
                Describe a situation and get thoughtful guidance.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {AI_PROMPTS.map(p => (
                  <button key={p} onClick={() => setAiInput(p)}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(201,169,110,0.1)', color: 'var(--violet)' }}>
                    {p}
                  </button>
                ))}
              </div>
              <SmartInput
                context="what is on my mind about someone in my life — a relationship dynamic, a conversation, something unresolved"
                placeholder="What is on your mind about someone?"
                value={aiInput}
                onChange={setAiInput}
                patternType="relationships"
                rows={3}
              />
              <button
                onClick={askAI}
                disabled={aiLoading || !aiInput.trim()}
                className="w-full py-3 rounded-xl text-sm font-semibold text-[#FDF8F3] transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--violet), var(--violet-deep))' }}>
                {aiLoading ? 'Thinking...' : 'Get guidance'}
              </button>
              {aiReply && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{aiReply}</p>
                </div>
              )}
            </div>
          </div>
        </AppLayout>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block min-h-screen"
        style={{ background: 'linear-gradient(180deg, #FBF8F2 0%, #F6F1E7 55%, #F0E9DA 100%)' }}>
        <div className="fixed top-0 right-0 w-[600px] h-[600px] pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 20%, rgba(201,169,110,0.15) 0%, transparent 60%)', filter: 'blur(40px)' }} />

        <AppLayout noPad>
          <div className="pt-20 pb-[110px] px-8">

            {/* Header */}
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-base font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-4)' }}>Your Circle</p>
                <h1 className="font-display text-4xl font-bold" style={{ color: 'var(--text-1)' }}>Relationships</h1>
                {needsAttention > 0 && (
                  <p className="text-base mt-1" style={{ color: 'var(--text-2)' }}>
                    {needsAttention} connection{needsAttention > 1 ? 's' : ''} need your attention
                  </p>
                )}
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(180,150,100,0.25)',
                  color: '#32284A',
                }}>
                <Plus className="h-4 w-4" />
                Add person
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6">
              {TYPE_FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: filter === f.key ? 'rgba(201,169,110,0.85)' : 'rgba(255,255,255,0.85)',
                    color: filter === f.key ? '#100C1E' : '#5E5474',
                    border: `1px solid ${filter === f.key ? 'transparent' : 'rgba(180,150,100,0.18)'}`,
                  }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* 2-column grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {filtered.map(person => (
                <PersonCard key={person.id} person={person} dark={true} />
              ))}
            </div>

            {/* AI Coach — desktop */}
            <div className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(180,150,100,0.25)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5" style={{ color: '#5C4530' }} />
                <p className="text-base font-semibold text-[#100C1E]">Relationship Coach</p>
              </div>
              <p className="text-sm mb-4" style={{ color: '#5E5474' }}>
                Describe a situation and get thoughtful, grounded guidance.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {AI_PROMPTS.map(p => (
                  <button key={p} onClick={() => setAiInput(p)}
                    className="text-sm px-4 py-2 rounded-xl transition-all"
                    style={{ background: 'rgba(201,169,110,0.15)', color: '#5C4530', border: '1px solid rgba(201,169,110,0.25)' }}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <SmartInput
                  context="what is on my mind about someone in my life — a relationship dynamic, a conversation, something unresolved"
                  placeholder="What is on your mind about someone?"
                  value={aiInput}
                  onChange={setAiInput}
                  patternType="relationships"
                  rows={2}
                  onSubmit={askAI}
                />
              </div>
              {aiReply && (
                <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(244,235,212,0.9)', border: '1px solid rgba(201,169,110,0.35)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: '#32284A' }}>{aiReply}</p>
                </div>
              )}
            </div>

          </div>
        </AppLayout>
      </div>
    </>
  )
}
