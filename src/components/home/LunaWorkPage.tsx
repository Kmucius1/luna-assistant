'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  FolderOpen,
  Pause,
  PenLine,
  Play,
  Target,
  Trophy,
  User,
  Users,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import styles from './LunaWorkPage.module.css'

interface LocalTask { id: string; title: string; due_date?: string | null; urgency_level?: string; client_name?: string; status?: string }
interface DrypTask { id: string; title: string; due_date?: string | null; priority?: string; account_name?: string; status?: string }
interface DrypAccount { id: string; business_name: string; health_status?: string; projects_count?: number }
interface DayPlanBlock { time: string; label: string; detail?: string; emoji?: string }
interface JournalEntry { id: string; content: string; created_at: string }

type UnifiedTask = { id: string; title: string; meta?: string; time?: string; done: boolean; source: 'local' | 'dryp' }

const TIMER_PRESET_SECONDS = 45 * 60
const FOCUS_MINUTES_KEY = 'luna_work_focus_minutes_v1'
const LATER_KEY = 'luna_work_later_v1'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function healthClass(status?: string): string {
  const key = (status ?? 'new').toLowerCase()
  if (key === 'at_risk') return styles.healthAt_risk
  if (key === 'churning') return styles.healthChurning
  if (key === 'excellent' || key === 'good') return styles.healthGood
  return styles.healthNew
}

function healthLabel(status?: string): string {
  if (!status) return 'New'
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 4)
}

export function LunaWorkPage() {
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([])
  const [drypTasks, setDrypTasks] = useState<DrypTask[]>([])
  const [accounts, setAccounts] = useState<DrypAccount[]>([])
  const [agenda, setAgenda] = useState<DayPlanBlock[] | null>(null)
  const [note, setNote] = useState<JournalEntry | null>(null)
  const [completedToday, setCompletedToday] = useState(0)

  const [timerSeconds, setTimerSeconds] = useState(TIMER_PRESET_SECONDS)
  const [timerRunning, setTimerRunning] = useState(false)
  const [focusMinutesToday, setFocusMinutesToday] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/tasks/prioritized', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setLocalTasks(data.tasks ?? []))
      .catch(() => setLocalTasks([]))

    fetch('/api/dryp/tasks', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setDrypTasks(data.tasks ?? []))
      .catch(() => setDrypTasks([]))

    fetch('/api/dryp/accounts', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setAccounts(data.accounts ?? []))
      .catch(() => setAccounts([]))

    fetch('/api/home/day-plan', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setAgenda(data?.plan?.schedule ?? null))
      .catch(() => setAgenda(null))

    fetch('/api/journal', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setNote(data?.entries?.[0] ?? null))
      .catch(() => setNote(null))

    try {
      const stored = JSON.parse(localStorage.getItem(FOCUS_MINUTES_KEY) ?? '{}')
      setFocusMinutesToday(stored[todayKey()] ?? 0)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false)
          addFocusMinutes(TIMER_PRESET_SECONDS / 60)
          return TIMER_PRESET_SECONDS
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning])

  function addFocusMinutes(minutes: number) {
    try {
      const stored = JSON.parse(localStorage.getItem(FOCUS_MINUTES_KEY) ?? '{}')
      const key = todayKey()
      stored[key] = (stored[key] ?? 0) + minutes
      localStorage.setItem(FOCUS_MINUTES_KEY, JSON.stringify(stored))
      setFocusMinutesToday(stored[key])
    } catch { /* ignore */ }
  }

  function toggleTimer() {
    if (!timerRunning && timerSeconds === TIMER_PRESET_SECONDS) setTimerRunning(true)
    else setTimerRunning(r => !r)
  }

  const completeLocalTask = useCallback((id: string) => {
    setLocalTasks(tasks => tasks.map(t => t.id === id ? { ...t, status: 'done' } : t))
    setCompletedToday(c => c + 1)
    fetch('/api/tasks/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'done' }),
    }).catch(() => {})
  }, [])

  const unified: UnifiedTask[] = [
    ...localTasks.filter(t => t.status !== 'done').map(t => ({
      id: t.id, title: t.title, meta: t.client_name ?? t.urgency_level, time: t.due_date ?? undefined, done: false, source: 'local' as const,
    })),
    ...drypTasks.map(t => ({
      id: t.id, title: t.title, meta: t.account_name ?? t.priority, time: t.due_date ?? undefined, done: false, source: 'dryp' as const,
    })),
  ].slice(0, 5)

  const totalOpen = localTasks.filter(t => t.status !== 'done').length + drypTasks.length
  const productivity = totalOpen + completedToday > 0 ? Math.round((completedToday / (totalOpen + completedToday)) * 100) : 0
  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const ss = String(timerSeconds % 60).padStart(2, '0')

  return (
    <AppLayout noPad noScroll>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Work</h1>
            <p>Plan smart. Execute flawlessly.</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="Notifications"><Bell size={16} strokeWidth={1.6} /><i /></button>
            <Link href="/settings" className={styles.iconButton} aria-label="Profile"><User size={16} strokeWidth={1.6} /></Link>
          </div>
        </div>

        <div className={styles.hero}>
          <Image src="/images/rooms/work.jpg" alt="Focus" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <div className={styles.heroLabel}>Today&apos;s Focus</div>
            <h2>Build the life you designed.</h2>
            <p>Stay focused. Eliminate noise.</p>
            <div className={styles.heroMetrics}>
              <div className={styles.heroMetric}>
                <Check size={12} />
                <div className={styles.heroMetricText}><strong>{completedToday}/{totalOpen + completedToday}</strong><span>Tasks done</span></div>
              </div>
              <div className={styles.heroMetric}>
                <Clock size={12} />
                <div className={styles.heroMetricText}><strong>{Math.floor(focusMinutesToday / 60)}h {focusMinutesToday % 60}m</strong><span>Deep work</span></div>
              </div>
              <div className={styles.heroMetric}>
                <Target size={12} />
                <div className={styles.heroMetricText}><strong>{productivity}%</strong><span>Productivity</span></div>
              </div>
            </div>
            <button type="button" className={styles.heroButton} onClick={toggleTimer}>
              {timerRunning ? <Pause size={12} /> : <Play size={12} />} {timerRunning ? 'Pause Deep Work' : 'Start Deep Work'}
            </button>
          </div>
        </div>

        <div className={`${styles.row} ${styles.rowTasksAgenda}`}>
          <div className={styles.col}>
            <div className={styles.sectionHeader}><h2>Priority Tasks</h2><Link href="/tasks">View All ›</Link></div>
            <div className={styles.card}>
              {unified.length === 0 && <div className={styles.emptyNote}>Your workday is clear. Choose one thing to focus on.</div>}
              {unified.map(task => (
                <div key={task.id} className={styles.taskRow}>
                  <button
                    type="button"
                    className={`${styles.taskCheck} ${task.done ? styles.taskCheckDone : ''}`}
                    onClick={() => task.source === 'local' && completeLocalTask(task.id)}
                    aria-label="Complete task"
                  >
                    {task.done && <Check />}
                  </button>
                  <div className={styles.taskBody}>
                    <strong>{task.title}</strong>
                    {task.meta && <span>{task.meta}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.sectionHeader}><h2>Today&apos;s Agenda</h2><Link href="/calendar">View Calendar ›</Link></div>
            <div className={styles.card}>
              {!agenda && <div className={styles.emptyNote}>No plan generated yet — <Link href="/plan-my-day">build today&apos;s plan</Link>.</div>}
              {agenda?.slice(0, 5).map((block, i) => (
                <div key={`${block.time}-${i}`} className={styles.agendaRow}>
                  <span className={styles.agendaTime}>{block.time}</span>
                  <span className={styles.agendaBar} />
                  <div className={styles.agendaBody}>
                    <strong>{block.label}</strong>
                    {block.detail && <span>{block.detail}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.row} ${styles.rowProjectsActions}`}>
          <div className={styles.col}>
            <div className={styles.sectionHeader}><h2>Active Projects</h2><Link href="/dryp-hub">View All ›</Link></div>
            <div className={styles.card}>
              {accounts.length === 0 && <div className={styles.emptyNote}>No active client projects right now.</div>}
              {accounts.slice(0, 4).map(acc => (
                <div key={acc.id} className={styles.projectRow}>
                  <div className={styles.projectBadge}>{initials(acc.business_name)}</div>
                  <div className={styles.projectBody}>
                    <div className={styles.projectTop}>
                      <strong>{acc.business_name}</strong>
                      <span className={`${styles.healthBadge} ${healthClass(acc.health_status)}`}>{healthLabel(acc.health_status)}</span>
                    </div>
                    <div className={styles.projectMeta}>{acc.projects_count ?? 0} open project{acc.projects_count === 1 ? '' : 's'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.col}>
            <div className={styles.sectionHeader}><h2>Quick Actions</h2></div>
            <div className={styles.actionsGrid}>
              <Link href="/tasks?new=1" className={styles.actionCard}><PenLine size={12} /><strong>New Task</strong><span>Add to your list</span></Link>
              <Link href="/calendar" className={styles.actionCard}><Calendar size={12} /><strong>Schedule</strong><span>Book time</span></Link>
              <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><FolderOpen size={12} /><strong>New Project</strong><span>Create project</span></div>
              <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><Users size={12} /><strong>Team Updates</strong><span>Check in</span></div>
              <Link href="/brain-dump" className={styles.actionCard}><ClipboardList size={12} /><strong>Notes</strong><span>Capture ideas</span></Link>
              <div className={styles.actionCard}><span className={styles.actionBadge}>Soon</span><Trophy size={12} /><strong>Goals</strong><span>Track progress</span></div>
            </div>
          </div>
        </div>

        <div className={`${styles.row} ${styles.rowTimerNotes}`}>
          <div className={`${styles.card} ${styles.timerCard}`}>
            <Image src="/images/rooms/work.jpg" alt="" fill sizes="200px" />
            <div className={styles.timerOverlay} />
            <div className={styles.timerContent}>
              <span className={styles.timerLabel}>Deep Work</span>
              <span className={styles.timerCount}>{mm}:{ss}</span>
              <button type="button" className={styles.timerButton} onClick={toggleTimer}>
                {timerRunning ? <Pause size={9} /> : <Play size={9} />} {timerRunning ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>

          <div className={`${styles.card} ${styles.noteCard}`}>
            <div className={styles.sectionHeader}><h2>Quick Notes</h2><Link href="/journal">View All ›</Link></div>
            {note ? (
              <>
                <p className={styles.noteQuote}>&ldquo;{note.content}&rdquo;</p>
                <span className={styles.noteTime}>{new Date(note.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </>
            ) : (
              <div className={styles.emptyNote}>Nothing captured yet.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
