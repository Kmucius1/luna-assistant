'use client'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { CategoryPager } from '@/components/ui/CategoryPager'
import { Briefcase, Clock, ExternalLink, Check, RefreshCw, AlertCircle, ChevronRight, Loader2, Mail, Calendar, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'
import type { DryphubTask } from '@/lib/dryp-crm'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dueDateLabel(dateStr?: string): { label: string; color: string; urgent: boolean } {
  if (!dateStr) return { label: '', color: 'rgba(255,255,255,0.3)', urgent: false }
  const d = new Date(dateStr); const now = new Date()
  const dDay = new Date(d); dDay.setHours(0,0,0,0)
  const today = new Date(now); today.setHours(0,0,0,0)
  const diff = Math.round((dDay.getTime() - today.getTime()) / 86_400_000)
  if (diff < 0)   return { label: `Overdue (${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})})`, color: '#E05E5E', urgent: true }
  if (diff === 0) return { label: 'Due today',    color: '#E08B4A', urgent: true }
  if (diff === 1) return { label: 'Due tomorrow', color: '#C9A96E', urgent: false }
  if (diff <= 7)  return { label: `Due ${d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}`, color: 'rgba(255,255,255,0.5)', urgent: false }
  return { label: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), color: 'rgba(255,255,255,0.3)', urgent: false }
}

const PO: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const sortPriority = (a: DryphubTask, b: DryphubTask) => (PO[a.priority ?? 'low'] ?? 3) - (PO[b.priority ?? 'low'] ?? 3)
const PRIORITY_COLORS: Record<string, string> = { critical: '#E05E5E', high: '#E08B4A', medium: '#8B6FB8', low: 'rgba(255,255,255,0.2)' }
const STATUS_LABELS: Record<string, string> = { not_started: 'Not started', todo: 'To-do', in_progress: 'In progress', waiting_client: 'Waiting on client' }

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, done, onToggle }: { task: DryphubTask; done: boolean; onToggle: () => void }) {
  const due    = dueDateLabel(task.due_date)
  const pColor = PRIORITY_COLORS[task.priority ?? 'low']
  return (
    <div style={{ ...GLASS, padding: '14px 16px', opacity: done ? 0.4 : 1, transition: 'opacity 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button onClick={onToggle} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#8B6FB8' : 'transparent', border: done ? 'none' : '1.5px solid rgba(139,111,184,0.3)', cursor: 'pointer' }}>
          {done && <Check className="h-3.5 w-3.5" style={{ color: 'white' }} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.4, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {task.account_name && <span style={{ fontSize: 11, color: 'rgba(168,196,218,0.85)', fontWeight: 600 }}>{task.account_name}</span>}
            {due.label && <span style={{ fontSize: 11, color: due.color, fontWeight: due.urgent ? 700 : 400, display: 'flex', alignItems: 'center', gap: 3 }}>{due.urgent && <Clock className="h-3 w-3" />}{due.label}</span>}
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{STATUS_LABELS[task.status] ?? task.status}</span>
          </div>
          {task.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 5, lineHeight: 1.5 }}>{task.description}</p>}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: pColor, flexShrink: 0, marginTop: 6 }} />
      </div>
    </div>
  )
}

function SectionLabel({ text, count, accent = 'rgba(255,255,255,0.3)' }: { text: string; count?: number; accent?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>{text}</p>
      {count !== undefined && <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: `${accent}22`, borderRadius: 6, padding: '1px 6px' }}>{count}</span>}
    </div>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────
type WorkTab = 'command' | 'calendar' | 'email' | 'tasks' | 'clients' | 'money'
const WORK_TABS: { id: WorkTab; label: string }[] = [
  { id: 'command',  label: '⚡ Command'  },
  { id: 'calendar', label: '📅 Calendar' },
  { id: 'email',    label: '✉️ Email'    },
  { id: 'tasks',    label: '✅ Tasks'    },
  { id: 'clients',  label: '👥 Clients'  },
  { id: 'money',    label: '💰 Money'    },
]

type TaskFilter = 'today' | 'all' | 'by-client'

// ─── TAB: COMMAND ─────────────────────────────────────────────────────────────
function TabCommand({ tasks, stats, loading }: { tasks: DryphubTask[]; stats: { openTasks: number; dueToday: number; dueThisWeek: number; atRiskCount: number }|null; loading: boolean }) {
  const allActive    = tasks.filter(t => t.status !== 'done')
  const highPriority = allActive.filter(t => t.priority === 'critical' || t.priority === 'high')
  const todayBoundary = new Date(); todayBoundary.setHours(0,0,0,0)
  const todayTasks = allActive.filter(t => { if (!t.due_date) return false; const d = new Date(t.due_date); d.setHours(0,0,0,0); return d <= todayBoundary })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats */}
      {stats && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: 'Open',      value: stats.openTasks,   color: 'white' },
            { label: 'Today',     value: stats.dueToday,    color: stats.dueToday > 0 ? '#E08B4A' : 'white' },
            { label: 'This week', value: stats.dueThisWeek, color: 'white' },
            { label: 'At-risk',   value: stats.atRiskCount, color: stats.atRiskCount > 0 ? '#E05E5E' : 'white' },
          ].map(s => (
            <div key={s.label} style={{ ...GLASS, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top priorities */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[1,2,3].map(i => <div key={i} style={{ ...GLASS, height: 60, background: 'rgba(255,255,255,0.04)' }} />)}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {highPriority.length > 0 && (
            <>
              <SectionLabel text="High Priority" count={highPriority.length} accent="#E08B4A" />
              {highPriority.slice(0, 3).map(t => (
                <div key={t.id} style={{ ...GLASS, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[t.priority ?? 'low'], flexShrink: 0 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'white', flex: 1 }}>{t.title}</p>
                    {t.account_name && <span style={{ fontSize: 11, color: 'rgba(168,196,218,0.7)', fontWeight: 600 }}>{t.account_name}</span>}
                  </div>
                </div>
              ))}
            </>
          )}
          {todayTasks.length > 0 && (
            <>
              <SectionLabel text="Due Today" count={todayTasks.length} accent="#A8C4DA" />
              {todayTasks.slice(0, 3).map(t => (
                <div key={t.id} style={{ ...GLASS, padding: '12px 16px' }}>
                  <p style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{t.title}</p>
                  {t.account_name && <p style={{ fontSize: 11, color: 'rgba(168,196,218,0.6)', marginTop: 4 }}>{t.account_name}</p>}
                </div>
              ))}
            </>
          )}
          {highPriority.length === 0 && todayTasks.length === 0 && (
            <div style={{ ...GLASS, padding: '28px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>All clear 🌙</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No high-priority or due-today tasks. Well done.</p>
            </div>
          )}
        </div>
      )}

      {/* DRYP CRM links */}
      <div style={{ background: 'rgba(201,169,110,0.05)', border: '1px solid rgba(201,169,110,0.13)', borderRadius: 16, padding: '12px 14px' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.55)', marginBottom: 10 }}>Open in DRYP CRM</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['My Tasks','https://dryphub.com/tasks'],['Clients','https://dryphub.com/accounts'],['Outreach','https://dryphub.com/outreach'],['Dashboard','https://dryphub.com']].map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.15)', color: 'rgba(201,169,110,0.8)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              {label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── TAB: CALENDAR ────────────────────────────────────────────────────────────
function TabCalendar() {
  const [events, setEvents] = useState<Array<{ id: string; title: string; startTime: string; calendar: string; allDay: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/calendar/today').then(r => r.json())
      .then(d => setEvents(d.events ?? [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const CAL_DOTS = ['#8B6FB8','#5A8AA4','#6A8A5A','#C9A96E','#C96B5A']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...GLASS, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Calendar className="h-4 w-4" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(168,196,218,0.65)' }}>Today's Schedule</span>
          </div>
          <Link href="/calendar" style={{ fontSize: 11, color: 'rgba(168,196,218,0.5)', textDecoration: 'none' }}>View all →</Link>
        </div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => <div key={i} style={{ height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.05)' }} />)}</div>
        ) : events.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', lineHeight: 1.6 }}>No events today — connect Google Calendar in Settings to see your schedule here.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((ev, i) => (
              <div key={ev.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: CAL_DOTS[i % CAL_DOTS.length], flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'white', lineHeight: 1.3 }}>{ev.title}</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{ev.allDay ? 'All day' : ev.startTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Google Calendar settings</span>
        <Link href="/settings" style={{ fontSize: 12, color: 'rgba(168,196,218,0.6)', textDecoration: 'none' }}>Configure →</Link>
      </div>
    </div>
  )
}

// ─── TAB: EMAIL ───────────────────────────────────────────────────────────────
function TabEmail() {
  const [status, setStatus] = useState<{ connected: boolean; unread: number|null; needsReply: number|null; starred: number|null }>({ connected: false, unread: null, needsReply: null, starred: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gmail/status').then(r => r.json())
      .then(d => setStatus(d)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...GLASS, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <Mail className="h-4 w-4" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(168,196,218,0.65)' }}>Email Overview</span>
        </div>
        {!status.connected && !loading ? (
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 14 }}>Connect Gmail to see your inbox summary here — unread count, threads that need replies, and starred messages.</p>
            <Link href="/email">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: 'rgba(168,196,218,0.12)', border: '1px solid rgba(168,196,218,0.25)', color: '#A8C4DA', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Connect Gmail →
              </div>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Needs Reply', value: status.needsReply, color: '#C96B5A', urgent: (status.needsReply ?? 0) > 0 },
              { label: 'Starred',     value: status.starred,    color: '#C9A96E', urgent: false },
              { label: 'Unread',      value: status.unread,     color: 'rgba(255,255,255,0.55)', urgent: false },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${r.urgent ? 'rgba(201,107,90,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{r.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: r.color }}>{loading ? '—' : r.value === null ? '—' : r.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Link href="/email" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Open full email inbox</span>
          <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
        </div>
      </Link>
    </div>
  )
}

// ─── TAB: TASKS (DRYPHub) ────────────────────────────────────────────────────
function TabTasks({ tasks, stats, loading, error, done, toggle, onSync, tab, setTab }: {
  tasks: DryphubTask[]; stats: { openTasks: number; dueToday: number; dueThisWeek: number; atRiskCount: number }|null
  loading: boolean; error: boolean; done: Set<string>; toggle: (id: string) => void; onSync: () => void
  tab: TaskFilter; setTab: (t: TaskFilter) => void
}) {
  const todayBoundary = new Date(); todayBoundary.setHours(0,0,0,0)
  const weekBoundary  = new Date(todayBoundary.getTime() + 7 * 86_400_000)
  const todayTasks    = tasks.filter(t => { if (!t.due_date) return false; const d = new Date(t.due_date); d.setHours(0,0,0,0); return d <= todayBoundary })
  const upcomingTasks = tasks.filter(t => { if (!t.due_date) return false; const d = new Date(t.due_date); d.setHours(0,0,0,0); return d > todayBoundary && d <= weekBoundary })
  const laterTasks    = tasks.filter(t => { if (!t.due_date) return false; const d = new Date(t.due_date); d.setHours(0,0,0,0); return d > weekBoundary })
  const noDueTasks    = tasks.filter(t => !t.due_date)
  const byClient      = tasks.reduce<Record<string, DryphubTask[]>>((acc, t) => { const k = t.account_name ?? '— No client'; acc[k] = acc[k] ?? []; acc[k].push(t); return acc }, {})
  const clientsSorted = Object.entries(byClient).sort((a, b) => b[1].length - a[1].length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Sync button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onSync} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync DRYP
        </button>
      </div>

      {error && !loading && (
        <div style={{ ...GLASS, padding: '14px 16px', display: 'flex', gap: 12, background: 'rgba(224,94,94,0.06)', border: '1px solid rgba(224,94,94,0.18)' }}>
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#E05E5E' }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>DRYP CRM unavailable</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Open dryphub.com directly, or tap Sync to retry.</p>
          </div>
        </div>
      )}

      {loading && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3,4].map(i => <div key={i} style={{ ...GLASS, height: 72, background: 'rgba(255,255,255,0.04)' }} />)}</div>}

      {!loading && !error && tasks.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['today','all','by-client'] as TaskFilter[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: tab === t ? 'rgba(168,196,218,0.14)' : 'transparent', border: tab === t ? '1px solid rgba(168,196,218,0.28)' : '1px solid rgba(255,255,255,0.07)', color: tab === t ? 'var(--lunar, #A8C4DA)' : 'rgba(255,255,255,0.4)' }}>
                {t === 'today' ? 'Today' : t === 'all' ? 'All Tasks' : 'By Client'}
              </button>
            ))}
          </div>

          {tab === 'today' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayTasks.length === 0 ? <div style={{ ...GLASS, padding: 20, textAlign: 'center' }}><p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Nothing overdue or due today 🎉</p></div>
                : <>{<SectionLabel text="Today & Overdue" count={todayTasks.length} accent="#E08B4A" />}{todayTasks.sort(sortPriority).map(t => <TaskCard key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggle(t.id)} />)}</>}
              {upcomingTasks.length > 0 && <div style={{ marginTop: 4 }}><SectionLabel text="Coming up this week" count={upcomingTasks.length} /><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{upcomingTasks.sort(sortPriority).map(t => <TaskCard key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggle(t.id)} />)}</div></div>}
            </div>
          )}

          {tab === 'all' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[{ label: 'Overdue & Today', tasks: todayTasks, accent: '#E08B4A' },{ label: 'This week', tasks: upcomingTasks, accent: '#C9A96E' },{ label: 'Later', tasks: laterTasks, accent: 'rgba(255,255,255,0.35)' },{ label: 'No due date', tasks: noDueTasks, accent: 'rgba(255,255,255,0.2)' }].filter(g => g.tasks.length > 0).map(group => (
                <div key={group.label}><SectionLabel text={group.label} count={group.tasks.length} accent={group.accent} /><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{group.tasks.sort(sortPriority).map(t => <TaskCard key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggle(t.id)} />)}</div></div>
              ))}
            </div>
          )}

          {tab === 'by-client' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {clientsSorted.map(([client, cTasks]) => (
                <div key={client}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(168,196,218,0.85)', letterSpacing: '0.04em' }}>{client}</p>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{cTasks.filter(t => !done.has(t.id)).length} open</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{cTasks.sort(sortPriority).map(t => <TaskCard key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggle(t.id)} />)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div style={{ ...GLASS, padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>All clear 🌙</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No open tasks in DRYP CRM.</p>
        </div>
      )}
    </div>
  )
}

// ─── TAB: CLIENTS ─────────────────────────────────────────────────────────────
function TabClients() {
  const CLIENTS = [
    { name: 'Babe Coffee Lounge',   status: 'Active',   color: '#8AB88A', note: 'Social media management'     },
    { name: "Flanagan's Irish Pub", status: 'Active',   color: '#8AB88A', note: 'Events + digital presence'   },
    { name: 'Villa Residential',    status: 'Active',   color: '#8AB88A', note: 'Real estate marketing'       },
    { name: 'Hoover Digital',       status: 'Waiting',  color: '#C9A96E', note: 'Waiting on content'          },
    { name: 'Linked Up',            status: 'Active',   color: '#8AB88A', note: 'LinkedIn content strategy'   },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <Users className="h-4 w-4" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(168,196,218,0.65)' }}>Active Clients</span>
      </div>
      {CLIENTS.map(c => (
        <div key={c.name} style={{ ...GLASS, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{c.name}</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.color, background: `${c.color}18`, padding: '2px 8px', borderRadius: 6 }}>{c.status}</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{c.note}</p>
        </div>
      ))}
      <a href="https://dryphub.com/accounts" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>View all in DRYP CRM</span>
          <ExternalLink className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
        </div>
      </a>
    </div>
  )
}

// ─── TAB: MONEY ───────────────────────────────────────────────────────────────
function TabMoney() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <DollarSign className="h-4 w-4" style={{ color: '#8AB88A' }} strokeWidth={1.6} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(138,184,138,0.65)' }}>Money + Business</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Transactions', href: '/money/transactions', emoji: '📊' },
          { label: 'Subscriptions', href: '/money/subscriptions', emoji: '🔁' },
          { label: 'Bills',         href: '/money/bills',         emoji: '📋' },
          { label: 'Insights',      href: '/money/insights',      emoji: '💡' },
          { label: 'Planning',      href: '/money/planning',      emoji: '🎯' },
          { label: 'Bank Connect',  href: '/money/connect',       emoji: '🏦' },
        ].map(item => (
          <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{ ...GLASS, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderRadius: 16 }}>
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/money" style={{ textDecoration: 'none' }}>
        <div style={{ ...GLASS, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Full Money Dashboard</span>
          <ChevronRight className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
        </div>
      </Link>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function WorkPage() {
  const [activeTab, setActiveTab] = useState<WorkTab>('command')
  const [tasks,   setTasks]   = useState<DryphubTask[]>([])
  const [stats,   setStats]   = useState<{ openTasks: number; dueToday: number; dueThisWeek: number; atRiskCount: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [done,    setDone]    = useState<Set<string>>(new Set())
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('today')

  const load = useCallback(() => {
    setLoading(true); setError(false)
    fetch('/api/dryp/tasks').then(r => r.json()).then(d => { if (d.tasks) setTasks(d.tasks) }).catch(() => setError(true))
    fetch('/api/dryp/stats').then(r => r.json()).then(s => { if (s.connected) setStats(s) }).catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setDone(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const workPages = [
    { id: 'command',  label: '⚡ Command',  content: <TabCommand tasks={tasks} stats={stats} loading={loading} /> },
    { id: 'calendar', label: '📅 Calendar', content: <TabCalendar /> },
    { id: 'email',    label: '✉️ Email',    content: <TabEmail /> },
    { id: 'tasks',    label: '✅ Tasks',    content: <TabTasks tasks={tasks} stats={stats} loading={loading} error={error} done={done} toggle={toggle} onSync={load} tab={taskFilter} setTab={setTaskFilter} /> },
    { id: 'clients',  label: '👥 Clients',  content: <TabClients /> },
    { id: 'money',    label: '💰 Money',    content: <TabMoney /> },
  ]

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, paddingTop: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(168,196,218,0.12)', border: '1px solid rgba(168,196,218,0.2)' }}>
          <Briefcase className="h-5 w-5" style={{ color: '#A8C4DA' }} strokeWidth={1.6} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'white' }}>Work</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {loading ? 'Syncing…' : error ? 'Couldn\'t reach DRYP CRM' : `${tasks.filter(t => !done.has(t.id)).length} open tasks`}
          </p>
        </div>
      </div>

      <CategoryPager pages={workPages} accentColor="#A8C4DA" />
    </AppLayout>
  )
}
