'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Beef,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Droplet,
  Heart,
  Moon,
  Package,
  Quote,
  ShoppingCart,
  Soup,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import { NUTRITION_GOALS, TODAY_MEALS, todayNutritionTotals } from '@/lib/luna/todayMeals'
import styles from './LunaFoodPage.module.css'

const FOOD_QUOTES = [
  'Good nutrition is an investment in yourself.',
  'Eat food that loves you back.',
  'Fuel the body you want to live in.',
  'Small, consistent meals build a strong week.',
  'Food is information — feed your body well.',
]

const MEAL_ICON = { breakfast: Sun, post_gym: Dumbbell, lunch: Sun, dinner: Moon } as const

const TABS = [
  { id: 'meal_plan', label: 'Meal Plan', icon: Soup },
  { id: 'recipes', label: 'Recipes', icon: BookOpen },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { id: 'pantry', label: 'Pantry', icon: Package },
  { id: 'favorites', label: 'Favorites', icon: Heart },
] as const

type TabId = typeof TABS[number]['id']

function dayIndex(offset: number): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime()
  return Math.floor((Date.now() - start) / 86_400_000) + offset
}

function dateLabelFor(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d)
}

export function LunaFoodPage() {
  const [dayOffset, setDayOffset] = useState(0)
  const [activeTab, setActiveTab] = useState<TabId>('meal_plan')

  const quote = FOOD_QUOTES[dayIndex(0) % FOOD_QUOTES.length]
  const dateLabel = useMemo(() => dateLabelFor(dayOffset), [dayOffset])
  const activeTabMeta = TABS.find(t => t.id === activeTab)!
  const totals = todayNutritionTotals()

  return (
    <AppLayout noPad noScroll>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.headerPhoto}>
            <Image src="/images/rooms/food.jpg" alt="Food" fill sizes="(max-width: 640px) 100vw, 640px" priority />
          </div>
          <Link href="/today" className={styles.headerBack}><ChevronLeft size={16} /> Back</Link>
          <div className={styles.headerContent}>
            <UtensilsCrossed size={22} strokeWidth={1.5} />
            <h1>FOOD</h1>
            <p className={styles.headerTagline}>Fuel your body. Elevate your life.</p>
          </div>
        </div>

        <div className={styles.quoteCard}>
          <Quote size={16} />
          <p>{quote}</p>
        </div>

        <div className={styles.dateRow}>
          <div className={styles.datePill}>
            <button type="button" onClick={() => setDayOffset(o => o - 1)} aria-label="Previous day"><ChevronLeft size={15} /></button>
            {dateLabel}
            <button type="button" onClick={() => setDayOffset(o => o + 1)} aria-label="Next day"><ChevronRight size={15} /></button>
          </div>
          <div className={styles.mealPlanPill}>{activeTabMeta.label} <ChevronRight size={13} style={{ transform: 'rotate(90deg)' }} /></div>
        </div>

        <div className={styles.tabRow}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} strokeWidth={1.6} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === 'meal_plan' ? (
          <>
            <h2 className={styles.sectionHeader}>Today&apos;s Meals</h2>
            <div className={styles.mealsList}>
              {TODAY_MEALS.map(meal => {
                const Icon = MEAL_ICON[meal.mealType]
                return (
                  <div key={meal.id} className={styles.mealCard}>
                    <div className={styles.mealPhoto}><Image src={meal.image} alt={meal.title} fill sizes="84px" /></div>
                    <div className={styles.mealBody}>
                      <div className={styles.mealLabel}><Icon size={12} /> {meal.label}</div>
                      <div className={styles.mealTitleRow}>
                        <h3>{meal.title}</h3>
                        <ChevronRight size={16} />
                      </div>
                      <div className={styles.mealStats}>
                        <span><Droplet size={13} /> {meal.calories} cal</span>
                        <span><Beef size={13} /> {meal.proteinG}g protein</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={styles.nutritionCard}>
              <div className={styles.nutritionHeader}>
                <span className={styles.sectionHeader}>Daily Nutrition Goals</span>
                <ChevronRight size={16} />
              </div>
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
                <div className={styles.nutritionStat}>
                  <div><Droplet size={15} /><strong>{totals.carbsG}g</strong></div>
                  <small>/{NUTRITION_GOALS.carbsG}g carbs</small>
                  <div className={styles.nutritionTrack}><div className={styles.nutritionFill} style={{ width: `${Math.min(100, (totals.carbsG / NUTRITION_GOALS.carbsG) * 100)}%` }} /></div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={styles.comingSoon}>{activeTabMeta.label} is coming soon.</div>
        )}
      </div>
    </AppLayout>
  )
}
