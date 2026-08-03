'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Beef, ChefHat, ChevronLeft, ChevronRight, Droplet, Loader2, Soup } from 'lucide-react'

import { imageForMeal } from '@/lib/luna/mealImages'
import { RecipeDetailSheet } from './RecipeDetailSheet'
import styles from './FoodViews.module.css'

interface MealEntry { day: string; meal: string; prep_note: string; calories?: number; protein_g?: number }
interface WeeklyPlanJson { breakfasts: MealEntry[]; lunches: MealEntry[]; dinners: MealEntry[] }
interface WeeklyPlanRow { plan_json: WeeklyPlanJson }

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES: { key: 'breakfasts' | 'lunches' | 'dinners'; label: string }[] = [
  { key: 'breakfasts', label: 'Breakfast' },
  { key: 'lunches', label: 'Lunch' },
  { key: 'dinners', label: 'Dinner' },
]

export function RecipesView() {
  const [plan, setPlan] = useState<WeeklyPlanRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [makeThisMeal, setMakeThisMeal] = useState<{ title: string; prepNote: string } | null>(null)

  useEffect(() => {
    fetch('/api/food/weekly-plan')
      .then(r => r.json())
      .then(d => setPlan(d.plan))
      .finally(() => setLoading(false))
  }, [])

  async function generatePlan() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/ai/weekly-meal-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not generate a plan')
      const refreshed = await fetch('/api/food/weekly-plan').then(r => r.json())
      setPlan(refreshed.plan)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  const allMeals = useMemo(() => {
    if (!plan) return []
    const p = plan.plan_json
    const out: { id: string; dayLabel: string; typeLabel: string; title: string; note: string; calories: number; proteinG: number }[] = []
    for (const day of DAY_ORDER) {
      for (const mt of MEAL_TYPES) {
        const entry = p[mt.key]?.find(m => m.day === day)
        if (entry) {
          out.push({
            id: `${day}-${mt.key}`, dayLabel: day, typeLabel: mt.label, title: entry.meal,
            note: entry.prep_note, calories: entry.calories ?? 0, proteinG: entry.protein_g ?? 0,
          })
        }
      }
    }
    return out
  }, [plan])

  function handleScroll() {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goTo(i: number) {
    const el = scrollerRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(allMeals.length - 1, i))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }

  if (loading) return <div className={styles.comingSoon}>Loading your recipes…</div>

  if (!plan) {
    return (
      <div className={styles.generateCard}>
        <Soup size={22} />
        <p>No meal plan generated for this week yet.</p>
        <button type="button" className={styles.generateButton} onClick={generatePlan} disabled={generating}>
          {generating && <Loader2 size={14} className="animate-spin" />}
          {generating ? 'Generating…' : "Generate This Week's Plan"}
        </button>
        {genError && <p className={styles.errorText}>{genError}</p>}
      </div>
    )
  }

  if (allMeals.length === 0) return <div className={styles.comingSoon}>No meals in this week&apos;s plan.</div>

  const current = allMeals[index]

  return (
    <>
      <div className={styles.recipeNav}>
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous meal"><ChevronLeft size={16} /></button>
        <span className={styles.recipeCounter}>{current.dayLabel} · {current.typeLabel} — {index + 1} of {allMeals.length}</span>
        <button type="button" onClick={() => goTo(index + 1)} disabled={index === allMeals.length - 1} aria-label="Next meal"><ChevronRight size={16} /></button>
      </div>
      <div className={styles.mealPager} ref={scrollerRef} onScroll={handleScroll}>
        {allMeals.map(meal => (
          <div key={meal.id} className={styles.mealPage}>
            <div className={`${styles.card} ${styles.mealCard}`}>
              <div className={styles.mealPhoto}>
                <Image src={imageForMeal(meal.title)} alt={meal.title} fill sizes="(max-width: 640px) 90vw, 400px" />
              </div>
              <div className={styles.mealLabel}>{meal.dayLabel} · {meal.typeLabel}</div>
              <h3 className={styles.mealTitle}>{meal.title}</h3>
              <p className={styles.mealDescription}>{meal.note}</p>
              <div className={styles.mealStats}>
                <span><Droplet size={13} /> {meal.calories} cal</span>
                <span><Beef size={13} /> {meal.proteinG}g protein</span>
              </div>
              <button type="button" className={styles.makeThisButton} onClick={() => setMakeThisMeal({ title: meal.title, prepNote: meal.note })}>
                <ChefHat size={14} /> Make This
              </button>
            </div>
          </div>
        ))}
      </div>

      {makeThisMeal && (
        <RecipeDetailSheet title={makeThisMeal.title} prepNote={makeThisMeal.prepNote} onClose={() => setMakeThisMeal(null)} />
      )}
    </>
  )
}
