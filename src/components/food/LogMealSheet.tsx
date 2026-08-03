'use client'

import { useState } from 'react'
import { Beef, Check, Droplet, Loader2, UtensilsCrossed } from 'lucide-react'

import { BottomSheet } from '@/components/ui/BottomSheet'
import styles from './FoodViews.module.css'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]

function guessMealType(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 17) return 'snack'
  return 'dinner'
}

interface LoggedEntry { id: string; meal_type: MealType; title: string; calories: number; protein_g: number }

interface LogMealSheetProps {
  isOpen: boolean
  onClose: () => void
  onLogged: (entry: LoggedEntry) => void
}

export function LogMealSheet({ isOpen, onClose, onLogged }: LogMealSheetProps) {
  const [mealType, setMealType] = useState<MealType>(guessMealType())
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logged, setLogged] = useState<LoggedEntry | null>(null)

  function reset() {
    setDescription('')
    setError(null)
    setLogged(null)
    setMealType(guessMealType())
  }

  async function submit() {
    if (!description.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/food/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: mealType, mode: 'custom', description: description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't log that")
      setLogged(data.entry)
      onLogged(data.entry)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={() => { onClose(); reset() }} title="Log a Meal" subtitle="Tell LUNA what you ate — she'll work out the nutrition" height="60vh">
      {logged ? (
        <div className={styles.logConfirm}>
          <Check size={22} />
          <p><strong>{logged.title}</strong> logged as {MEAL_TYPES.find(m => m.key === logged.meal_type)?.label}</p>
          <div className={styles.mealStats}>
            <span><Droplet size={13} /> {logged.calories} cal</span>
            <span><Beef size={13} /> {logged.protein_g}g protein</span>
          </div>
          <button type="button" className={styles.generateButton} onClick={reset}>Log another</button>
        </div>
      ) : (
        <>
          <div className={styles.wceMoodRow}>
            {MEAL_TYPES.map(m => (
              <button key={m.key} type="button" className={`${styles.wceMoodChip} ${mealType === m.key ? styles.wceMoodChipActive : ''}`} onClick={() => setMealType(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <textarea
            className={styles.logInput}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. a banana, 2 eggs and toast, chicken burrito bowl…"
            rows={3}
          />
          <button type="button" className={styles.generateButton} style={{ width: '100%', justifyContent: 'center' }} onClick={submit} disabled={submitting || !description.trim()}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <UtensilsCrossed size={14} />}
            {submitting ? 'Working out the nutrition…' : 'Log it'}
          </button>
          {error && <p className={styles.errorText}>{error}</p>}
        </>
      )}
    </BottomSheet>
  )
}
