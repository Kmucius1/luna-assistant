'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import styles from './FoodViews.module.css'

interface FoodProfile { favorite_meals: Record<string, string[]> | null }

const CATEGORY_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', chicken: 'Chicken', salmon_and_other: 'Salmon & Other', snacks: 'Snacks',
}

export function FavoritesView() {
  const [profile, setProfile] = useState<FoodProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/food/profile')
      .then(r => r.json())
      .then(d => setProfile(d.profile))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.comingSoon}>Loading your favorites…</div>

  const meals = profile?.favorite_meals
  if (!meals || Object.keys(meals).length === 0) {
    return (
      <div className={styles.comingSoon}>
        <div>
          <Heart size={22} style={{ marginBottom: 8 }} />
          <p>No favorites saved yet — tell Luna what you love and it'll show up here.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {Object.entries(meals).map(([category, dishes]) => (
        <div key={category} className={styles.favoriteGroup}>
          <div className={styles.groceryGroupLabel}>{CATEGORY_LABELS[category] ?? category}</div>
          <div className={styles.favoriteChips}>
            {dishes.map(dish => (
              <span key={dish} className={styles.favoriteChip}>{dish}</span>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
