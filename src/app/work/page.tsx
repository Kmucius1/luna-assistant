'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import {
  Briefcase, Clock, Check, AlertCircle,
  Loader2, Mail, Calendar, Users, RefreshCw, Zap,
  CheckSquare, CreditCard, BarChart2, Target, Lightbulb, Building2,
  FileText, ArrowUpDown, Plus, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import type { DryphubTask } from '@/lib/dryp-crm'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dueDateLabel(dateStr?: string): { label: string; color: string; urgent: boolean } {
  if (!dateStr) return { label: '', color: 'rgba(255,255,255,0.3)', urgent: false }
  const d = new Date(dateStr); const now = new Date()
  const dDay = new Date(d); dDay.setHours(0,0,0,0)
  const today = new Date(now); today.setHours(0,0,0,0)
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return { label: 'Overdue',   color: '#E05E5E', urgent: true }
  if (diff === 0) return { label: 'Due today',  color: '#E08B4A', urgent: true }
  if (diff === 1) return { label: 'Tomorrow',   color: '#C9A96E', urgent: false }
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'rgba(255,255,255,0.3)', urgent: false }
}

const PO: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const sortPriority = (a: DryphubTask, b: DryphubTask) => (PO[a.priority ?? 'low'] ?? 3) - (PO[b.priority ?? 'low'] ?? 3)
const PRIORITY_COLORS: Record<string, string> = {
  critical: '#E05E5E', high: '#E08B4A', medium: '#8B6FB8', low: 'rgba(255,255,255,0.15)',
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const G: React.CSSProperties = {
  background: 'rgba(20,12,50,0.68)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
}
const LBL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#8B6FB8',
  display: 'flex', alignItems: 'center', gap: 5,
  marginBottom: 8, flexShrink: 0,
}

// ─── Task row ────────────────────────────────────────────────────────────────
function TaskRow({ task, done, onToggle }: { task: DryphubTask; done: boolean; onToggle: () => void }) {
  const due    = dueDateLabel(task.due_date)
  const pColor = PRIORITY_COLORS[task.priority ?? 'low']
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      opacity: done ? 0.38 : 1, transition: 'opacity 0.2s',
    }}>
      <button onClick={onToggle} style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: done ? '#8B6FB8' : 'transparent',
        border: done ? 'none' : '1.5px solid rgba(139,111,184,0.3)',
        cursor: 'pointer',
      }}>
        {done && <Check style={{ width: 12, height: 12, color: 'white' }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.35,
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
        }}>{task.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {task.account_name && (
            <span style={{ fontSize: 11, color: 'rgba(168,196,218,0.65)', fontWeight: 600 }}>
              {task.account_name}
            </span>
          )}
          {due.label && (
            <span style={{ fontSize: 11, color: due.color, fontWeight: due.urgent ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>
              {due.urgent && <Clock style={{ width: 9, height: 9 }} />}{due.label}
            </span>
          )}
        </div>
      </div>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
    </div>
  )
}

// ─── App button ───────────────────────────────────────────────────────────────
function AppBtn({ icon: Icon, label, href, color, desc, external }: {
  icon: React.ElementType; label: string; href: string; color: string; desc: string; external?: boolean
}) {
  const inner = (
    <div style={{
      ...G, borderRadius: 18, padding: '14px 10px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      cursor: 'pointer', textAlign: 'center',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 13,
        background: `${color}1A`, border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 19, height: 19, color }} strokeWidth={1.6} />
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)', lineHeight: 1.2, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 2, lineHeight: 1.2 }}>{desc}</p>
      </div>
    </div>
  )
  if (external) return <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
  return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Today snapshot
// ─────────────────────────────────────────────────────────────────────────────
function Slide1({
  stats, loading, error, activeTasks, urgentTasks, done, onToggle, onSync,
}: {
  stats: { openTasks: number; dueToday: number; dueThisWeek: number; atRiskCount: number } | null
  loading: boolean; error: boolean
  activeTasks: DryphubTask[]; urgentTasks: DryphubTask[]
  done: Set<string>; onToggle: (id: string) => void; onSync: () => void
}) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,196,218,0.12)', border: '1px solid rgba(168,196,218,0.2)' }}>
            <Briefcase style={{ width: 18, height: 18, color: '#A8C4DA' }} strokeWidth={1.6} />
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: 'white', lineHeight: 1.1, margin: 0 }}>Work</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              {loading ? 'Syncing…' : error ? "Couldn't reach DRYP" : `${activeTasks.length} open task${activeTasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={onSync} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <RefreshCw style={{ width: 12, height: 12 }} />}
          Sync
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, flexShrink: 0 }}>
        {[
          { label: 'Open',    value: loading ? '—' : String(stats?.openTasks ?? activeTasks.length), color: 'white' },
          { label: 'Today',   value: loading ? '—' : String(stats?.dueToday ?? 0),    color: (stats?.dueToday ?? 0) > 0 ? '#E08B4A' : 'white' },
          { label: 'Week',    value: loading ? '—' : String(stats?.dueThisWeek ?? 0), color: 'white' },
          { label: 'At-risk', value: loading ? '—' : String(stats?.atRiskCount ?? 0), color: (stats?.atRiskCount ?? 0) > 0 ? '#E05E5E' : 'white' },
        ].map(s => (
          <div key={s.label} style={{ ...G, borderRadius: 14, padding: '10px 6px', textAlign: 'center' }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: 3 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Needs attention — flex:1, inner scroll */}
      <div style={{ ...G, borderRadius: 18, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={LBL}><Zap style={{ width: 9, height: 9 }} />Needs attention</div>
          <Link href="/tasks" style={{ fontSize: 11, color: 'rgba(168,196,218,0.5)', textDecoration: 'none', fontWeight: 600 }}>All tasks →</Link>
        </div>
        {error && !loading ? (
          <div style={{ padding: '16px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#E05E5E', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>DRYP CRM unavailable — tap Sync to retry.</p>
          </div>
        ) : loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 style={{ width: 22, height: 22, color: 'rgba(139,111,184,0.45)' }} className="animate-spin" />
          </div>
        ) : urgentTasks.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {urgentTasks.map(t => (
              <TaskRow key={t.id} task={t} done={done.has(t.id)} onToggle={() => onToggle(t.id)} />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>All clear — nothing urgent today</p>
          </div>
        )}
      </div>

      {/* Quick: Email + Calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        <Link href="/email" style={{ textDecoration: 'none' }}>
          <div style={{ ...G, borderRadius: 16, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail style={{ width: 18, height: 18, color: '#A8C4DA', flexShrink: 0 }} strokeWidth={1.5} />
            <div><p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Email</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', margin: 0 }}>Gmail inbox</p></div>
          </div>
        </Link>
        <Link href="/calendar" style={{ textDecoration: 'none' }}>
          <div style={{ ...G, borderRadius: 16, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar style={{ width: 18, height: 18, color: '#8AAEC8', flexShrink: 0 }} strokeWidth={1.5} />
            <div><p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Calendar</p><p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', margin: 0 }}>Today's events</p></div>
          </div>
        </Link>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — Full task list
// ─────────────────────────────────────────────────────────────────────────────
type Filter = 'all' | 'critical' | 'high' | 'today'

function Slide2({
  tasks, done, onToggle,
}: {
  tasks: DryphubTask[]; done: Set<string>; onToggle: (id: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const todayBoundary = new Date(); todayBoundary.setHours(0,0,0,0)

  const filtered = tasks
    .filter(t => t.status !== 'done' && !done.has(t.id))
    .filter(t => {
      if (filter === 'critical') return t.priority === 'critical'
      if (filter === 'high')     return t.priority === 'high' || t.priority === 'critical'
      if (filter === 'today') {
        if (!t.due_date) return false
        const d = new Date(t.due_date); d.setHours(0,0,0,0)
        return d <= todayBoundary
      }
      return true
    })
    .sort(sortPriority)

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all',      label: 'All' },
    { id: 'critical', label: '🔴 Critical' },
    { id: 'high',     label: '🟠 High' },
    { id: 'today',    label: '📅 Due today' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Filter pills + new task */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ flex: 1, display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${filter === f.id ? 'rgba(139,111,184,0.45)' : 'rgba(255,255,255,0.09)'}`, background: filter === f.id ? 'rgba(139,111,184,0.16)' : 'rgba(255,255,255,0.04)', color: filter === f.id ? '#C4A9E8' : 'rgba(255,255,255,0.40)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>
        <Link href="/tasks?new=1" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(139,111,184,0.18)', border: '1px solid rgba(139,111,184,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus style={{ width: 16, height: 16, color: '#C4A9E8' }} strokeWidth={2} />
          </div>
        </Link>
      </div>

      {/* Task list */}
      <div style={{ ...G, flex: 1, minHeight: 0, borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={LBL}><CheckSquare style={{ width: 9, height: 9 }} />{filtered.length} task{filtered.length !== 1 ? 's' : ''} {filter !== 'all' ? `· ${FILTERS.find(f => f.id === filter)?.label}` : ''}</div>
        </div>
        {filtered.length > 0 ? (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {filtered.map(t => (
              <TaskRow key={t.id} task={t} done={done.has(t.id)} onToggle={() => onToggle(t.id)} />
            ))}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              {filter === 'all' ? 'No open tasks — you\'re clear' : 'Nothing in this filter right now'}
            </p>
          </div>
        )}
      </div>

      {/* View in DRYP Hub */}
      <a href="https://dryphub.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ ...G, borderRadius: 16, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(168,196,218,0.06)', border: '1px solid rgba(168,196,218,0.14)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#A8C4DA' }}>Open DRYP Hub →</span>
          <ExternalLink style={{ width: 14, height: 14, color: 'rgba(168,196,218,0.45)' }} />
        </div>
      </a>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — DRYP / Clients
// ─────────────────────────────────────────────────────────────────────────────
function Slide3() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Header */}
      <div style={{ ...G, borderRadius: 18, padding: '12px 14px', flexShrink: 0, background: 'linear-gradient(140deg, rgba(40,22,80,0.78) 0%, rgba(16,8,44,0.88) 100%)', border: '1px solid rgba(168,196,218,0.14)' }}>
        <div style={LBL}><Users style={{ width: 9, height: 9 }} />DRYP Digital · CRM</div>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: '0 0 3px' }}>Clients & Outreach</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', margin: 0 }}>Your agency work, campaigns, and client relationships.</p>
      </div>

      {/* Primary CRM apps — 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, flexShrink: 0 }}>
        <AppBtn icon={Building2}   label="DRYP Hub"   href="https://dryphub.com"             color="#C4A9E8" desc="CRM dashboard"    external />
        <AppBtn icon={Users}       label="Clients"    href="/dryp-hub"                       color="#A890D0" desc="Account list"              />
        <AppBtn icon={Zap}         label="Outreach"   href="https://dryphub.com/outreach"    color="#9070B0" desc="Contact pipeline" external />
        <AppBtn icon={BarChart2}   label="Reports"    href="https://dryphub.com"             color="#7050A0" desc="Performance"      external />
      </div>

      {/* Secondary links — flex:1 spacer card */}
      <div style={{ ...G, borderRadius: 18, padding: '12px 14px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={LBL}><Briefcase style={{ width: 9, height: 9 }} />Also in Work</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {[
            { icon: Mail,         label: 'Email',      desc: 'Gmail inbox',         href: '/email',      color: '#A8C4DA' },
            { icon: Calendar,     label: 'Calendar',   desc: "Today's events",      href: '/calendar',   color: '#8AAEC8' },
            { icon: CheckSquare,  label: 'Tasks',      desc: 'Open task list',      href: '/tasks',      color: '#C4A9E8' },
            { icon: Target,       label: 'Work Overview', desc: 'Dashboard',         href: '/work',       color: '#8B6FB8' },
          ].map(({ icon: Icon, label, desc, href, color }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: 15, height: 15, color }} strokeWidth={1.6} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.80)', margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.30)', margin: 0 }}>{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — Money tools
// ─────────────────────────────────────────────────────────────────────────────
const MONEY_APPS = [
  { icon: ArrowUpDown, label: 'Transactions',  href: '/money/transactions',  color: '#8AB88A', desc: 'All spending'    },
  { icon: CreditCard,  label: 'Subscriptions', href: '/money/subscriptions', color: '#7AA87A', desc: 'Monthly bills'   },
  { icon: FileText,    label: 'Bills',          href: '/money/bills',         color: '#C9A96E', desc: 'Upcoming due'   },
  { icon: Lightbulb,   label: 'Insights',       href: '/money/insights',      color: '#C9A96E', desc: 'Spending intel' },
  { icon: Target,      label: 'Planning',       href: '/money/planning',      color: '#C9923A', desc: 'Budget goals'   },
  { icon: Building2,   label: 'Connect Bank',   href: '/money/connect',       color: '#6A8EA8', desc: 'Link accounts'  },
]

function Slide4() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Header card */}
      <div style={{ ...G, borderRadius: 18, padding: '12px 14px', flexShrink: 0, background: 'linear-gradient(140deg, rgba(20,44,20,0.72) 0%, rgba(12,28,12,0.85) 100%)', border: '1px solid rgba(138,184,138,0.16)' }}>
        <div style={LBL}><BarChart2 style={{ width: 9, height: 9 }} />Money</div>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'white', margin: '0 0 3px' }}>Financial Overview</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', margin: 0 }}>Track spending, bills, subscriptions, and plan ahead.</p>
      </div>

      {/* Money apps grid — flex:1 so it fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 1fr)', gap: 7 }}>
        {MONEY_APPS.map(app => (
          <AppBtn key={app.href} {...app} />
        ))}
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkPage() {
  const [tasks,   setTasks]   = useState<DryphubTask[]>([])
  const [stats,   setStats]   = useState<{ openTasks: number; dueToday: number; dueThisWeek: number; atRiskCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [done,    setDone]    = useState<Set<string>>(new Set())

  const load = useCallback(() => {
    setLoading(true); setError(false)
    Promise.allSettled([
      fetch('/api/dryp/tasks').then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks) }),
      fetch('/api/dryp/stats').then(r => r.json()).then(s => { if (s.connected) setStats(s) }),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const activeTasks = tasks.filter(t => t.status !== 'done' && !done.has(t.id))
  const todayBoundary = new Date(); todayBoundary.setHours(0,0,0,0)
  const highPriority  = activeTasks.filter(t => t.priority === 'critical' || t.priority === 'high').sort(sortPriority)
  const dueTodayTasks = activeTasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date); d.setHours(0,0,0,0)
    return d <= todayBoundary
  }).sort(sortPriority)
  const urgentTasks = [
    ...highPriority.slice(0, 3),
    ...dueTodayTasks.filter(t => !highPriority.find(h => h.id === t.id)).slice(0, 2),
  ]

  const pages = [
    {
      id: 'today', label: 'Today', noScroll: true,
      content: (
        <Slide1
          stats={stats} loading={loading} error={error}
          activeTasks={activeTasks} urgentTasks={urgentTasks}
          done={done} onToggle={toggle} onSync={load}
        />
      ),
    },
    {
      id: 'tasks', label: 'Tasks', noScroll: true,
      content: <Slide2 tasks={tasks} done={done} onToggle={toggle} />,
    },
    {
      id: 'clients', label: 'Clients', noScroll: true,
      content: <Slide3 />,
    },
    {
      id: 'money', label: 'Money', noScroll: true,
      content: <Slide4 />,
    },
  ]

  return (
    <AppLayout noScroll>
      <CategoryPager pages={pages} hidePills accentColor="#A8C4DA" />
    </AppLayout>
  )
}
