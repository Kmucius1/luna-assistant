'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Building2, Clock, Dumbbell, Flame, Sparkles } from 'lucide-react'

import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { resolveExercises } from '@/lib/luna/fitnessExercises'
import { getExerciseReference } from '@/lib/luna/exerciseLibrary'
import { getGreeting } from '@/lib/luna/greeting'
import styles from './FitnessViews.module.css'

const STORAGE_KEY = 'luna_fitness_onboarding_v1'

interface Onboarding {
  goals: string[]
  gym: string | null
  equipment: string[]
  days: string | null
}

const DEFAULT_ONBOARDING: Onboarding = { goals: [], gym: null, equipment: [], days: null }

export function FitnessTodayView() {
  const [weekday, setWeekday] = useState<string | null>(null)
  const [hour, setHour] = useState<number | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding>(DEFAULT_ONBOARDING)
  const [completedToday, setCompletedToday] = useState(false)

  useEffect(() => {
    const d = new Date()
    setWeekday(new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d))
    setHour(d.getHours())
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setOnboarding({ ...DEFAULT_ONBOARDING, ...JSON.parse(saved) })
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch(`/api/fitness/workouts?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`)
      .then(res => res.json())
      .then(data => setCompletedToday(!!data.completedToday))
      .catch(() => {})
  }, [])

  const gymFocus = (weekday && ZOE_GYM_BY_DAY[weekday]) ?? ZOE_GYM_BY_DAY.Monday
  const exercises = weekday ? resolveExercises(weekday, ZOE_EXERCISES_BY_DAY, onboarding.equipment) : ZOE_EXERCISES_BY_DAY.Monday
  const estimatedMinutes = exercises.length * 8
  const previewThumbs = exercises.map(name => getExerciseReference(name)).filter((ref): ref is NonNullable<typeof ref> => !!ref).slice(0, 4)

  return (
    <>
      <div className={styles.hero}>
        <Image src="/images/rooms/hero-gym-focus.jpg" alt="Fitness" fill sizes="(max-width: 640px) 100vw, 640px" priority />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h2>{hour !== null ? getGreeting(hour) : 'Hello'}, Zoe. Ready to move?</h2>
          <p>Every expert started with one workout.</p>
        </div>
      </div>

      <div className={styles.sectionHeader}><Dumbbell size={13} /> Today&apos;s Workout</div>
      <div className={styles.workoutCard}>
        <p className={styles.workoutName}>{gymFocus}</p>
        <div className={styles.workoutStats}>
          <div className={styles.workoutStat}><Clock size={12} /><strong>~{estimatedMinutes} min</strong></div>
          <div className={styles.workoutStat}><Flame size={12} /><strong>{exercises.length} exercises</strong></div>
          <div className={styles.workoutStat}><Building2 size={12} /><strong>{onboarding.gym ?? 'Not set'}</strong></div>
          {previewThumbs.length > 0 && (
            <div className={styles.thumbStack}>
              {previewThumbs.map((ref, i) => (
                <span key={i} className={styles.thumbStackItem}><Image src={ref.image} alt="" fill sizes="24px" /></span>
              ))}
            </div>
          )}
        </div>
        {completedToday ? (
          <div className={styles.completedBadge}><Sparkles size={13} /> Completed today</div>
        ) : (
          <Link href="/fitness/workout" className={styles.startButton}>Start Workout</Link>
        )}
      </div>
    </>
  )
}
