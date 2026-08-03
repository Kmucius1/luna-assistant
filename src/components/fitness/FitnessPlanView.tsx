'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChevronRight, Footprints } from 'lucide-react'

import { ZOE_EXERCISES_BY_DAY, ZOE_GYM_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { resolveExercises } from '@/lib/luna/fitnessExercises'
import { getExerciseReference } from '@/lib/luna/exerciseLibrary'
import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './FitnessViews.module.css'

const STORAGE_KEY = 'luna_fitness_onboarding_v1'
const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface Onboarding {
  goals: string[]
  gym: string | null
  equipment: string[]
  days: string | null
}

const DEFAULT_ONBOARDING: Onboarding = { goals: [], gym: null, equipment: [], days: null }

export function FitnessPlanView() {
  const [weekday, setWeekday] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<Onboarding>(DEFAULT_ONBOARDING)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    setWeekday(new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()))
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setOnboarding({ ...DEFAULT_ONBOARDING, ...JSON.parse(saved) })
    } catch { /* ignore */ }
  }, [])

  const selectedDayExercises = selectedDay ? resolveExercises(selectedDay, ZOE_EXERCISES_BY_DAY, onboarding.equipment) : []

  return (
    <>
      <div className={styles.sectionHeader}><Footprints size={13} /> This Week&apos;s Split</div>
      <div className={styles.weekList}>
        {WEEK_ORDER.map(day => {
          const focus = ZOE_GYM_BY_DAY[day]
          const dayExercises = ZOE_EXERCISES_BY_DAY[day] ?? []
          const isToday = day === weekday
          return (
            <button key={day} type="button" className={`${styles.dayRow} ${isToday ? styles.dayRowActive : ''}`} onClick={() => setSelectedDay(day)}>
              <span className={styles.dayRowName}>{day.slice(0, 3)}</span>
              <span className={styles.dayRowText}>
                <span className={styles.dayRowFocus}>{focus}</span>
                <span className={styles.dayRowMeta}>{dayExercises.length} exercises</span>
              </span>
              {isToday && <span className={styles.todayPill}>Today</span>}
              <ChevronRight size={15} className={styles.dayRowArrow} />
            </button>
          )
        })}
      </div>

      <BottomSheet isOpen={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ?? undefined} subtitle={selectedDay ? ZOE_GYM_BY_DAY[selectedDay] : undefined}>
        {selectedDay && (
          <div className={styles.sheetList}>
            {selectedDayExercises.map(name => {
              const ref = getExerciseReference(name)
              return (
                <div key={name} className={styles.sheetRow}>
                  {ref && <span className={styles.sheetThumb}><Image src={ref.image} alt="" fill sizes="48px" /></span>}
                  <span className={styles.sheetText}>
                    <strong>{name}</strong>
                    {ref && <span>{ref.equipment}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
