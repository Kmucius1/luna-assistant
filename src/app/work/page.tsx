'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
  Users,
  Zap,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import type { DryphubTask } from '@/lib/dryp-crm'
import type { CalendarEvent } from '@/lib/calendar'
import { isMickEvent } from '@/lib/calendarPeople'
import type { Task as LocalTask } from '@/types'

interface UnifiedTask extends DryphubTask { _local?: boolean }
interface NeedsAttentionEmail { id: string; from: string; subject: string; snippet: string; isPriority: boolean }
interface UpcomingBill {
  id: string
  name: string
  expected_amount: number | null
  minimum_amount: number | null
  days_until: number | null
  status?: string
}
interface ClientAccount {
  id: string
  business_name: string
  health_status: string
  client_pipeline_stage?: string
  monthly_retainer?: number
  updated_at?: string
}
interface MoneyDashboardData {
  safe_to_spend?: {
    safeToSpend: number
    dailySpendingAmount: number | null
    daysUntilNextConfirmedIncome: number | null
    safetyBuffer: number
  }
  subscription_alerts_count?: number
  duplicate_charges_count?: number
  unknown_transactions_count?: number
}

const SOURCE_LABEL: Record<string, string> = {
  message: 'LUNA chat', manual: 'Manual', brain_dump: 'Brain dump',
  dictation: 'Dictation', email: 'Email', calendar: 'Calendar', crm: 'CRM',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ff6b75', high: '#f1a35b', medium: '#b98bff', low: 'rgba(255,255,255,0.18)',
}
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const GLASS: React.CSSProperties = {
  background: 'linear-gradient(145deg, rgba(28,18,65,0.84), rgba(12,8,35,0.84))',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 24,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 18px 42px rgba(0,0,0,0.22)',
}
const LABEL: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#b98bff', margin: 0,
}

function localTaskToUnified(task: LocalTask): UnifiedTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.urgency_level,
    due_date: task.due_date,
    account_name: SOURCE_LABEL[task.source] ?? 'LUNA',
    created_at: task.created_at,
    updated_at: task.updated_at,
    _local: true,
  }
}

function startOfLocalDay(date = new Date()) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function isDueTodayOrEarlier(task: UnifiedTask) {
  if (!task.due_date) return false
  const due = startOfLocalDay(new Date(task.due_date))
  return due <= startOfLocalDay()
}

function sortTasks(a: UnifiedTask, b: UnifiedTask) {
  const priority = (PRIORITY_ORDER[a.priority ?? 'low'] ?? 3) - (PRIORITY_ORDER[b.priority ?? 'low'] ?? 3)
  if (priority !== 0) return priority
  if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  if (a.due_date) return -1
  if (b.due_date) return 1
  return 0
}

function dueLabel(task: UnifiedTask) {
  if (!task.due_date) return null
  const due = startOfLocalDay(new Date(task.due_date))
  const today = startOfLocalDay()
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0) return { text: 'Overdue', color: '#ff6b75' }
  if (diff === 0) return { text: 'Due today', color: '#f1a35b' }
  if (diff === 1) return { text: 'Tomorrow', color: '#d8ba78' }
  return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'rgba(255,255,255,0.38)' }
}

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'Not set'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function TaskItem({ task, done, onToggle }: { task: UnifiedTask; done: boolean; onToggle: () => void }) {
  const due = dueLabel(task)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.055)', opacity: done ? 0.42 : 1 }}>
      <button
        onClick={onToggle}
        aria-label={done ? 'Mark task open' : 'Mark task done'}
        style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', background: done ? '#9b5cff' : 'rgba(155,92,255,0.08)', border: done ? 'none' : '1.5px solid rgba(185,139,255,0.38)' }}
      >
        {done && <Check style={{ width: 13, height: 13, color: 'white' }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 650, lineHeight: 1.35, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: done ? 'line-through' : 'none' }}>{task.title}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', minWidth: 0 }}>
          {task.account_name && <span style={{ fontSize: 10.5, color: 'rgba(178,205,226,0.68)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.account_name}</span>}
          {due && <span style={{ fontSize: 10.5, color: due.color, fontWeight: 700, flexShrink: 0 }}>{due.text}</span>}
        </div>
      </div>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[task.priority ?? 'low'], flexShrink: 0 }} />
    </div>
  )
}

function EmptyState({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div style={{ minHeight: 150, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 22 }}>
      <div>
        <div style={{ width: 48, height: 48, borderRadius: 16, display: 'grid', placeItems: 'center', margin: '0 auto 10px', background: 'rgba(155,92,255,0.12)', border: '1px solid rgba(155,92,255,0.2)' }}>
          <Icon style={{ width: 21, height: 21, color: '#b98bff' }} strokeWidth={1.6} />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 750, color: 'white' }}>{title}</p>
        <p style={{ margin: '5px auto 0', maxWidth: 300, fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.38)' }}>{text}</p>
      </div>
    </div>
  )
}

function MiniAction({ href, icon: Icon, label, value, color = '#b98bff' }: { href: string; icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ ...GLASS, borderRadius: 20, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 66 }}>
        <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: `${color}17`, border: `1px solid ${color}30`, flexShrink: 0 }}>
          <Icon style={{ width: 18, height: 18, color }} strokeWidth={1.7} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>{label}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13.5, fontWeight: 750, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        </div>
      </div>
    </Link>
  )
}

function TodaySlide({
  tasks, done, onToggle, loading, error, onSync, events, eventsLoading, emails, bills, clients,
}: {
  tasks: UnifiedTask[]
  done: Set<string>
  onToggle: (id: string) => void
  loading: boolean
  error: boolean
  onSync: () => void
  events: CalendarEvent[]
  eventsLoading: boolean
  emails: NeedsAttentionEmail[]
  bills: UpcomingBill[]
  clients: ClientAccount[]
}) {
  const priorities = tasks.filter(t => t.status !== 'done' && !done.has(t.id)).sort(sortTasks).slice(0, 3)
  const nextEvent = events.find(e => e.isToday && !e.allDay) ?? events.find(e => e.isTomorrow && !e.allDay) ?? events[0]
  const atRisk = clients.filter(c => ['at_risk', 'churning'].includes(c.health_status)).length

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ ...GLASS, position: 'relative', overflow: 'hidden', padding: '19px 20px', background: 'linear-gradient(135deg, rgba(75,37,136,0.78), rgba(18,10,47,0.92))' }}>
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', right: -42, top: -74, background: 'radial-gradient(circle, rgba(190,139,255,0.34), transparent 68%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={LABEL}><Briefcase style={{ width: 11, height: 11 }} />Work today</div>
            <h1 style={{ margin: '7px 0 3px', fontSize: 24, lineHeight: 1.1, color: 'white', fontWeight: 850 }}>One clear lane.</h1>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.55)' }}>
              {loading ? 'Pulling your priorities together…' : `${priorities.length} priority${priorities.length === 1 ? '' : 'ies'} ready for focus.`}
            </p>
          </div>
          <button onClick={onSync} disabled={loading} aria-label="Refresh work data" style={{ width: 42, height: 42, borderRadius: 15, display: 'grid', placeItems: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', flexShrink: 0 }}>
            {loading ? <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} /> : <RefreshCw style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      </section>

      <section style={{ ...GLASS, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 15px 11px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={LABEL}><Target style={{ width: 10, height: 10 }} />Today&apos;s top 3</div>
          <Link href="/tasks" style={{ fontSize: 10.5, fontWeight: 700, color: '#b98bff', textDecoration: 'none' }}>All tasks →</Link>
        </div>
        {error && priorities.length === 0 ? (
          <EmptyState icon={AlertCircle} title="Some work data could not load" text="Your LUNA tasks are still safe. Refresh to retry the DRYP connection." />
        ) : priorities.length ? (
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {priorities.map(task => <TaskItem key={task.id} task={task} done={done.has(task.id)} onToggle={() => onToggle(task.id)} />)}
          </div>
        ) : (
          <EmptyState icon={Sparkles} title="Your priority lane is clear" text="Add one focused task instead of filling the space with busywork." />
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 10 }}>
        <div style={{ ...GLASS, borderRadius: 20, padding: '14px 15px', minHeight: 92 }}>
          <div style={LABEL}><Calendar style={{ width: 10, height: 10 }} />Next up</div>
          {eventsLoading ? (
            <div style={{ paddingTop: 13 }}><Loader2 className="animate-spin" style={{ width: 18, height: 18, color: '#b98bff' }} /></div>
          ) : nextEvent ? (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 780, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextEvent.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'rgba(255,255,255,0.44)' }}>{nextEvent.isTomorrow ? 'Tomorrow' : 'Today'} · {nextEvent.allDay ? 'All day' : nextEvent.startTime}</p>
            </div>
          ) : (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.36)' }}>No event is crowding your next move.</p>
          )}
        </div>
        <Link href="/tasks" style={{ textDecoration: 'none' }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '14px 15px', minHeight: 92, background: 'linear-gradient(145deg, rgba(55,27,90,0.9), rgba(18,10,42,0.9))' }}>
            <div style={LABEL}><Zap style={{ width: 10, height: 10 }} />Attention</div>
            <p style={{ margin: '9px 0 0', fontSize: 20, fontWeight: 850, color: 'white' }}>{emails.length + bills.length + atRisk}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.42)' }}>{emails.length} email · {bills.length} bill · {atRisk} client</p>
          </div>
        </Link>
      </section>
    </div>
  )
}

type TaskFilter = 'all' | 'today' | 'high'

function TasksSlide({ tasks, done, onToggle }: { tasks: UnifiedTask[]; done: Set<string>; onToggle: (id: string) => void }) {
  const [filter, setFilter] = useState<TaskFilter>('all')
  const visible = tasks
    .filter(t => t.status !== 'done' && !done.has(t.id))
    .filter(t => filter === 'all' || (filter === 'today' ? isDueTodayOrEarlier(t) : ['critical', 'high'].includes(t.priority ?? '')))
    .sort(sortTasks)

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ ...GLASS, padding: '16px 17px', background: 'linear-gradient(135deg, rgba(39,23,79,0.88), rgba(15,9,40,0.92))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={LABEL}><CheckSquare style={{ width: 10, height: 10 }} />Tasks</div>
            <p style={{ margin: '7px 0 0', fontSize: 20, fontWeight: 820, color: 'white' }}>{visible.length} open</p>
          </div>
          <Link href="/tasks?new=1" style={{ textDecoration: 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #7743ff, #a563ff)', boxShadow: '0 10px 24px rgba(123,70,255,0.35)' }}>
              <Plus style={{ width: 20, height: 20, color: 'white' }} />
            </div>
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 7, marginTop: 14 }}>
          {(['all', 'today', 'high'] as TaskFilter[]).map(item => (
            <button key={item} onClick={() => setFilter(item)} style={{ flex: 1, height: 36, borderRadius: 12, cursor: 'pointer', border: `1px solid ${filter === item ? 'rgba(185,139,255,0.42)' : 'rgba(255,255,255,0.07)'}`, background: filter === item ? 'rgba(155,92,255,0.18)' : 'rgba(255,255,255,0.035)', color: filter === item ? '#d0b0ff' : 'rgba(255,255,255,0.42)', fontSize: 11.5, fontWeight: 750, textTransform: 'capitalize' }}>{item === 'high' ? 'High priority' : item}</button>
          ))}
        </div>
      </section>

      <section style={{ ...GLASS, flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {visible.length ? (
          <div style={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
            {visible.map(task => <TaskItem key={task.id} task={task} done={done.has(task.id)} onToggle={() => onToggle(task.id)} />)}
          </div>
        ) : (
          <EmptyState icon={Check} title="Nothing in this lane" text="Switch the filter or add one task that deserves your attention." />
        )}
      </section>

      <Link href="/tasks" style={{ textDecoration: 'none' }}>
        <div style={{ borderRadius: 18, minHeight: 48, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #6b3dff, #9258ff)', boxShadow: '0 12px 28px rgba(107,61,255,0.30)' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>Open full task manager</span>
          <ArrowRight style={{ width: 16, height: 16, color: 'white' }} />
        </div>
      </Link>
    </div>
  )
}

function ClientsSlide({ clients, emails, loading }: { clients: ClientAccount[]; emails: NeedsAttentionEmail[]; loading: boolean }) {
  const sortedClients = [...clients].sort((a, b) => {
    const rank: Record<string, number> = { churning: 0, at_risk: 1, new: 2, active: 3, good: 4, excellent: 5 }
    return (rank[a.health_status] ?? 4) - (rank[b.health_status] ?? 4)
  })
  const focusClients = sortedClients.slice(0, 3)

  const statusColor = (status: string) => {
    if (status === 'churning') return '#ff6b75'
    if (status === 'at_risk') return '#f1a35b'
    if (status === 'new') return '#7ab8db'
    return '#7ed195'
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ ...GLASS, padding: '17px 18px', background: 'linear-gradient(135deg, rgba(57,27,105,0.88), rgba(14,9,39,0.94))' }}>
        <div style={LABEL}><Users style={{ width: 10, height: 10 }} />Clients & outreach</div>
        <h2 style={{ margin: '8px 0 4px', fontSize: 22, lineHeight: 1.1, fontWeight: 850, color: 'white' }}>Relationships before reports.</h2>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.46)' }}>See who needs attention, then choose one useful action.</p>
      </section>

      <section style={{ ...GLASS, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 15px 11px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={LABEL}><Building2 style={{ width: 10, height: 10 }} />Client focus</div>
          <Link href="/dryp-hub" style={{ fontSize: 10.5, fontWeight: 700, color: '#b98bff', textDecoration: 'none' }}>See all →</Link>
        </div>
        {loading ? (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><Loader2 className="animate-spin" style={{ width: 22, height: 22, color: '#b98bff' }} /></div>
        ) : focusClients.length ? (
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {focusClients.map(client => (
              <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: `${statusColor(client.health_status)}16`, border: `1px solid ${statusColor(client.health_status)}2b`, color: statusColor(client.health_status), fontWeight: 850, flexShrink: 0 }}>{client.business_name.slice(0, 1).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 750, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.business_name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.38)', textTransform: 'capitalize' }}>{client.client_pipeline_stage?.replaceAll('_', ' ') || client.health_status.replaceAll('_', ' ')}</p>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(client.health_status), flexShrink: 0 }} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Building2} title="Client data is not connected yet" text="Open DRYP Hub to check the CRM connection without cluttering this page." />
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MiniAction href="/email" icon={Inbox} label="Needs reply" value={`${emails.length} thread${emails.length === 1 ? '' : 's'}`} color="#8fc7e8" />
        <a href="https://dryphub.com/outreach" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <div style={{ ...GLASS, borderRadius: 20, padding: '13px 14px', minHeight: 66, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(185,139,255,0.14)', border: '1px solid rgba(185,139,255,0.28)' }}><Zap style={{ width: 18, height: 18, color: '#b98bff' }} /></div>
            <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>Pipeline</p><p style={{ margin: '2px 0 0', fontSize: 13.5, fontWeight: 750, color: 'white' }}>Open outreach</p></div>
            <ExternalLink style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.28)' }} />
          </div>
        </a>
      </section>
    </div>
  )
}

function MoneySlide({ money, bills, loading }: { money: MoneyDashboardData | null; bills: UpcomingBill[]; loading: boolean }) {
  const safe = money?.safe_to_spend
  const alerts = (money?.subscription_alerts_count ?? 0) + (money?.duplicate_charges_count ?? 0) + (money?.unknown_transactions_count ?? 0)

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <section style={{ ...GLASS, position: 'relative', overflow: 'hidden', padding: '19px 20px', background: 'linear-gradient(135deg, rgba(24,77,54,0.82), rgba(12,29,29,0.94))', border: '1px solid rgba(126,209,149,0.18)' }}>
        <div style={{ position: 'absolute', width: 180, height: 180, borderRadius: '50%', right: -55, top: -72, background: 'radial-gradient(circle, rgba(126,209,149,0.26), transparent 70%)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ ...LABEL, color: '#8fd6a3' }}><CircleDollarSign style={{ width: 11, height: 11 }} />Safe to spend</div>
          {loading ? (
            <Loader2 className="animate-spin" style={{ width: 25, height: 25, color: '#8fd6a3', marginTop: 17 }} />
          ) : (
            <>
              <p style={{ margin: '8px 0 2px', fontSize: 39, lineHeight: 1, fontWeight: 900, color: 'white' }}>{formatMoney(safe?.safeToSpend)}</p>
              <p style={{ margin: '8px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.46)' }}>
                {safe?.dailySpendingAmount != null && safe?.daysUntilNextConfirmedIncome != null
                  ? `${formatMoney(safe.dailySpendingAmount)} per day for ${safe.daysUntilNextConfirmedIncome} days`
                  : 'Calculated from imported statements, bills, reserves, and confirmed income.'}
              </p>
            </>
          )}
        </div>
      </section>

      <section style={{ ...GLASS, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 15px 11px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...LABEL, color: '#d8ba78' }}><CreditCard style={{ width: 10, height: 10 }} />Upcoming bills</div>
          <Link href="/money/bills" style={{ fontSize: 10.5, fontWeight: 700, color: '#d8ba78', textDecoration: 'none' }}>All bills →</Link>
        </div>
        {bills.length ? (
          <div style={{ overflowY: 'auto', minHeight: 0 }}>
            {bills.slice(0, 3).map(bill => {
              const amount = bill.expected_amount ?? bill.minimum_amount
              return (
                <Link key={bill.id} href="/money/bills" style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(216,186,120,0.12)', border: '1px solid rgba(216,186,120,0.22)' }}><FileText style={{ width: 17, height: 17, color: '#d8ba78' }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13.5, fontWeight: 740, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.name}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 10.5, color: bill.days_until != null && bill.days_until <= 1 ? '#f1a35b' : 'rgba(255,255,255,0.38)' }}>{bill.days_until === 0 ? 'Due today' : bill.days_until === 1 ? 'Due tomorrow' : bill.days_until != null ? `Due in ${bill.days_until} days` : 'Due date not set'}</p>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 780, color: '#d8ba78', flexShrink: 0 }}>{amount != null ? formatMoney(amount) : '—'}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={CreditCard} title="No upcoming bills are loaded" text="Upload the latest statements or add a bill manually so LUNA can warn you before it is due." />
        )}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 10 }}>
        <MiniAction href="/money/subscriptions" icon={AlertCircle} label="Money alerts" value={`${alerts} to review`} color="#f1a35b" />
        <Link href="/money/import" style={{ textDecoration: 'none' }}>
          <div style={{ minHeight: 66, borderRadius: 20, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #5d37d6, #8e55ff)', boxShadow: '0 12px 28px rgba(94,55,214,0.30)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)' }}><Upload style={{ width: 18, height: 18, color: 'white' }} /></div>
            <div style={{ flex: 1 }}><p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.68)' }}>Update LUNA</p><p style={{ margin: '2px 0 0', fontSize: 13.5, fontWeight: 800, color: 'white' }}>Import statement</p></div>
            <ChevronRight style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.68)' }} />
          </div>
        </Link>
      </section>
    </div>
  )
}

export default function WorkPage() {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [emails, setEmails] = useState<NeedsAttentionEmail[]>([])
  const [bills, setBills] = useState<UpcomingBill[]>([])
  const [clients, setClients] = useState<ClientAccount[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [money, setMoney] = useState<MoneyDashboardData | null>(null)
  const [moneyLoading, setMoneyLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    setError(false)

    Promise.allSettled([
      fetch('/api/dryp/tasks', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/tasks/prioritized', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([drypResult, localResult]) => {
      const drypTasks: UnifiedTask[] = drypResult.status === 'fulfilled' ? (drypResult.value.tasks ?? []) : []
      const localTasks: UnifiedTask[] = localResult.status === 'fulfilled'
        ? ((localResult.value.tasks ?? []) as LocalTask[]).map(localTaskToUnified)
        : []
      if (drypResult.status === 'rejected' || (drypResult.status === 'fulfilled' && drypResult.value.connected === false)) setError(true)
      setTasks([...drypTasks, ...localTasks])
    }).finally(() => setLoading(false))

    setEventsLoading(true)
    fetch('/api/calendar/upcoming?days=2', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setEvents((data.events ?? []).filter((event: CalendarEvent) => (event.isToday || event.isTomorrow) && !isMickEvent(event))))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false))

    fetch('/api/gmail/needs-attention', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setEmails(data.top ?? []))
      .catch(() => setEmails([]))

    fetch('/api/money/bills', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setBills((data.bills ?? []).filter((bill: UpcomingBill) => bill.days_until != null && bill.days_until <= 30 && bill.status !== 'paid')))
      .catch(() => setBills([]))

    setClientsLoading(true)
    fetch('/api/dryp/accounts', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setClients(data.accounts ?? []))
      .catch(() => setClients([]))
      .finally(() => setClientsLoading(false))

    setMoneyLoading(true)
    fetch('/api/money/dashboard', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setMoney(data.error ? null : data))
      .catch(() => setMoney(null))
      .finally(() => setMoneyLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function toggleTask(id: string) {
    const task = tasks.find(item => item.id === id)
    const markingDone = !done.has(id)
    setDone(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (task?._local && markingDone) {
      fetch('/api/tasks/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'done' }),
      }).catch(() => {})
    }
  }

  const activeTasks = useMemo(
    () => tasks.filter(task => task.status !== 'done' && !done.has(task.id)),
    [tasks, done],
  )

  const pages = [
    {
      id: 'today',
      label: 'Today',
      icon: Target,
      content: <TodaySlide tasks={activeTasks} done={done} onToggle={toggleTask} loading={loading} error={error} onSync={load} events={events} eventsLoading={eventsLoading} emails={emails} bills={bills} clients={clients} />,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      content: <TasksSlide tasks={activeTasks} done={done} onToggle={toggleTask} />,
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      content: <ClientsSlide clients={clients} emails={emails} loading={clientsLoading} />,
    },
    {
      id: 'money',
      label: 'Money',
      icon: BarChart3,
      content: <MoneySlide money={money} bills={bills} loading={moneyLoading} />,
    },
  ]

  return (
    <AppLayout noScroll>
      <CategoryPager pages={pages} accentColor="#9b5cff" hidePills pageNoScroll />
    </AppLayout>
  )
}
