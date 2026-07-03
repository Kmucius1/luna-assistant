'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { GlassCard } from '@/components/ui/GlassCard'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types'
import { format } from 'date-fns'
import { Sparkles, ArrowRight, Check, Clock, Zap, Sun, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'

const MOCK_TASKS: Task[] = [
  { id: '1', user_id: '', title: 'Send updated website plan to client', category: 'Client Websites', client_name: 'EHM Strategies', status: 'todo', due_date: new Date().toISOString(), priority_score: 92, urgency_level: 'high', money_impact: 80, emotional_weight: 6, source: 'manual', estimated_minutes: 30, created_at: '', updated_at: '' },
  { id: '2', user_id: '', title: 'Reply to DRYP Hub outreach emails', category: 'DRYP Digital', status: 'todo', due_date: new Date().toISOString(), priority_score: 78, urgency_level: 'medium', money_impact: 60, emotional_weight: 4, source: 'email', estimated_minutes: 20, created_at: '', updated_at: '' },
  { id: '3', user_id: '', title: 'Check school assignment deadline', category: 'School', status: 'todo', priority_score: 70, urgency_level: 'medium', money_impact: 0, emotional_weight: 7, source: 'manual', estimated_minutes: 15, created_at: '', updated_at: '' },
]

const URGENCY_COLORS: Record<string, string> = {
  critical: '#E05E5E',
  high:     '#E08B4A',
  medium:   '#9b5cff',
  low:      '#B8C9B4',
}

export default function TodayScreen() {
  const [tasks, setTasks]         = useState<Task[]>([])
  const [loading, setLoading]     = useState(true)
  const [brief, setBrief]         = useState<{ top_3?: string[]; first_step?: string; can_wait?: string[]; ai_message?: string } | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [done, setDone]           = useState<Set<string>>(new Set())
  const supabase = createClient()
  const today = format(new Date(), 'EEEE, MMMM d')

  const loadTasks = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setTasks(MOCK_TASKS); setLoading(false); return }

      const { data } = await supabase.from('tasks').select('*')
        .eq('user_id', user.id)
        .not('status', 'in', '("done","cancelled")')
        .order('priority_score', { ascending: false })
        .limit(20)

      setTasks(data?.length ? data : MOCK_TASKS)
    } catch {
      setTasks(MOCK_TASKS)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function generateBrief() {
    setBriefLoading(true)
    try {
      const res = await fetch('/api/ai/daily-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasks.slice(0, 10) }),
      })
      setBrief(await res.json())
    } catch {
      setBrief({
        top_3: [tasks[0]?.title, tasks[1]?.title, tasks[2]?.title].filter(Boolean) as string[],
        first_step: tasks[0] ? `Start with: ${tasks[0].title}` : 'Choose one clear priority.',
        can_wait: [],
        ai_message: 'You are not here to do everything. You are here to see what matters.',
      })
    } finally {
      setBriefLoading(false)
    }
  }

  function toggleDone(id: string) {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const top3     = tasks.slice(0, 3)
  const urgent   = tasks.filter(t => t.urgency_level === 'critical' || t.urgency_level === 'high')
  const canWait  = tasks.filter(t => t.urgency_level === 'low')

  return (
    <div className="bg-sanctuary min-h-screen">
      <AppLayout noPad className="pt-16">
        <div className="px-6 pb-nav">

          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Sun className="h-4 w-4" style={{ color: 'var(--golden)' }} />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>{today}</p>
          </div>
          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Today</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
            {tasks.length} open items · {urgent.length > 0 ? `${urgent.length} need attention` : 'nothing critical'}
          </p>

          {/* AI Brief */}
          {!brief ? (
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              className="w-full mb-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(155,92,255,0.08)', border: '1.5px solid rgba(155,92,255,0.15)', color: 'var(--violet)' }}
            >
              <Sparkles className="h-4 w-4" />
              {briefLoading ? 'Reading your day...' : 'Generate my daily brief'}
            </button>
          ) : (
            <div className="animate-fade-up mb-5">
              <GlassCard soul>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--violet)' }}>Daily Brief</p>
                {brief.top_3 && brief.top_3.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Top 3 today</p>
                    {brief.top_3.map((item, i) => (
                      <p key={i} className="text-sm py-1" style={{ color: 'var(--text-1)' }}>
                        <span className="text-xs mr-2" style={{ color: 'var(--violet)' }}>0{i + 1}</span>{item}
                      </p>
                    ))}
                  </div>
                )}
                {brief.first_step && (
                  <div className="py-3 border-t" style={{ borderColor: 'rgba(155,92,255,0.1)' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>Start here →</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{brief.first_step}</p>
                  </div>
                )}
                {brief.ai_message && (
                  <p className="text-xs italic mt-3" style={{ color: 'var(--text-3)' }}>{brief.ai_message}</p>
                )}
              </GlassCard>
            </div>
          )}

          {/* Top 3 priorities */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Top priorities</p>
              <Link href="/tasks">
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--violet)' }}>
                  All tasks <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </div>
            <div className="space-y-2.5">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-card p-4 animate-pulse">
                    <div className="h-4 rounded-full w-3/4" style={{ background: 'rgba(155,92,255,0.1)' }} />
                  </div>
                ))
              ) : top3.map((task, i) => (
                <div key={task.id} className="glass-card p-4 flex items-center gap-3"
                  style={{ opacity: done.has(task.id) ? 0.5 : 1 }}>
                  <button
                    onClick={() => toggleDone(task.id)}
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                    style={{
                      background: done.has(task.id) ? 'var(--violet)' : 'transparent',
                      border: done.has(task.id) ? 'none' : '1.5px solid rgba(155,92,255,0.3)',
                    }}
                  >
                    {done.has(task.id) && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)', textDecoration: done.has(task.id) ? 'line-through' : 'none' }}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.client_name && <p className="text-xs" style={{ color: 'var(--text-3)' }}>{task.client_name}</p>}
                      {task.estimated_minutes && (
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                          <Clock className="h-3 w-3" />{task.estimated_minutes}m
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: URGENCY_COLORS[task.urgency_level] ?? '#B8C9B4' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Urgent */}
          {urgent.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: '#E05E5E', animation: 'pulseSoft 2s ease-in-out infinite' }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#E05E5E' }}>Urgent today</p>
              </div>
              <div className="space-y-2">
                {urgent.slice(0, 3).map(task => (
                  <div key={task.id} className="glass-card p-4" style={{ borderLeft: '3px solid #E05E5E' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{task.title}</p>
                    {task.client_name && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{task.client_name}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { href: '/dictation', icon: Sparkles, label: 'Brain dump',     sub: 'Speak your mind',     bg: 'rgba(155,92,255,0.1)', color: 'var(--violet)' },
              { href: '/work',      icon: Zap,      label: 'Work reality',   sub: 'Emails & tasks',      bg: 'rgba(201,169,110,0.1)', color: 'var(--golden)' },
              { href: '/career',    icon: ArrowRight,label: 'Career compass', sub: 'Highest-use work',   bg: 'rgba(168,196,218,0.15)',color: 'var(--lunar)' },
              { href: '/messages',  icon: LinkIcon,  label: 'Messages',       sub: 'Reply with clarity',  bg: 'rgba(184,200,180,0.15)',color: '#5A8A5A' },
            ].map(({ href, icon: Icon, label, sub, bg, color }) => (
              <Link key={href} href={href}>
                <div className="glass-card p-4 cursor-pointer active:scale-95 transition-transform">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Can wait */}
          {canWait.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Can wait</p>
              <div className="glass-card p-4 space-y-2">
                {canWait.slice(0, 4).map(task => (
                  <p key={task.id} className="text-sm" style={{ color: 'var(--text-3)' }}>· {task.title}</p>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs italic pb-2" style={{ color: 'var(--text-4)' }}>
            &ldquo;Your ideas are safe. You do not have to carry them all today.&rdquo;
          </p>

        </div>
      </AppLayout>
    </div>
  )
}
