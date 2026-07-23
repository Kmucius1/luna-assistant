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

const ONBOARDING_TABS = [
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'gym', label: 'Gym', icon: Building2 },
  { id: 'equipment', label: 'Equipment', icon: Dumbbell },
  { id: 'schedule', label: 'Schedule', icon: Footprints },
] as const

type OnboardingTab = typeof ONBOARDING_TABS[number]['id']

const COMING_SOON_COUNT = 7

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
  const [activeTab, setActiveTab] = useState<OnboardingTab>('goals')

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
    <AppLayout noPad noScroll>
      <div className={styles.page}>
        <div className={styles.header}>
          <Image src="/images/rooms/hero-gym-focus.jpg" alt="Fitness" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          <div className={styles.headerOverlay} />
          <div className={styles.headerContent}>
            <h1>Good morning, Zoe. Ready to move?</h1>
            <p>Every expert started with one workout.</p>
          </div>
        </div>

        <div className={styles.workoutSection}>
          <p className={styles.sectionHeader}><Dumbbell size={12} /> Today&apos;s Workout</p>
          <div className={styles.card}>
            <p className={styles.workoutName}>{gymFocus}</p>
            <div className={styles.workoutStats}>
              <div className={styles.workoutStat}><Clock size={11} /><strong>~{estimatedMinutes} min</strong></div>
              <div className={styles.workoutStat}><Flame size={11} /><strong>{exercises.length} exercises</strong></div>
              <div className={styles.workoutStat}><Building2 size={11} /><strong>{onboarding.gym ?? 'Not set'}</strong></div>
            </div>
            <Link href="/plan-my-day" className={styles.startButton}>Start Workout</Link>
          </div>
        </div>

        <div className={styles.onboardingSection}>
          <div className={styles.tabRow}>
            {ONBOARDING_TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={12} strokeWidth={1.7} /> {tab.label}
                </button>
              )
            })}
          </div>
          <div className={styles.card + ' ' + styles.onboardingCard}>
            {activeTab === 'goals' && (
              <div className={styles.chipGrid}>
                {GOALS.map(goal => (
                  <button key={goal.id} type="button" className={`${styles.chip} ${onboarding.goals.includes(goal.id) ? styles.chipActive : ''}`} onClick={() => update({ ...onboarding, goals: toggle(onboarding.goals, goal.id) })}>
                    {goal.emoji} {goal.label}
                  </button>
                ))}
              </div>
            )}
            {activeTab === 'gym' && (
              <div className={styles.chipGrid}>
                {GYMS.map(gym => (
                  <button key={gym} type="button" className={`${styles.chip} ${onboarding.gym === gym ? styles.chipActive : ''}`} onClick={() => update({ ...onboarding, gym })}>{gym}</button>
                ))}
              </div>
            )}
            {activeTab === 'equipment' && (
              <div className={styles.chipGrid}>
                {EQUIPMENT.map(item => (
                  <button key={item} type="button" className={`${styles.chip} ${onboarding.equipment.includes(item) ? styles.chipActive : ''}`} onClick={() => update({ ...onboarding, equipment: toggle(onboarding.equipment, item) })}>{item}</button>
                ))}
              </div>
            )}
            {activeTab === 'schedule' && (
              <div className={styles.chipGrid}>
                {DAYS.map(d => (
                  <button key={d} type="button" className={`${styles.chip} ${onboarding.days === d ? styles.chipActive : ''}`} onClick={() => update({ ...onboarding, days: d })}>{d} days/wk</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`${styles.card} ${styles.motivationCard}`}>
          <Sparkles size={13} style={{ color: 'var(--gold)' }} />
          <span>You don&apos;t need to be perfect — just show up today.</span>
        </div>

        <div className={styles.quickSection}>
          <div className={styles.quickGrid}>
            <div className={`${styles.quickAction} ${styles.quickActionDisabled}`}><span className={styles.soonBadge}>Soon</span><Camera size={13} /> Photo</div>
            <div className={`${styles.quickAction} ${styles.quickActionDisabled}`}><span className={styles.soonBadge}>Soon</span><Scale size={13} /> Weight</div>
            <div className={`${styles.quickAction} ${styles.quickActionDisabled}`}><span className={styles.soonBadge}>Soon</span><Heart size={13} /> Water</div>
            <Link href="/food" className={styles.quickAction}><Utensils size={13} /> Food</Link>
            <Link href="/style" className={styles.quickAction}><ShirtIcon size={13} /> Outfit</Link>
          </div>
        </div>

        <div className={styles.lockedRow}><Lock size={11} /> {COMING_SOON_COUNT} more features unlock as you train — Progress Photos, PRs, Strength Graphs &amp; more</div>
      </div>
    </AppLayout>
  )
}
