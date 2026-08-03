'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, CheckCircle2, ChevronLeft, Dumbbell } from 'lucide-react'

import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { resolveExercises } from '@/lib/luna/fitnessExercises'
import { getExerciseReference } from '@/lib/luna/exerciseLibrary'
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
  const [saveError, setSaveError] = useState(false)

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
    setSaveError(false)
    try {
      const res = await fetch('/api/fitness/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus: gymFocus,
          exercises: exercises.map(name => ({ name, done: !!checked[name] })),
          durationMinutes: exercises.length * 8,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      if (!res.ok) { setSaveError(true); setSubmitting(false); return }
      setCompleted(true)
    } catch { setSaveError(true) }
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
          {exercises.map(name => {
            const ref = getExerciseReference(name)
            return (
              <button key={name} type="button" className={styles.row} onClick={() => toggleExercise(name)}>
                {ref && (
                  <span className={styles.rowThumb}>
                    <Image src={ref.image} alt={name} fill sizes="52px" />
                  </span>
                )}
                <span className={styles.rowText}>
                  <span className={`${styles.rowLabel} ${checked[name] ? styles.rowLabelDone : ''}`}>{name}</span>
                  {ref && <span className={styles.rowEquipment}>{ref.equipment}</span>}
                </span>
                <span className={`${styles.checkbox} ${checked[name] ? styles.checkboxDone : ''}`}>
                  {checked[name] && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>

        <button type="button" className={styles.completeButton} onClick={completeWorkout} disabled={submitting}>
          {submitting ? 'Saving…' : 'Complete Workout'}
        </button>
        {saveError && <p className={styles.saveError}>Couldn&apos;t save that — check your connection and try again.</p>}
      </div>
    </AppLayout>
  )
}
