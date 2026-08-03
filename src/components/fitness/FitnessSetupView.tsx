'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Building2, Dumbbell, Footprints, Sliders, Target } from 'lucide-react'

import styles from './FitnessViews.module.css'

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
const DAYS_OPTIONS = ['2', '3', '4', '5', '6+']

const ONBOARDING_TABS = [
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'gym', label: 'Gym', icon: Building2 },
  { id: 'equipment', label: 'Equipment', icon: Dumbbell },
  { id: 'schedule', label: 'Schedule', icon: Footprints },
] as const

type OnboardingTab = typeof ONBOARDING_TABS[number]['id']
const VALID_TABS = ONBOARDING_TABS.map(t => t.id)

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

export function FitnessSetupView() {
  const searchParams = useSearchParams()
  const [onboarding, setOnboarding] = useState<Onboarding>(DEFAULT_ONBOARDING)
  const [activeTab, setActiveTab] = useState<OnboardingTab>(() => {
    const requested = searchParams.get('tab')
    return (VALID_TABS as string[]).includes(requested ?? '') ? (requested as OnboardingTab) : 'goals'
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setOnboarding({ ...DEFAULT_ONBOARDING, ...JSON.parse(saved) })
    } catch { /* ignore */ }
  }, [])

  function update(next: Onboarding) {
    setOnboarding(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  return (
    <>
      <div className={styles.sectionHeader}><Sliders size={13} /> Goals, Gym &amp; Equipment</div>
      <div className={styles.tabRow}>
        {ONBOARDING_TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} type="button" className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`} onClick={() => setActiveTab(tab.id)}>
              <Icon size={14} strokeWidth={1.7} /> {tab.label}
            </button>
          )
        })}
      </div>
      <div className={styles.onboardingCard}>
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
            {DAYS_OPTIONS.map(d => (
              <button key={d} type="button" className={`${styles.chip} ${onboarding.days === d ? styles.chipActive : ''}`} onClick={() => update({ ...onboarding, days: d })}>{d} days/wk</button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
