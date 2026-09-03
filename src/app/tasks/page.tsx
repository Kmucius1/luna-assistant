'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskForm } from '@/components/tasks/TaskForm'
import { LoadingPage } from '@/components/ui/loading'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskCategory, TaskStatus } from '@/types'
import { Plus, Sparkles, X, RefreshCw, ArrowLeft, ExternalLink, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import type { DryphubTask } from '@/lib/dryp-crm'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const STATUS_FILTERS: { value: TaskStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'todo',        label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting',     label: 'Waiting' },
  { value: 'done',        label: 'Done' },
]

export default function TasksPage() {
  const [tasks,          setTasks]          = useState<Task[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [statusFilter,   setStatusFilter]   = useState<TaskStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all')
  const [aiLoading,      setAiLoading]      = useState(false)
  const [aiRankings,     setAiRankings]     = useState<Array<{ id: string; reason: string }> | null>(null)
  const [dryphubTasks,   setDryphubTasks]   = useState<DryphubTask[]>([])
  const [dryphubLoading, setDryphubLoading] = useState(true)
  const [saveError,      setSaveError]      = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/dryp/tasks')
      .then(r => r.json())
      .then(d => { if (d.connected) setDryphubTasks(d.tasks ?? []) })
      .catch(() => {})
      .finally(() => setDryphubLoading(false))
  }, [])

  const loadTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('priority_score', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function handleCreateTask(taskData: Partial<Task>) {
    setSaveError(null)
    try {
      const res = await fetch('/api/tasks/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) })
      const { task } = await res.json()
      if (task) { setTasks(prev => [task, ...prev]); setShowForm(false) }
      else setSaveError("Couldn't save that task — try again.")
    } catch {
      setSaveError("Couldn't save that task — try again.")
    }
  }

  async function handleStatusChange(id: string, status: Task['status']) {
    setSaveError(null)
    const prevTasks = tasks
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    try {
      const res = await fetch('/api/tasks/update', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
      if (!res.ok) throw new Error('update failed')
    } catch {
      setTasks(prevTasks)
      setSaveError("Couldn't update that task — try again.")
    }
  }

  async function handleAIRank() {
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
    if (!activeTasks.length) return
    setAiLoading(true)
    try {
      const res  = await fetch('/api/ai/prioritize-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks: activeTasks.slice(0, 15) }) })
      const data = await res.json()
      if (data.ranked_tasks) {
        setAiRankings(data.ranked_tasks)
        const rankMap = new Map(data.ranked_tasks.map((t: { id: string }, i: number) => [t.id, i]))
        setTasks(prev => [...prev].sort((a, b) => ((rankMap.get(a.id) ?? 999) as number) - ((rankMap.get(b.id) ?? 999) as number)))
      }
    } finally { setAiLoading(false) }
  }

  const filtered   = tasks.filter(t => (statusFilter === 'all' || t.status === statusFilter) && (categoryFilter === 'all' || t.category === categoryFilter))
  const categories = [...new Set(tasks.map(t => t.category))] as TaskCategory[]
  const openCount  = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
  const doneCount  = tasks.filter(t => t.status === 'done').length

  if (loading) return <AppLayout><LoadingPage /></AppLayout>

  return (
    <div
      className="bg-app min-h-screen"
      style={{
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
      } as React.CSSProperties}
    >
      <AppLayout noPad className="pt-16">
        <div style={{ padding: '0 0 180px' }}>

          {/* Header */}
          <div style={{ padding: '20px 20px 16px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 12, textDecoration: 'none', marginBottom: 14 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>Tasks</h1>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  {openCount} open · {doneCount} done
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAIRank} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: '1px solid rgba(201,169,110,0.4)', background: 'rgba(240,228,200,0.92)', color: '#5C4530', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI rank
                </button>
                <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, border: 'none', background: '#5C4530', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <Plus className="h-4 w-4" /> Add task
                </button>
              </div>
            </div>
          </div>

          {/* DRYP CRM live tasks */}
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ background: 'rgba(244,235,212,0.92)', border: '1px solid rgba(201,169,110,0.35)', borderRadius: 20 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🏢</span>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.8)' }}>DRYP CRM Tasks</p>
                  {!dryphubLoading && dryphubTasks.length > 0 && (
                    <span style={{ padding: '2px 8px', borderRadius: 8, background: 'rgba(201,169,110,0.15)', color: 'rgba(201,169,110,0.9)', fontSize: 11, fontWeight: 700 }}>{dryphubTasks.length}</span>
                  )}
                </div>
                <a href="https://dryphub.com/tasks" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(201,169,110,0.6)', textDecoration: 'none', fontWeight: 600 }}>
                  Open CRM <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Loading */}
              {dryphubLoading && (
                <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: 'rgba(201,169,110,0.5)' }} />
                  <p style={{ fontSize: 12, color: 'rgba(201,169,110,0.5)' }}>Loading tasks from DRYP Hub…</p>
                </div>
              )}

              {/* Tasks list */}
              {!dryphubLoading && dryphubTasks.length > 0 && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dryphubTasks.map(task => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                    const isDueToday = task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString()
                    const priorityColor = task.priority === 'high' || task.priority === 'urgent' ? '#E05E5E' : task.priority === 'medium' ? '#5C4530' : 'rgba(50,40,74,0.3)'
                    return (
                      <div key={task.id} style={{ background: 'rgba(201,169,110,0.08)', border: `1px solid ${isOverdue ? 'rgba(224,94,94,0.25)' : 'rgba(201,169,110,0.15)'}`, borderRadius: 12, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: priorityColor, marginTop: 5, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#100C1E', lineHeight: 1.35 }}>{task.title}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                              {task.account_name && (
                                <span style={{ fontSize: 11, color: 'rgba(201,169,110,0.9)', fontWeight: 500 }}>{task.account_name}</span>
                              )}
                              {task.due_date && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: isOverdue ? '#E05E5E' : isDueToday ? '#5C4530' : '#5E5474', fontWeight: isOverdue || isDueToday ? 700 : 400 }}>
                                  {isOverdue && <AlertCircle className="h-3 w-3" />}
                                  {!isOverdue && <Clock className="h-3 w-3" />}
                                  {isOverdue ? 'Overdue · ' : isDueToday ? 'Due today · ' : 'Due '}
                                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: '#8A8098', textTransform: 'capitalize' }}>{task.status.replace(/_/g, ' ')}</span>
                            </div>
                            {task.description && (
                              <p style={{ fontSize: 11, color: '#5E5474', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{task.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Empty */}
              {!dryphubLoading && dryphubTasks.length === 0 && (
                <div style={{ padding: '8px 16px 14px' }}>
                  <p style={{ fontSize: 12, color: 'rgba(201,169,110,0.5)' }}>No open tasks in DRYP CRM.</p>
                </div>
              )}

              {/* Quick links row */}
              <div style={{ borderTop: '1px solid rgba(201,169,110,0.1)', padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'All Tasks', href: 'https://dryphub.com/tasks' },
                  { label: 'Clients',   href: 'https://dryphub.com/accounts' },
                  { label: 'Outreach',  href: 'https://dryphub.com/outreach' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.15)', color: 'rgba(201,169,110,0.7)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                    {label} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '0 16px' }}>

            {saveError && (
              <div style={{ ...GLASS, padding: '10px 14px', marginBottom: 14, borderColor: 'rgba(224,94,94,0.35)', color: '#B23B3B', fontSize: 13 }}>
                {saveError}
              </div>
            )}

            {/* Add task form */}
            {showForm && (
              <div style={{ ...GLASS, padding: 18, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#100C1E' }}>New task</p>
                  <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5E5474' }}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <TaskForm onSubmit={handleCreateTask} onCancel={() => setShowForm(false)} />
              </div>
            )}

            {/* AI ranking banner */}
            {aiLoading && (
              <div style={{ ...GLASS, padding: 14, background: 'rgba(244,235,212,0.92)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <RefreshCw className="h-4 w-4 animate-spin" style={{ color: '#5C4530' }} />
                <p style={{ fontSize: 13, color: '#32284A' }}>AI is ranking your tasks…</p>
              </div>
            )}
            {aiRankings && !aiLoading && (
              <div style={{ padding: '12px 16px', borderRadius: 16, background: 'rgba(244,235,212,0.92)', border: '1px solid rgba(201,169,110,0.35)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 12, color: '#8A6F2A' }}>AI ranked — top priority: &quot;{tasks.find(t => t.id === aiRankings[0]?.id)?.title}&quot;</p>
                <button onClick={() => setAiRankings(null)} style={{ fontSize: 11, color: '#5E5474', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
              </div>
            )}

            {/* Status filters */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {STATUS_FILTERS.map(f => (
                <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: statusFilter === f.value ? '#5C4530' : 'rgba(255,255,255,0.55)',
                  color:      statusFilter === f.value ? 'white' : '#5E5474',
                }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category filters */}
            {categories.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <button onClick={() => setCategoryFilter('all')} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: categoryFilter === 'all' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)', color: '#5E5474', border: '1px solid rgba(180,150,100,0.16)' }}>
                  All categories
                </button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)} style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                    background: categoryFilter === cat ? 'rgba(201,169,110,0.22)' : 'rgba(255,255,255,0.45)',
                    color:      categoryFilter === cat ? '#8A6F2A' : '#5E5474',
                    border:     categoryFilter === cat ? '1px solid rgba(201,169,110,0.4)' : '1px solid rgba(180,150,100,0.14)',
                  }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Task list */}
            {filtered.length === 0 ? (
              <div style={{ ...GLASS, padding: 36, textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#5E5474', marginBottom: 16 }}>No tasks match these filters.</p>
                <button onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 14, border: 'none', background: '#5C4530', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus className="h-4 w-4" /> Add your first task
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map((task, i) => (
                  <div key={task.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    {aiRankings && (
                      <span style={{ width: 24, height: 24, borderRadius: 12, background: 'rgba(240,228,200,0.92)', color: '#8A6F2A', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 16 }}>{i + 1}</span>
                    )}
                    <div style={{ flex: 1 }}>
                      <TaskCard task={task} onStatusChange={handleStatusChange} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </div>
  )
}
