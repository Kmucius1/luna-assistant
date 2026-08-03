'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'

import styles from './WorkViews.module.css'

interface LocalTask { id: string; title: string; due_date?: string | null; urgency_level?: string; client_name?: string; status?: string }
interface DrypTask { id: string; title: string; due_date?: string | null; priority?: string; account_name?: string; status?: string }

type UnifiedTask = { id: string; title: string; meta?: string; done: boolean; source: 'local' | 'dryp' }

export function TasksView() {
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([])
  const [drypTasks, setDrypTasks] = useState<DrypTask[]>([])
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(() => {
    Promise.all([
      fetch('/api/tasks/prioritized', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ tasks: [] })),
      fetch('/api/dryp/tasks', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ tasks: [] })),
    ]).then(([local, dryp]) => {
      setLocalTasks(local.tasks ?? [])
      setDrypTasks(dryp.tasks ?? [])
      setLoading(false)
    })
  }, [])
  useEffect(loadTasks, [loadTasks])

  // Re-pull the fresh prioritized order after completing something, so
  // whichever task is genuinely next bubbles into the Next Up slot right
  // away instead of leaving a checked-off row sitting in place.
  const completeLocalTask = useCallback((id: string) => {
    setLocalTasks(tasks => tasks.map(t => t.id === id ? { ...t, status: 'done' } : t))
    fetch('/api/tasks/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'done' }),
    }).then(loadTasks).catch(() => {})
  }, [loadTasks])

  // /api/tasks/prioritized already returns local tasks re-scored and sorted
  // by priority_score descending, so the first one really is the most
  // important open task right now. DRYP tasks only carry a coarse
  // priority string (no comparable numeric score), so they fall in below
  // rather than competing for the Next Up slot.
  const nextUp = localTasks[0]
  const restLocal = localTasks.slice(1)

  const unified: UnifiedTask[] = [
    ...restLocal.map(t => ({
      id: t.id, title: t.title, meta: t.client_name ?? t.urgency_level, done: t.status === 'done', source: 'local' as const,
    })),
    ...drypTasks.map(t => ({
      id: t.id, title: t.title, meta: t.account_name ?? t.priority, done: t.status === 'done', source: 'dryp' as const,
    })),
  ]

  return (
    <>
      <div className={styles.sectionHeader}>Priority Tasks</div>

      {!loading && nextUp && (
        <div className={styles.nextUpCard}>
          <span className={styles.nextUpBadge}><Sparkles size={11} /> Next Up</span>
          <div className={styles.nextUpRow}>
            <button type="button" className={styles.taskCheck} onClick={() => completeLocalTask(nextUp.id)} aria-label="Complete task">
              <Check />
            </button>
            <div className={styles.nextUpBody}>
              <strong>{nextUp.title}</strong>
              {(nextUp.client_name ?? nextUp.urgency_level) && <span>{nextUp.client_name ?? nextUp.urgency_level}</span>}
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <div className={styles.emptyNote}>Loading&hellip;</div>
        ) : unified.length === 0 && !nextUp ? (
          <div className={styles.emptyNote}>Your workday is clear. Choose one thing to focus on.</div>
        ) : unified.length === 0 ? (
          <div className={styles.emptyNote}>That&apos;s everything else on your plate right now.</div>
        ) : (
          unified.map(task => (
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
              {task.source === 'dryp' && <span className={styles.taskSourceBadge}>DRYP</span>}
            </div>
          ))
        )}
      </div>
    </>
  )
}
