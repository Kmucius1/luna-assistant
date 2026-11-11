'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ShoppingCart } from 'lucide-react'
import styles from './FoodViews.module.css'
import { ZOE_PANTRY_STAPLES } from '@/lib/luna/pantryStaples'

interface GroceryItem { item: string; quantity: string }
interface GroceryList {
  produce: GroceryItem[]; protein: GroceryItem[]; dairy: GroceryItem[]
  bakery_and_grains: GroceryItem[]; pantry: GroceryItem[]; frozen: GroceryItem[]
}
interface WeeklyPlanRow { plan_json: { grocery_list: GroceryList }; checked_items: string[] }

const CATEGORY_LABELS: Record<keyof GroceryList, string> = {
  produce: 'Produce', protein: 'Protein', dairy: 'Dairy',
  bakery_and_grains: 'Bakery & Grains', pantry: 'Pantry', frozen: 'Frozen',
}

export function GroceriesView() {
  const [plan, setPlan] = useState<WeeklyPlanRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/food/weekly-plan')
      .then(r => r.json())
      .then(d => setPlan(d.plan))
      .finally(() => setLoading(false))
  }, [])

  async function toggleChecked(key: string, groceryItem: GroceryItem) {
    if (!plan) return
    const checked = new Set(plan.checked_items)
    const wasChecked = checked.has(key)
    if (wasChecked) checked.delete(key)
    else checked.add(key)
    const next = Array.from(checked)
    setPlan({ ...plan, checked_items: next })
    await fetch('/api/food/weekly-plan', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked_items: next }),
    })
    // Checking an item off means "I have it now" — confirm it into inventory.
    // A staple restock must update the SAME staple row the Sunday check-in
    // reads, not insert a second untagged row (which the staples query would
    // never see, silently leaving it marked low/empty).
    if (!wasChecked) {
      const staple = ZOE_PANTRY_STAPLES.find(s => s.name.toLowerCase() === groceryItem.item.toLowerCase())
      if (staple) {
        await fetch('/api/food/pantry/staples', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statuses: { [staple.name]: 'in_stock' } }),
        })
      } else {
        await fetch('/api/food/pantry', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ name: groceryItem.item, quantity: groceryItem.quantity, source: 'grocery_list' }] }),
        })
      }
    }
  }

  if (loading) return <div className={styles.comingSoon}>Loading your list…</div>
  if (!plan) return (
    <div className={styles.comingSoon}>
      <div>
        <ShoppingCart size={22} style={{ marginBottom: 8 }} />
        <p>Generate a meal plan first — your grocery list is built from it.</p>
        <Link href="/food" className={styles.generateButton}>Go to Meal Plan</Link>
      </div>
    </div>
  )

  const allKeys = (Object.keys(plan.plan_json.grocery_list ?? {}) as (keyof GroceryList)[])
    .flatMap(cat => (plan.plan_json.grocery_list[cat] ?? []).map(g => `${cat}:${g.item}`))
  const leftCount = allKeys.filter(k => !plan.checked_items.includes(k)).length

  return (
    <>
      <div className={styles.sectionHeader}>
        {allKeys.length === 0 ? 'Grocery List' : leftCount === 0 ? 'All done — everything is checked off' : `${leftCount} of ${allKeys.length} items left`}
      </div>
      {(Object.keys(plan.plan_json.grocery_list ?? {}) as (keyof GroceryList)[]).map(cat => {
        const list = plan.plan_json.grocery_list[cat]
        if (!list?.length) return null
        return (
          <div key={cat}>
            <div className={styles.groceryGroupLabel}>{CATEGORY_LABELS[cat]}</div>
            {list.map(g => {
              const key = `${cat}:${g.item}`
              const checked = plan.checked_items.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.groceryRow} ${checked ? styles.groceryRowChecked : ''}`}
                  onClick={() => toggleChecked(key, g)}
                >
                  <span className={styles.groceryCheck}>{checked && <Check size={12} />}</span>
                  <span className={styles.groceryName}>{g.item}</span>
                  <span className={styles.groceryQty}>{g.quantity}</span>
                </button>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
