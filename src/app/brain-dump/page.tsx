'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Brain, Sparkles, Zap, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { SmartInput } from '@/components/ui/SmartInput'
import { addPattern } from '@/lib/patterns'

interface BrainDumpTask {
  title: string; category: string; project: string; urgency_level: string
  estimated_minutes: number; money_impact: number; is_quick_win: boolean; priority_score: number
}
interface BrainDumpResult {
  tasks: BrainDumpTask[]; grouped: Record<string, BrainDumpTask[]>; today_order: BrainDumpTask[]
  quick_wins: BrainDumpTask[]; can_wait: BrainDumpTask[]; ai_message: string
}

const URGENCY_COLORS: Record<string, string> = {
  critical: '#C96B5A', high: '#C9A96E', medium: '#9b5cff', low: '#5A8A7A'
}

export default function BrainDumpPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BrainDumpResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  async function handleDump() {
    if (!text.trim()) return
    setLoading(true); setError(''); setResult(null)
    addPattern({ type: 'brain_dump', context: 'brain dump', value: text, source: 'typed' })
    try {
      const res = await fetch('/api/ai/brain-dump', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  async function saveTask(task: BrainDumpTask) {
    setSaving(task.title)
    try {
      await fetch('/api/tasks/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: task.title, category: task.category || 'Personal', project: task.project || '', urgency_level: task.urgency_level || 'medium', estimated_minutes: task.estimated_minutes || 30, money_impact: task.money_impact || 0, priority_score: task.priority_score || 50, status: 'todo', source: 'brain_dump' }),
      })
      setSaved(prev => new Set(prev).add(task.title))
    } finally { setSaving(null) }
  }

  return (
    <div className="min-h-screen bg-app">
      <AppLayout>
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pt-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.2)' }}>
            <Brain className="h-5 w-5" style={{ color: '#C9A96E' }} />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--text-1)' }}>Brain Dump</h1>
            <p className="text-xs" style={{ color: 'var(--text-4)' }}>Speak everything out. LUNA organizes it.</p>
          </div>
        </div>

        {/* Smart input */}
        {!result && (
          <div className="rounded-[22px] p-5 mb-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
              What is everything that is on your mind right now?
            </p>
            <SmartInput
              context="brain dump — everything on my mind, tasks, worries, to-dos, people, ideas"
              placeholder="Speak or type — dump it all out..."
              value={text}
              onChange={setText}
              patternType="brain_dump"
              rows={5}
            />
            {error && (
              <div className="flex items-center gap-2 mt-3 rounded-[14px] px-3 py-2"
                style={{ background: 'rgba(201,107,90,0.1)', border: '1px solid rgba(201,107,90,0.2)' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#C96B5A' }} />
                <p className="text-sm" style={{ color: '#C96B5A' }}>{error}</p>
              </div>
            )}
            <button onClick={handleDump} disabled={!text.trim() || loading}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-[16px] font-semibold transition-all"
              style={{
                background: !text.trim() ? 'var(--surface-border)' : 'var(--violet)',
                color: !text.trim() ? 'var(--text-4)' : 'white',
              }}>
              <Sparkles className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Organizing...' : 'Sort it out'}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-[20px] p-6 text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
            <div className="flex gap-1.5 justify-center mb-3">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'var(--violet)', animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Organizing your thoughts into tasks...</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-4">
            {/* AI message */}
            <div className="rounded-[20px] p-4"
              style={{ background: 'rgba(155,92,255,0.1)', border: '1px solid rgba(155,92,255,0.2)' }}>
              <div className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--violet)' }} />
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-1)' }}>{result.ai_message}</p>
              </div>
            </div>

            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{result.tasks?.length ?? 0} things pulled out</p>
              <button onClick={() => { setText(''); setResult(null); setSaved(new Set()) }}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'var(--text-3)' }}>
                New dump
              </button>
            </div>

            {/* Do today */}
            {result.today_order?.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" style={{ color: '#C9A96E' }} />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Do Today</p>
                  </div>
                  <button onClick={async () => { for (const t of result.today_order.slice(0,8)) { if (!saved.has(t.title)) await saveTask(t) } }}
                    className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(90,140,120,0.15)', color: '#5A8A7A', border: '1px solid rgba(90,140,120,0.25)' }}>
                    Save all
                  </button>
                </div>
                <div className="space-y-2">
                  {result.today_order.map((task, i) => (
                    <TaskCard key={task.title} task={task} rank={i + 1} onSave={saveTask} saving={saving === task.title} saved={saved.has(task.title)} />
                  ))}
                </div>
              </div>
            )}

            {/* Quick wins */}
            {result.quick_wins?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle className="h-4 w-4" style={{ color: '#5A8A7A' }} />
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-4)' }}>Quick Wins · Under 15 min</p>
                </div>
                <div className="space-y-2">
                  {result.quick_wins.map(task => (
                    <TaskCard key={task.title} task={task} onSave={saveTask} saving={saving === task.title} saved={saved.has(task.title)} />
                  ))}
                </div>
              </div>
            )}

            {/* Can wait */}
            {result.can_wait?.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-4)' }}>Can Wait</p>
                <div className="space-y-2 opacity-60">
                  {result.can_wait.map(task => (
                    <TaskCard key={task.title} task={task} onSave={saveTask} saving={saving === task.title} saved={saved.has(task.title)} muted />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AppLayout>
    </div>
  )
}

function TaskCard({ task, rank, onSave, saving, saved, muted = false }: {
  task: BrainDumpTask; rank?: number; onSave: (t: BrainDumpTask) => void; saving: boolean; saved: boolean; muted?: boolean
}) {
  const urgColor = URGENCY_COLORS[task.urgency_level] ?? 'var(--text-4)'
  return (
    <div className="rounded-[18px] p-3.5 flex items-start gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', opacity: muted ? 0.65 : 1 }}>
      {rank && (
        <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ background: 'rgba(155,92,255,0.15)', color: 'var(--violet)' }}>{rank}</span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {task.urgency_level && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: urgColor + '18', color: urgColor }}>
              {task.urgency_level}
            </span>
          )}
          {task.category && (
            <span className="text-xs" style={{ color: 'var(--text-4)' }}>{task.category}</span>
          )}
          {task.estimated_minutes > 0 && (
            <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--text-4)' }}>
              <Clock className="h-3 w-3" />
              {task.estimated_minutes < 60 ? `${task.estimated_minutes}m` : `${Math.round(task.estimated_minutes/60)}h`}
            </span>
          )}
          {task.money_impact > 0 && <DollarSign className="h-3 w-3" style={{ color: '#5A8A7A' }} />}
        </div>
      </div>
      <button onClick={() => onSave(task)} disabled={saving || saved}
        className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
        style={{
          background: saved ? 'rgba(90,140,120,0.15)' : 'rgba(155,92,255,0.12)',
          color: saved ? '#5A8A7A' : 'var(--violet)',
          border: `1px solid ${saved ? 'rgba(90,140,120,0.25)' : 'rgba(155,92,255,0.2)'}`,
        }}>
        {saving ? '...' : saved ? '✓' : '+ Save'}
      </button>
    </div>
  )
}
