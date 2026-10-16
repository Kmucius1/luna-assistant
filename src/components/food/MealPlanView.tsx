'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Beef, CheckCircle2, ChefHat, Circle, Clock, Droplet, Flame, Loader2, PlusCircle, Soup, Sparkles, X } from 'lucide-react'

import { NUTRITION_GOALS } from '@/lib/luna/todayMeals'
import { imageForMeal } from '@/lib/luna/mealImages'
import { RecipeDetailSheet } from './RecipeDetailSheet'
import { LogMealSheet } from './LogMealSheet'
import styles from './FoodViews.module.css'

interface MealEntry { day: string; meal: string; prep_note: string; calories?: number; protein_g?: number }
interface WeeklyPlanJson {
  breakfasts: MealEntry[]
  lunches: MealEntry[]
  dinners: MealEntry[]
}
interface WeeklyPlanRow { plan_json: WeeklyPlanJson }
interface WhatCanIEatOption { type: string; title: string; minutes: number; steps: string[]; missing_ingredients: string[] }
interface LogEntry { id: string; meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; source: 'planned' | 'custom'; title: string; calories: number; protein_g: number }
interface CookedLeftover { id: string; meal_name: string; cooked_at: string; safe_until: string; isPastSafeWindow: boolean }

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

const MOODS = ['Just hungry', 'Tired', 'Overwhelmed', "Don't feel like cooking"] as const

function todayWeekdayName(): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
}

export function MealPlanView() {
  const [plan, setPlan] = useState<WeeklyPlanRow | null>(null)
  const [planLoading, setPlanLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>(todayWeekdayName())

  const mealScrollerRef = useRef<HTMLDivElement>(null)
  const [mealIndex, setMealIndex] = useState(0)
  const [makeThisMeal, setMakeThisMeal] = useState<{ title: string; prepNote: string } | null>(null)

  const [wceOpen, setWceOpen] = useState(false)
  const [wceMood, setWceMood] = useState<string>(MOODS[0])
  const [wceLoading, setWceLoading] = useState(false)
  const [wceError, setWceError] = useState<string | null>(null)
  const [wceOptions, setWceOptions] = useState<WhatCanIEatOption[] | null>(null)

  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [loggingMeal, setLoggingMeal] = useState<string | null>(null)
  const [logSheetOpen, setLogSheetOpen] = useState(false)

  const [leftovers, setLeftovers] = useState<CookedLeftover[]>([])
  const [savingLeftover, setSavingLeftover] = useState<string | null>(null)

  const loadLog = () => {
    fetch('/api/food/log', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setLogEntries(d.entries ?? []))
      .catch(() => {})
  }

  const loadLeftovers = () => {
    fetch('/api/food/cooked-leftovers', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setLeftovers(d.leftovers ?? []))
      .catch(() => {})
  }

  async function saveLeftover(meal: { id: string; title: string }) {
    setSavingLeftover(meal.id)
    try {
      await fetch('/api/food/cooked-leftovers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_name: meal.title, meal_type: meal.id }),
      })
      loadLeftovers()
    } finally {
      setSavingLeftover(null)
    }
  }

  async function resolveLeftover(id: string, status: 'consumed' | 'discarded' | 'frozen') {
    setLeftovers(prev => prev.filter(l => l.id !== id))
    await fetch(`/api/food/cooked-leftovers/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    }).catch(() => loadLeftovers())
  }

  useEffect(() => {
    fetch('/api/food/weekly-plan')
      .then(r => r.json())
      .then(d => setPlan(d.plan))
      .finally(() => setPlanLoading(false))
    loadLog()
    loadLeftovers()
  }, [])

  async function generatePlan() {
    if (plan && !window.confirm('Replace this week\'s plan with a new one? Your current plan will be overwritten.')) return
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

  async function askWhatCanIEat() {
    setWceLoading(true)
    setWceError(null)
    setWceOptions(null)
    try {
      const res = await fetch('/api/ai/what-can-i-eat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mood: wceMood }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not figure that out')
      setWceOptions(data.options ?? [])
    } catch (e) {
      setWceError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setWceLoading(false)
    }
  }

  const todayName = todayWeekdayName()
  const isToday = selectedDay === todayName
  const todaysMeals = useMemo(() => {
    if (!plan) return []
    const p = plan.plan_json
    const items: { id: string; label: string; title: string; description: string; calories: number; proteinG: number }[] = []
    const b = p.breakfasts?.find(m => m.day === selectedDay)
    if (b) items.push({ id: 'breakfast', label: 'Breakfast', title: b.meal, description: b.prep_note, calories: b.calories ?? 0, proteinG: b.protein_g ?? 0 })
    const l = p.lunches?.find(m => m.day === selectedDay)
    if (l) items.push({ id: 'lunch', label: 'Lunch', title: l.meal, description: l.prep_note, calories: l.calories ?? 0, proteinG: l.protein_g ?? 0 })
    const d = p.dinners?.find(m => m.day === selectedDay)
    if (d) items.push({ id: 'dinner', label: 'Dinner', title: d.meal, description: d.prep_note, calories: d.calories ?? 0, proteinG: d.protein_g ?? 0 })
    return items
  }, [plan, selectedDay])

  // Nutrition goals track what's actually been logged today, not just what's
  // planned — a planned meal she skips (or swaps for something off-plan)
  // shouldn't silently count toward her totals.
  const totals = useMemo(() => ({
    calories: logEntries.reduce((s, e) => s + (e.calories || 0), 0),
    proteinG: logEntries.reduce((s, e) => s + (e.protein_g || 0), 0),
  }), [logEntries])

  const loggedPlanned = useMemo(() => {
    const map = new Map<string, LogEntry>()
    for (const e of logEntries) {
      if (e.source === 'planned' && !map.has(e.meal_type)) map.set(e.meal_type, e)
    }
    return map
  }, [logEntries])

  async function toggleMealLogged(meal: { id: string; title: string; calories: number; proteinG: number }) {
    const existing = loggedPlanned.get(meal.id)
    setLoggingMeal(meal.id)
    try {
      if (existing) {
        await fetch(`/api/food/log/${existing.id}`, { method: 'DELETE' })
      } else {
        await fetch('/api/food/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meal_type: meal.id, mode: 'planned', title: meal.title, calories: meal.calories, protein_g: meal.proteinG }),
        })
      }
      loadLog()
    } finally {
      setLoggingMeal(null)
    }
  }

  async function removeLogEntry(id: string) {
    setLogEntries(prev => prev.filter(e => e.id !== id))
    fetch(`/api/food/log/${id}`, { method: 'DELETE' }).catch(() => loadLog())
  }

  function handleMealScroll() {
    const el = mealScrollerRef.current
    if (!el || el.clientWidth === 0) return
    setMealIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function pickDay(day: string) {
    setSelectedDay(day)
    setMealIndex(0)
    mealScrollerRef.current?.scrollTo({ left: 0 })
  }

  function goToMeal(i: number) {
    const el = mealScrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <>
      {planLoading ? (
        <div className={styles.comingSoon}>Loading your plan…</div>
      ) : !plan ? (
        <div className={styles.generateCard}>
          <Soup size={22} />
          <p>No meal plan generated for this week yet.</p>
          <button type="button" className={styles.generateButton} onClick={generatePlan} disabled={generating}>
            {generating && <Loader2 size={14} className="animate-spin" />}
            {generating ? 'Generating…' : "Generate This Week's Plan"}
          </button>
          {genError && <p className={styles.errorText}>{genError}</p>}
        </div>
      ) : (
        <>
          <div className={styles.wceMoodRow} role="tablist" aria-label="Pick a day">
            {WEEKDAYS.map(day => (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={day === selectedDay}
                className={`${styles.wceMoodChip} ${day === selectedDay ? styles.wceMoodChipActive : ''}`}
                onClick={() => pickDay(day)}
              >
                {day.slice(0, 3)}{day === todayName ? ' •' : ''}
              </button>
            ))}
          </div>
          {todaysMeals.length === 0 ? (
            <div className={styles.comingSoon}>No meals planned for {isToday ? 'today' : selectedDay}. Check Groceries, or generate a new week.</div>
          ) : (
          <>
          <div className={styles.sectionHeader}>{isToday ? "Today's Meals" : `${selectedDay}'s Meals`}</div>
          <div className={styles.mealPager} ref={mealScrollerRef} onScroll={handleMealScroll}>
            {todaysMeals.map(meal => {
              const isLogged = loggedPlanned.has(meal.id)
              return (
                <div key={meal.id} className={styles.mealPage}>
                  <div className={`${styles.card} ${styles.mealCard}`}>
                    <div className={styles.mealPhoto}>
                      <Image src={imageForMeal(meal.title)} alt={meal.title} fill sizes="(max-width: 640px) 90vw, 400px" />
                      {isToday && <button
                        type="button"
                        className={`${styles.mealCheckButton} ${isLogged ? styles.mealCheckButtonDone : ''}`}
                        onClick={() => toggleMealLogged(meal)}
                        disabled={loggingMeal === meal.id}
                        aria-label={isLogged ? `Unmark ${meal.label} as eaten` : `Mark ${meal.label} as eaten`}
                      >
                        {isLogged ? <CheckCircle2 size={16} /> : <Circle size={16} />} {isLogged ? 'Eaten' : 'Mark eaten'}
                      </button>}
                    </div>
                    <div className={styles.mealLabel}>{meal.label}</div>
                    <h3 className={styles.mealTitle}>{meal.title}</h3>
                    <p className={styles.mealDescription}>{meal.description}</p>
                    <div className={styles.mealStats}>
                      <span><Droplet size={13} /> {meal.calories} cal</span>
                      <span><Beef size={13} /> {meal.proteinG}g protein</span>
                    </div>
                    <button type="button" className={styles.makeThisButton} onClick={() => setMakeThisMeal({ title: meal.title, prepNote: meal.description })}>
                      <ChefHat size={14} /> Make This
                    </button>
                    {isToday && meal.id !== 'breakfast' && (
                      <button type="button" className={styles.makeThisButton} onClick={() => saveLeftover(meal)} disabled={savingLeftover === meal.id}>
                        <Soup size={14} /> {savingLeftover === meal.id ? 'Saving…' : 'Save leftovers (safe 4 days)'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {todaysMeals.length > 1 && (
            <div className={styles.mealDots}>
              {todaysMeals.map((meal, i) => (
                <button
                  key={meal.id}
                  type="button"
                  className={`${styles.mealDot} ${i === mealIndex ? styles.mealDotActive : ''}`}
                  onClick={() => goToMeal(i)}
                  aria-label={`${meal.label}`}
                />
              ))}
            </div>
          )}

          {leftovers.length > 0 && (
            <div className={styles.card}>
              <div className={styles.sectionHeader} style={{ marginBottom: 10 }}>Cooked Leftovers</div>
              {leftovers.map(lo => (
                <div key={lo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{lo.meal_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11.5, color: lo.isPastSafeWindow ? '#B23B3B' : 'var(--ink-3, #5E5474)' }}>
                      {lo.isPastSafeWindow ? `Past safe window (was safe until ${lo.safe_until}) — discard or confirm frozen` : `Safe until ${lo.safe_until}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => resolveLeftover(lo.id, 'consumed')} style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', background: 'transparent', cursor: 'pointer' }}>Used it</button>
                    <button type="button" onClick={() => resolveLeftover(lo.id, 'frozen')} style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 10, border: '1px solid rgba(180,150,100,0.2)', background: 'transparent', cursor: 'pointer' }}>Froze it</button>
                    <button type="button" onClick={() => resolveLeftover(lo.id, 'discarded')} style={{ fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 10, border: '1px solid rgba(224,94,94,0.3)', color: '#B23B3B', background: 'transparent', cursor: 'pointer' }}>Discard</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.sectionHeader} style={{ marginBottom: 10 }}>Daily Nutrition Goals</div>
            <div className={styles.nutritionGrid}>
              <div className={styles.nutritionStat}>
                <div><Flame size={15} /><strong>{totals.calories.toLocaleString()}</strong></div>
                <small>/{NUTRITION_GOALS.calories.toLocaleString()} cal</small>
                <div className={styles.nutritionTrack}><div className={styles.nutritionFill} style={{ width: `${Math.min(100, (totals.calories / NUTRITION_GOALS.calories) * 100)}%` }} /></div>
              </div>
              <div className={styles.nutritionStat}>
                <div><Beef size={15} /><strong>{totals.proteinG}g</strong></div>
                <small>/{NUTRITION_GOALS.proteinG}g protein</small>
                <div className={styles.nutritionTrack}><div className={styles.nutritionFill} style={{ width: `${Math.min(100, (totals.proteinG / NUTRITION_GOALS.proteinG) * 100)}%` }} /></div>
              </div>
            </div>
          </div>

          <button type="button" className={styles.generateButton} onClick={generatePlan} disabled={generating}>
            {generating && <Loader2 size={14} className="animate-spin" />}
            {generating ? 'Regenerating…' : 'Regenerate this week'}
          </button>
          </>
          )}
        </>
      )}

      {logEntries.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionHeader} style={{ marginBottom: 8 }}>Today&apos;s Log</div>
          {logEntries.map(entry => (
            <div key={entry.id} className={styles.logRow}>
              <div className={styles.logRowText}>
                <strong>{entry.title}</strong>
                <span>{entry.calories} cal · {entry.protein_g}g protein{entry.source === 'planned' ? ` · ${entry.meal_type}` : ''}</span>
              </div>
              <button type="button" className={styles.logRowRemove} onClick={() => removeLogEntry(entry.id)} aria-label={`Remove ${entry.title}`}>
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.bottomActionRow}>
        <button type="button" className={styles.wceToggle} onClick={() => setWceOpen(o => !o)}>
          <Sparkles size={14} /> What can I eat right now?
        </button>
        <button type="button" className={styles.logMealButton} onClick={() => setLogSheetOpen(true)}>
          <PlusCircle size={14} /> Log meal
        </button>
      </div>

      {wceOpen && (
        <div className={styles.card}>
          <div className={styles.wceMoodRow}>
            {MOODS.map(m => (
              <button key={m} type="button" className={`${styles.wceMoodChip} ${wceMood === m ? styles.wceMoodChipActive : ''}`} onClick={() => setWceMood(m)}>
                {m}
              </button>
            ))}
          </div>
          <button type="button" className={styles.generateButton} style={{ marginTop: 10 }} onClick={askWhatCanIEat} disabled={wceLoading}>
            {wceLoading && <Loader2 size={14} className="animate-spin" />}
            {wceLoading ? 'Thinking…' : 'Show me options'}
          </button>
          {wceError && <p className={styles.errorText}>{wceError}</p>}
          {wceOptions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              {wceOptions.map((opt, i) => (
                <div key={i} className={styles.wceOption}>
                  <div className={styles.wceOptionHeader}>
                    <span className={styles.wceOptionType}>{opt.type.replace(/_/g, ' ')}</span>
                    <span className={styles.wceOptionTime}><Clock size={11} /> {opt.minutes} min</span>
                  </div>
                  <h4>{opt.title}</h4>
                  <ol className={styles.wceSteps}>{opt.steps.map((s, si) => <li key={si}>{s}</li>)}</ol>
                  {opt.missing_ingredients.length > 0 ? (
                    <p className={styles.wceMissing}>Missing: {opt.missing_ingredients.join(', ')}</p>
                  ) : (
                    <p className={styles.wceHave}>You have everything for this one.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {makeThisMeal && (
        <RecipeDetailSheet title={makeThisMeal.title} prepNote={makeThisMeal.prepNote} onClose={() => setMakeThisMeal(null)} />
      )}

      <LogMealSheet
        isOpen={logSheetOpen}
        onClose={() => setLogSheetOpen(false)}
        onLogged={() => { loadLog(); setLogSheetOpen(false) }}
      />
    </>
  )
}
