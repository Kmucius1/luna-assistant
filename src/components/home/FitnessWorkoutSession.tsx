'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2, ChevronLeft, Dumbbell } from 'lucide-react'

import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { resolveExercises } from '@/lib/luna/fitnessExercises'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from './FitnessWorkoutSession.module.css'

const STORAGE_KEY = 'luna_fitness_onboarding_v1'

interface Onboarding {
  goals: string[]
  gym: string | null
  equipment: string[]
  days: string | null
}

const DEFAULT_ONBOARDING: Onboarding = { goals: [], gym: null, equipment: [], days: null }

export function FitnessWorkoutSession() {
  const [weekday, setWeekday] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<string[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setWeekday(new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setEquipment({ ...DEFAULT_ONBOARDING, ...JSON.parse(saved) }.equipment ?? [])
    } catch { /* ignore */ }
  }, [])

  const gymFocus = (weekday && ZOE_GYM_BY_DAY[weekday]) ?? ZOE_GYM_BY_DAY.Monday
  const exercises = weekday ? resolveExercises(weekday, ZOE_EXERCISES_BY_DAY, equipment) : ZOE_EXERCISES_BY_DAY.Monday

  function toggleExercise(name: string) {
    setChecked(prev => ({ ...prev, [name]: !prev[name] }))
  }

  async function completeWorkout() {
    setSubmitting(true)
    try {
      await fetch('/api/fitness/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus: gymFocus,
          exercises: exercises.map(name => ({ name, done: !!checked[name] })),
          durationMinutes: exercises.length * 8,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      setCompleted(true)
    } catch { /* ignore, keep the button available to retry */ }
    setSubmitting(false)
  }

  if (completed) {
    return (
      <AppLayout noPad>
        <div className={styles.page}>
          <div className={styles.doneCard}>
            <CheckCircle2 size={36} className={styles.doneIcon} />
            <h1>Workout complete!</h1>
            <p>Nice work on {gymFocus.toLowerCase()} today.</p>
            <Link href="/fitness" className={styles.backToFitness}>Back to Fitness</Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link href="/fitness" className={styles.backButton} aria-label="Back to Fitness">
            <ChevronLeft size={18} strokeWidth={2} />
          </Link>
          <div>
            <p className={styles.eyebrow}><Dumbbell size={12} /> Today&apos;s Workout</p>
            <h1>{gymFocus}</h1>
          </div>
        </div>

        <div className={styles.list}>
          {exercises.map(name => (
            <button key={name} type="button" className={styles.row} onClick={() => toggleExercise(name)}>
              <span className={`${styles.checkbox} ${checked[name] ? styles.checkboxDone : ''}`}>
                {checked[name] && <Check size={13} strokeWidth={3} />}
              </span>
              <span className={`${styles.rowLabel} ${checked[name] ? styles.rowLabelDone : ''}`}>{name}</span>
            </button>
          ))}
        </div>

        <button type="button" className={styles.completeButton} onClick={completeWorkout} disabled={submitting}>
          {submitting ? 'Saving…' : 'Complete Workout'}
        </button>
      </div>
    </AppLayout>
  )
}
