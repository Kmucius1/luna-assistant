import type { SupabaseClient } from '@supabase/supabase-js'
import { ZOE_PANTRY_STAPLES } from './pantryStaples'

// Real automatic depletion — logging a meal she actually ate nudges any
// staple whose matchKeywords appear in the meal title one step toward
// empty (in_stock -> low -> empty), without her tapping a status by hand.
// Deliberately a nudge, not an instant empty: one meal rarely exhausts a
// whole staple, but repeated real use trends it toward empty for real.
export async function depleteStaplesFromMealTitle(
  supabase: SupabaseClient,
  userId: string,
  mealTitle: string,
): Promise<void> {
  const titleLower = mealTitle.toLowerCase()
  const matched = ZOE_PANTRY_STAPLES.filter(s =>
    (s.matchKeywords ?? []).some(kw => titleLower.includes(kw)),
  )
  if (matched.length === 0) return

  try {
    const { data: existingRows } = await supabase
      .from('food_pantry_items')
      .select('id, name, status')
      .eq('user_id', userId)
      .not('staple_group', 'is', null)
      .is('consumed_at', null)

    const existingByName = new Map((existingRows ?? []).map((r: { id: string; name: string; status: string | null }) => [r.name.toLowerCase(), r]))

    for (const staple of matched) {
      const existing = existingByName.get(staple.name.toLowerCase())
      const currentStatus = existing?.status ?? 'in_stock'
      const nextStatus = currentStatus === 'in_stock' ? 'low' : currentStatus === 'low' ? 'empty' : 'empty'

      if (existing) {
        await supabase.from('food_pantry_items').update({ status: nextStatus }).eq('id', existing.id).eq('user_id', userId)
      } else {
        const storage = staple.category === 'frozen' ? 'freezer' : staple.category === 'pantry' || staple.category === 'bakery_and_grains' ? 'pantry' : 'fridge'
        await supabase.from('food_pantry_items').insert({
          user_id: userId, name: staple.name, category: staple.category, storage,
          status: nextStatus, staple_group: staple.group, source: 'manual',
        })
      }
    }
  } catch {
    // Staple columns may not exist yet, or the update failed for some other
    // reason — meal logging itself must never fail because of this.
  }
}
