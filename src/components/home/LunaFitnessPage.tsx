'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Building2,
  Camera,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Lock,
  Scale,
  ShirtIcon,
  Sparkles,
  Target,
  Utensils,
  Zap,
} from 'lucide-react'

import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { AppLayout } from '@/components/layout/AppLayout'
import styles from './LunaFitnessPage.module.css'

const STORAGE_KEY = 'luna_fitness_onboarding_v1'

const GOALS = [
  { id: 'glutes', emoji: '🍑', label: 'Build glutes' },
  { id: 'muscle', emoji: '💪', label: 'Gain muscle' },
  { id: 'weight', emoji: '⚖️', label: 'Lose weight' },
  { id: 'endurance', emoji: '🏃', label: 'Improve endurance' },
  { id: 'health', emoji: '❤️', label: 'Get healthier' },
  { id: 'stronger', emoji: '🧘', label: 'Feel stronger' },
  { id: 'stress', emoji: '😌', label: 'Reduce stress' },
  { id: 'confidence', emoji: '⭐', label: 'Build confidence' },
]

const GYMS = ['Crunch', 'Planet Fitness', 'LA Fitness', 'Home', 'Other']

const EQUIPMENT = ['Barbells', 'Dumbbells', 'Cable machine', 'Smith machine', 'Leg press', 'Hip thrust machine', 'Resistance bands', 'Pull-up bar', 'Cardio equipment']

const DAYS = ['2', '3', '4', '5', '6+']

const COMING_SOON = [
  'Progress Photos', 'Workout History', 'Personal Records', 'Strength Graphs',
  'Recovery Insights', 'Weekly Trends', 'AI Coaching Based on Performance',
]

interface Onboarding {
  goals: string[]
  gym: string | null
  equipment: string[]
  days: string | null
}

const DEFAULT_ONBOARDING: Onboarding = { goals: [], gym: null, equipment: [], days: null }

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
}

export function LunaFitnessPage() {
  const [weekday, setWeekday] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding>(DEFAULT_ONBOARDING)

  useEffect(() => {
    setWeekday(new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setOnboarding({ ...DEFAULT_ONBOARDING, ...JSON.parse(saved) })
    } catch { /* ignore */ }
  }, [])

  function update(next: Onboarding) {
    setOnboarding(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const gymFocus = (weekday && ZOE_GYM_BY_DAY[weekday]) ?? ZOE_GYM_BY_DAY.Monday
  const exercises = (weekday && ZOE_EXERCISES_BY_DAY[weekday]) ?? ZOE_EXERCISES_BY_DAY.Monday
  const estimatedMinutes = exercises.length * 8

  return (
    <AppLayout noPad>
      <div className={styles.page}>
        <div className={styles.header}>
          <Image src="/images/rooms/hero-gym-focus.png" alt="Fitness" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.headerOverlay} />
          <div className={styles.headerContent}>
            <h1>Good morning, Zoe. Ready to move?</h1>
            <p>Every expert started with one workout.</p>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader}><Dumbbell size={15} /> Today&apos;s Workout</p>
          <div className={styles.card}>
            <p className={styles.workoutName}>{gymFocus}</p>
            <div className={styles.workoutStats}>
              <div className={styles.workoutStat}><Clock size={14} /><strong>~{estimatedMinutes} min</strong></div>
              <div className={styles.workoutStat}><Flame size={14} /><strong>{exercises.length} exercises</strong></div>
              <div className={styles.workoutStat}><Building2 size={14} /><strong>{onboarding.gym ?? 'Not set'}</strong></div>
            </div>
            {!onboarding.gym && (
              <div className={styles.gymChips}>
                {GYMS.map(gym => (
                  <button key={gym} type="button" className={styles.chip} onClick={() => update({ ...onboarding, gym })}>{gym}</button>
                ))}
              </div>
            )}
            <Link href="/plan-my-day" className={styles.startButton}>Start Workout</Link>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader}><Target size={15} /> Your Goals</p>
          <div className={styles.card}>
            <div className={styles.chipGrid}>
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  type="button"
                  className={`${styles.chip} ${onboarding.goals.includes(goal.id) ? styles.chipActive : ''}`}
                  onClick={() => update({ ...onboarding, goals: toggle(onboarding.goals, goal.id) })}
                >
                  {goal.emoji} {goal.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader}><Building2 size={15} /> Your Equipment</p>
          <div className={styles.card}>
            <div className={styles.chipGrid}>
              {EQUIPMENT.map(item => (
                <button
                  key={item}
                  type="button"
                  className={`${styles.chip} ${onboarding.equipment.includes(item) ? styles.chipActive : ''}`}
                  onClick={() => update({ ...onboarding, equipment: toggle(onboarding.equipment, item) })}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader}><Footprints size={15} /> Your Schedule</p>
          <div className={styles.card}>
            <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 8px' }}>How many days can you realistically train?</p>
            <div className={styles.chipGrid}>
              {DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`${styles.chip} ${onboarding.days === d ? styles.chipActive : ''}`}
                  onClick={() => update({ ...onboarding, days: d })}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.motivationCard}`}>
          <Sparkles size={20} style={{ color: 'var(--gold)', marginBottom: 6 }} />
          <h2>You don&apos;t need to be perfect.</h2>
          <p>You just need to show up today.</p>
        </div>

        <div>
          <p className={styles.sectionHeader}><Zap size={15} /> Quick Actions</p>
          <div className={styles.quickGrid}>
            <div className={`${styles.quickAction} ${styles.quickActionDisabled}`}><span className={styles.soonBadge}>Soon</span><Camera size={18} /> Progress photo</div>
            <div className={`${styles.quickAction} ${styles.quickActionDisabled}`}><span className={styles.soonBadge}>Soon</span><Scale size={18} /> Log weight</div>
            <div className={`${styles.quickAction} ${styles.quickActionDisabled}`}><span className={styles.soonBadge}>Soon</span><Heart size={18} /> Log water</div>
            <Link href="/food" className={styles.quickAction}><Utensils size={18} /> Go to Food</Link>
            <Link href="/style" className={styles.quickAction}><ShirtIcon size={18} /> Pick gym outfit</Link>
          </div>
        </div>

        <div>
          <p className={styles.sectionHeader}><Lock size={15} /> Unlocks As You Use Luna</p>
          <div className={styles.card}>
            <div className={styles.lockedList}>
              {COMING_SOON.map(item => (
                <div key={item} className={styles.lockedRow}><Lock size={13} /> {item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
