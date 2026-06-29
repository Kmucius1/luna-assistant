'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import {
  Briefcase, Clock, Check, AlertCircle,
  Loader2, Mail, Calendar, Users, RefreshCw, Zap,
  CheckSquare, CreditCard, BarChart2, Target, Lightbulb, Building2,
  FileText, ArrowUpDown,
} from 'lucide-react'
import Link from 'next/link'
import type { DryphubTask } from '@/lib/dryp-crm'

function dueDateLabel(dateStr?: string): { label: string; color: string; urgent: boolean } {
  if (!dateStr) return { label: '', color: 'rgba(255,255,255,0.3)', urgent: false }
  const d = new Date(dateStr); const now = new Date()
  const dDay = new Date(d); dDay.setHours(0,0,0,0)
  const today = new Date(now); today.setHours(0,0,0,0)
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return { label: 'Overdue',  color: '#E05E5E', urgent: true }
  if (diff === 0) return { label: 'Due today', color: '#E08B4A', urgent: true }
  if (diff === 1) return { label: 'Tomorrow',  color: '#C9A96E', urgent: false }
  return { label: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), color: 'rgba(255,255,255,0.3)', urgent: false }
}

const PO: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const sortPriority = (a: DryphubTask, b: DryphubTask) => (PO[a.priority ?? 'low'] ?? 3) - (PO[b.priority ?? 'low'] ?? 3)
const PRIORITY_COLORS: Record<string, string> = { critical: '#E05E5E', high: '#E08B4A', medium: '#8B6FB8', low: 'rgba(255,255,255,0.15)' }

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}
const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
}

const WORK_APPS = [
  {
    section: 'Inbox + Schedule', color: '#A8C4DA',
    apps: [
      { icon: Mail,         label: 'Email',     href: '/email',    color: '#A8C4DA', desc: 'Gmail inbox' },
      { icon: Calendar,     label: 'Calendar',  href: '/calendar', color: '#8AAEC8', desc: "Today's events" },
    ],
  },
  {
    section: 'Tasks + Clients', color: '#C4A9E8',
    apps: [
      { icon: CheckSquare,  label: 'Tasks',     href: '/tasks',    color: '#C4A9E8', desc: 'DRYP CRM tasks' },
      { icon: Users,        label: 'Clients',   href: '/dryp-hub', color: '#A890D0', desc: 'DRYP accounts' },
      { icon: Zap,          label: 'Outreach',  href: 'https://dryphub.com/outreach', color: '#9070B0', desc: 'CRM outreach', external: true },
      { icon: BarChart2,    label: 'Reports',   href: 'https://dryphub.com',           color: '#7050A0', desc: 'DRYP dashboard', external: true },
    ],
  },
  {
    section: 'Money', color: '#8AB88A',
    apps: [
      { icon: ArrowUpDown,  label: 'Transactions',  href: '/money/transactions',   color: '#8AB88A', desc: 'All spending' },
      { icon: CreditCard,   label: 'Subscriptions', href: '/money/subscriptions',  color: '#7AA87A', desc: 'Monthly bills' },
      { icon: FileText,     label: 'Bills',         href: '/money/bills',          color: '#C9A96E', desc: 'Upcoming due' },
      { icon: Lightbulb,    label: 'Insights',      href: '/money/insights',       color: '#C9A96E', desc: 'Spending intel' },
      { icon: Target,       label: 'Planning',      href: '/money/planning',       color: '#C9923A', desc: 'Budget goals' },
      { icon: Building2,    label: 'Bank',          href: '/money/connect',        color: '#6A8EA8', desc: 'Connect accounts' },
    ],
  },
]

function TaskRow({ task, done, onToggle }: { task: DryphubTask; done: boolean; onToggle: () => void }) {
  const due    = dueDateLabel(task.due_date)
  const pColor = PRIORITY_COLORS[task.priority ?? 'low']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: done ? 0.4 : 1 }}>
      <button onClick={onToggle} style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#8B6FB8' : 'transparent', border: done ? 'none' : '1.5px solid rgba(139,111,184,0.3)', cursor: 'pointer' }}>
        {done && <Check style={{ width: 12, height: 12, color: 'white' }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'white', lineHeight: 1.35, textDecoration: done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {task.account_name && <span style={{ fontSize: 11, color: 'rgba(168,196,218,0.7)', fontWeight: 600 }}>{task.account_name}</span>}
          {due.label && <span style={{ fontSize: 11, color: due.color, fontWeight: due.urgent ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>{due.urgent && <Clock style={{ width: 10, height: 10 }} />}{due.label}</span>}
        </div>
      </div>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
    </div>
  )
}

function AppCard({ icon: Icon, label, href, color, desc, external }: { icon: React.ElementType; label: string; href: string; color: string; desc: string; external?: boolean }) {
  const inner = (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '16px 8px 12px',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 18,
      cursor: 'pointer',
      textAlign: 'center',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 14,
        background: `${color}1A`,
        border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 20, height: 20, color }} strokeWidth={1.6} />
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.82)', lineHeight: 1.2 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, lineHeight: 1.2 }}>{desc}</p>
      </div>
    </div>
  )

  if (external) {
    return <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>{inner}</a>
  }
  return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
}

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
    ]).then(() => setLoading(false)).catch(() => { setError(true); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const activeTasks   = tasks.filter(t => t.status !== 'done' && !done.has(t.id))
  const highPriority  = activeTasks.filter(t => t.priority === 'critical' || t.priority === 'high').sort(sortPriority)
  const todayBoundary = new Date(); todayBoundary.setHours(0,0,0,0)
  const dueTodayTasks = activeTasks.filter(t => { if (!t.due_date) return false; const d = new Date(t.due_date); d.setHours(0,0,0,0); return d <= todayBoundary }).sort(sortPriority)

  const urgentTasks = [...highPriority.slice(0, 2), ...dueTodayTasks.filter(t => !highPriority.find(h => h.id === t.id)).slice(0, 2)]

  const overviewContent = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,196,218,0.12)', border: '1px solid rgba(168,196,218,0.2)' }}>
            <Briefcase style={{ width: 20, height: 20, color: '#A8C4DA' }} strokeWidth={1.6} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>Work</h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {loading ? 'Syncing…' : error ? "Couldn't reach DRYP" : `${activeTasks.length} open task${activeTasks.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : <RefreshCw style={{ width: 12, height: 12 }} />}
          Sync
        </button>
      </div>

      {(stats || loading) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Open',    value: loading ? '—' : String(stats?.openTasks ?? activeTasks.length), color: 'white' },
            { label: 'Today',   value: loading ? '—' : String(stats?.dueToday ?? 0),    color: (stats?.dueToday ?? 0) > 0 ? '#E08B4A' : 'white' },
            { label: 'Week',    value: loading ? '—' : String(stats?.dueThisWeek ?? 0), color: 'white' },
            { label: 'At-risk', value: loading ? '—' : String(stats?.atRiskCount ?? 0), color: (stats?.atRiskCount ?? 0) > 0 ? '#E05E5E' : 'white' },
          ].map(s => (
            <div key={s.label} style={{ ...GLASS, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div style={{ ...GLASS, padding: '14px 16px', display: 'flex', gap: 10, background: 'rgba(224,94,94,0.06)', border: '1px solid rgba(224,94,94,0.18)', marginBottom: 14 }}>
          <AlertCircle style={{ width: 18, height: 18, color: '#E05E5E', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>DRYP CRM unavailable</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Tasks couldn't load. Tap Sync to retry.</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div style={{ ...GLASS, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ ...LABEL, color: '#E08B4A99' }}>Needs attention</p>
            <Link href="/tasks" style={{ fontSize: 11, color: 'rgba(168,196,218,0.5)', textDecoration: 'none' }}>All tasks →</Link>
          </div>
          {urgentTasks.length > 0
            ? urgentTasks.map(task => (
                <TaskRow key={task.id} task={task} done={done.has(task.id)} onToggle={() => toggle(task.id)} />
              ))
            : (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>All clear — nothing urgent</p>
              </div>
            )
          }
        </div>
      )}
    </div>
  )

  const appsContent = (
    <div>
      {WORK_APPS.map(section => (
        <div key={section.section} style={{ marginBottom: 24 }}>
          <p style={{ ...LABEL, color: section.color + '80', marginBottom: 10 }}>{section.section}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {section.apps.map(app => (
              <AppCard key={app.href} {...app} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const workPages = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'apps',     label: 'Apps',     content: appsContent },
  ]

  return (
    <AppLayout noScroll className="pt-16">
      <CategoryPager pages={workPages} accentColor="#A8C4DA" />
    </AppLayout>
  )
}
