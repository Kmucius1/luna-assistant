'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Check, Clock, FolderOpen, Inbox, PenLine, Pause, Play, Target, Trophy, Users } from 'lucide-react'

import { NewProjectSheet } from './NewProjectSheet'
import { TeamUpdatesSheet } from './TeamUpdatesSheet'
import { GoalsSheet } from './GoalsSheet'
import styles from './WorkViews.module.css'

interface LocalTask { id: string; status?: string }
interface DrypTask { id: string }

const TIMER_PRESET_SECONDS = 45 * 60
const FOCUS_MINUTES_KEY = 'luna_work_focus_minutes_v1'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function TodayView() {
  const [totalOpen, setTotalOpen] = useState(0)
  const [completedToday, setCompletedToday] = useState(0)
  const [sheet, setSheet] = useState<'project' | 'updates' | 'goals' | null>(null)

  const [timerSeconds, setTimerSeconds] = useState(TIMER_PRESET_SECONDS)
  const [timerRunning, setTimerRunning] = useState(false)
  const [focusMinutesToday, setFocusMinutesToday] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks/prioritized', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ tasks: [] })),
      fetch('/api/dryp/tasks', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ tasks: [] })),
    ]).then(([local, dryp]) => {
      const localTasks: LocalTask[] = local.tasks ?? []
      const drypTasks: DrypTask[] = dryp.tasks ?? []
      setTotalOpen(localTasks.filter(t => t.status !== 'done').length + drypTasks.length)
      setCompletedToday(localTasks.filter(t => t.status === 'done').length)
    })

    try {
      const stored = JSON.parse(localStorage.getItem(FOCUS_MINUTES_KEY) ?? '{}')
      setFocusMinutesToday(stored[todayKey()] ?? 0)
    } catch { /* ignore */ }
  }, [])

  function addFocusMinutes(minutes: number) {
    try {
      const stored = JSON.parse(localStorage.getItem(FOCUS_MINUTES_KEY) ?? '{}')
      const key = todayKey()
      stored[key] = (stored[key] ?? 0) + minutes
      localStorage.setItem(FOCUS_MINUTES_KEY, JSON.stringify(stored))
      setFocusMinutesToday(stored[key])
    } catch { /* ignore */ }
  }

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

  }, [timerRunning])

  function toggleTimer() {
    if (!timerRunning && timerSeconds === TIMER_PRESET_SECONDS) setTimerRunning(true)
    else setTimerRunning(r => !r)
  }

  const productivity = totalOpen + completedToday > 0 ? Math.round((completedToday / (totalOpen + completedToday)) * 100) : 0
  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const ss = String(timerSeconds % 60).padStart(2, '0')

  return (
    <>
      <div className={styles.hero}>
        <Image src="/images/rooms/work.jpg" alt="Focus" fill sizes="(max-width: 640px) 100vw, 640px" priority />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>Today&apos;s Focus</div>
          <h2>Build the life you designed.</h2>
          <p>Stay focused. Eliminate noise.</p>
          <div className={styles.heroMetrics}>
            <div className={styles.heroMetric}>
              <Check size={14} />
              <div className={styles.heroMetricText}><strong>{completedToday}/{totalOpen + completedToday}</strong><span>Tasks done</span></div>
            </div>
            <div className={styles.heroMetric}>
              <Clock size={14} />
              <div className={styles.heroMetricText}><strong>{Math.floor(focusMinutesToday / 60)}h {focusMinutesToday % 60}m</strong><span>Deep work</span></div>
            </div>
            <div className={styles.heroMetric}>
              <Target size={14} />
              <div className={styles.heroMetricText}><strong>{productivity}%</strong><span>Productivity</span></div>
            </div>
          </div>
          <button type="button" className={styles.heroButton} onClick={toggleTimer}>
            {timerRunning ? <Pause size={13} /> : <Play size={13} />} {timerRunning ? `Pause · ${mm}:${ss}` : 'Start Deep Work'}
          </button>
        </div>
      </div>

      <div className={styles.sectionHeader}>Quick Actions</div>
      <div className={styles.actionsGrid}>
        <Link href="/work/tasks" className={styles.actionCard}><PenLine size={16} /><strong>New Task</strong><span>Add to your list</span></Link>
        <Link href="/calendar" className={styles.actionCard}><Calendar size={16} /><strong>Schedule</strong><span>Book time</span></Link>
        <button type="button" className={styles.actionCard} onClick={() => setSheet('project')}><FolderOpen size={16} /><strong>New Project</strong><span>Create project</span></button>
        <button type="button" className={styles.actionCard} onClick={() => setSheet('updates')}><Users size={16} /><strong>Team Updates</strong><span>Check in</span></button>
        <Link href="/brain-dump" className={styles.actionCard}><PenLine size={16} /><strong>Notes</strong><span>Capture ideas</span></Link>
        <button type="button" className={styles.actionCard} onClick={() => setSheet('goals')}><Trophy size={16} /><strong>Goals</strong><span>Track progress</span></button>
        <Link href="/email" className={styles.actionCard}><Inbox size={16} /><strong>Email</strong><span>Read & reply with AI</span></Link>
      </div>

      <NewProjectSheet isOpen={sheet === 'project'} onClose={() => setSheet(null)} />
      <TeamUpdatesSheet isOpen={sheet === 'updates'} onClose={() => setSheet(null)} />
      <GoalsSheet isOpen={sheet === 'goals'} onClose={() => setSheet(null)} />
    </>
  )
}
