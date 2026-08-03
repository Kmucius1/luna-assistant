'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ChefHat, ChevronLeft, ChevronRight, Clock, List, Loader2, Users, X } from 'lucide-react'

import { imageForMeal } from '@/lib/luna/mealImages'
import styles from './FoodViews.module.css'

interface RecipeDetail {
  servings: string
  prep_minutes: number
  cook_minutes: number
  ingredients: { item: string; quantity: string }[]
  steps: string[]
}

interface RecipeDetailSheetProps {
  title: string
  prepNote: string
  onClose: () => void
}

export function RecipeDetailSheet({ title, prepNote, onClose }: RecipeDetailSheetProps) {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'steps'>('list')
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/ai/recipe-detail', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, prep_note: prepNote }),
    })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Could not build this recipe')
        setRecipe(data)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Something went wrong'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])

  return (
    <div className={styles.previewOverlay} onClick={onClose}>
      <div className={styles.recipeSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.recipePhoto}>
          <Image src={imageForMeal(title)} alt={title} fill sizes="(max-width: 640px) 100vw, 480px" />
          <button type="button" className={styles.recipeClose} onClick={onClose} aria-label="Close"><X size={16} /></button>
          <div className={styles.recipePhotoOverlay} />
          <h2 className={styles.recipeTitle}>{title}</h2>
        </div>

        <div className={styles.recipeBody}>
          {loading ? (
            <div className={styles.comingSoon}><Loader2 size={18} className="animate-spin" /> Building your recipe…</div>
          ) : error || !recipe ? (
            <p className={styles.errorText}>{error ?? 'Something went wrong'}</p>
          ) : (
            <>
              <div className={styles.recipeMeta}>
                <span><Users size={13} /> {recipe.servings} serving{recipe.servings === '1' ? '' : 's'}</span>
                <span><Clock size={13} /> {recipe.prep_minutes + recipe.cook_minutes} min total</span>
              </div>

              <div className={styles.recipeModeToggle}>
                <button type="button" className={mode === 'list' ? styles.recipeModeActive : ''} onClick={() => setMode('list')}><List size={13} /> List</button>
                <button type="button" className={mode === 'steps' ? styles.recipeModeActive : ''} onClick={() => { setMode('steps'); setStepIndex(0) }}><ChefHat size={13} /> Step-by-step</button>
              </div>

              <div className={styles.sectionHeader}>Ingredients</div>
              <ul className={styles.recipeIngredients}>
                {recipe.ingredients.map((ing, i) => <li key={i}><span>{ing.quantity}</span> {ing.item}</li>)}
              </ul>

              {mode === 'list' ? (
                <>
                  <div className={styles.sectionHeader}>Steps</div>
                  <ol className={styles.recipeStepsList}>
                    {recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </>
              ) : (
                <div className={styles.recipeStepWalkthrough}>
                  <div className={styles.recipeStepCounter}>Step {stepIndex + 1} of {recipe.steps.length}</div>
                  <p className={styles.recipeStepText}>{recipe.steps[stepIndex]}</p>
                  <div className={styles.recipeStepNav}>
                    <button type="button" onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0}><ChevronLeft size={16} /> Back</button>
                    <button type="button" onClick={() => setStepIndex(i => Math.min(recipe.steps.length - 1, i + 1))} disabled={stepIndex === recipe.steps.length - 1}>Next <ChevronRight size={16} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
