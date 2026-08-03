'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Droplet, History, TrendingUp } from 'lucide-react'

import styles from './FitnessViews.module.css'

const HYDRATION_GOAL_OZ = 90

interface WorkoutLog {
  id: string
  date_key: string
  day_of_week: string
  focus: string | null
  duration_minutes: number | null
  completed_at: string
}

interface WeightLog {
  id: string
  date_key: string
  weight_lbs: number
}

function todayKey(): string {
  return new Date().toDateString()
}

function formatLogDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(dateKey + 'T12:00:00'))
}

export function FitnessTrackView() {
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([])
  const [workoutsLoaded, setWorkoutsLoaded] = useState(false)

  const [weightLogs, setWeightLogs] = useState<WeightLog[] | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightError, setWeightError] = useState(false)

  const [hydrationOz, setHydrationOz] = useState<number | null>(null)

  useEffect(() => {
    try {
      const savedHydration = localStorage.getItem(`luna_hydration_${todayKey()}`)
      setHydrationOz(savedHydration ? Number(savedHydration) : 0)
    } catch { setHydrationOz(0) }
  }, [])

  useEffect(() => {
    fetch(`/api/fitness/workouts?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}&limit=8`)
      .then(res => res.json())
      .then(data => setRecentWorkouts(data.workouts ?? []))
      .catch(() => setRecentWorkouts([]))
      .finally(() => setWorkoutsLoaded(true))
  }, [])

  useEffect(() => {
    fetch('/api/fitness/weight?limit=8').then(r => r.json()).then(d => setWeightLogs(d.logs ?? [])).catch(() => setWeightLogs([]))
  }, [])

  async function logWeight() {
    const value = parseFloat(weightInput)
    if (!value || value <= 0) return
    setWeightSaving(true)
    setWeightError(false)
    try {
      const res = await fetch('/api/fitness/weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightLbs: value, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      })
      if (!res.ok) { setWeightError(true); setWeightSaving(false); return }
      setWeightInput('')
      fetch('/api/fitness/weight?limit=8').then(r => r.json()).then(d => setWeightLogs(d.logs ?? []))
    } catch { setWeightError(true) }
    setWeightSaving(false)
  }

  const latestWeight = weightLogs?.[0]
  const todayWeightKey = new Intl.DateTimeFormat('en-CA').format(new Date())
  const alreadyLoggedToday = latestWeight?.date_key === todayWeightKey

  return (
    <>
      <div className={styles.sectionHeader}><History size={13} /> Recent Workouts</div>
      {!workoutsLoaded ? (
        <div className={styles.emptyCard}><p>Loading&hellip;</p></div>
      ) : recentWorkouts.length === 0 ? (
        <div className={styles.emptyCard}><p>Your completed workouts will show up here.</p></div>
      ) : (
        <div className={styles.historyList}>
          {recentWorkouts.map(w => (
            <div key={w.id} className={styles.historyRow}>
              <span className={styles.historyDate}>{formatLogDate(w.date_key)}</span>
              <span className={styles.historyFocus}>{w.focus ?? w.day_of_week}</span>
              <span className={styles.historyMeta}>{w.duration_minutes ? `${w.duration_minutes} min` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.sectionHeader}><TrendingUp size={13} /> Weight</div>
      <div className={styles.trackCard}>
        {alreadyLoggedToday ? (
          <p className={styles.weightLogged}>Logged today: <strong>{latestWeight!.weight_lbs} lbs</strong></p>
        ) : (
          <div className={styles.weightInputRow}>
            <input
              type="number" inputMode="decimal" step="0.1" placeholder="Weight (lbs)"
              value={weightInput} onChange={e => setWeightInput(e.target.value)}
              className={styles.weightInput}
            />
            <button type="button" onClick={logWeight} disabled={weightSaving || !weightInput} className={styles.weightLogButton}>
              {weightSaving ? 'Saving…' : 'Log'}
            </button>
          </div>
        )}
        {weightLogs && weightLogs.length > 0 && (
          <div className={styles.weightHistory}>
            {weightLogs.slice(0, 5).map(log => (
              <div key={log.id} className={styles.weightHistoryRow}>
                <span>{formatLogDate(log.date_key)}</span>
                <strong>{log.weight_lbs} lbs</strong>
              </div>
            ))}
          </div>
        )}
        {weightLogs && weightLogs.length === 0 && <p className={styles.trackEmpty}>No weigh-ins logged yet.</p>}
        {weightError && <p className={styles.trackErrorMsg}>Couldn&apos;t save that — check your connection and try again.</p>}
      </div>

      <div className={styles.sectionHeader}><Droplet size={13} /> Water</div>
      <Link href="/wellness#hydration" className={styles.waterCard}>
        <div className={styles.waterInfo}>
          <strong>{hydrationOz ?? 0} oz</strong>
          <span>of {HYDRATION_GOAL_OZ} oz goal today</span>
        </div>
        <div className={styles.waterBarOuter}><div className={styles.waterBarInner} style={{ width: `${Math.min(100, ((hydrationOz ?? 0) / HYDRATION_GOAL_OZ) * 100)}%` }} /></div>
        <span className={styles.waterLink}>Log water on Wellness <ChevronRight size={12} /></span>
      </Link>
    </>
  )
}
