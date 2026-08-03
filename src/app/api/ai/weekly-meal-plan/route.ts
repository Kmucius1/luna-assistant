import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { ZOE_LIFESTYLE_PROFILE } from '@/lib/luna/zoeLifestyleProfile'
import { createClient } from '@/lib/supabase/server'
import { FoodProfile, formatFoodProfileForPrompt, mergedNeverFoods } from '@/lib/luna/foodProfile'

function buildSystem(foodProfileText: string, neverFoods: string[]): string {
  return `You are Luna, Zoe's personal meal planner and grocery assistant.

${ZOE_LIFESTYLE_PROFILE}

${foodProfileText ? `Zoe's Food Profile — her real favorites, brand preferences, and cooking notes:\n${foodProfileText}\n` : ''}

Create realistic meals Zoe will actually eat. NEVER include anything from this never-suggest list: ${neverFoods.join(', ')}.
Do not silently replace her preferences with generic fitness foods.
Write every recipe/prep_note at real restaurant/chef quality — actual seasonings, actual technique (searing, dredging, sauce-building steps), not vague instructions like "season to taste" or "cook until done." Use the cooking technique notes above whenever a dish matches one of them.
Keep meals practical for a 5:00 AM wake-up, 5:45 AM gym arrival, and protected work hours from 10:00 AM to 6:00 PM.

Return ONLY valid JSON in this shape:
{
  "week_summary": "short explanation of the plan",
  "breakfasts": [{ "day": "Monday", "meal": "...", "prep_note": "...", "calories": 420, "protein_g": 32 }],
  "lunches": [{ "day": "Monday", "meal": "...", "prep_note": "...", "calories": 550, "protein_g": 45 }],
  "dinners": [{ "day": "Monday", "meal": "...", "prep_note": "...", "calories": 650, "protein_g": 50 }],
  "snacks": [{ "name": "...", "pairing_note": "..." }],
  "grocery_list": {
    "produce": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "protein": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "dairy": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "bakery_and_grains": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "pantry": [{ "item": "...", "quantity": "...", "used_for": ["..."] }],
    "frozen": [{ "item": "...", "quantity": "...", "used_for": ["..."] }]
  },
  "prep_plan": [{ "when": "Sunday", "task": "...", "minutes": 20 }],
  "estimated_waste_savers": ["ingredient reuse note"],
  "meals_out": [{ "day": "...", "plan": "..." }]
}`
}

function mondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const {
      breakfastsAtHome = 7,
      lunchesAtHome = 7,
      dinnersAtHome = 7,
      people = 1,
      groceryBudget = '',
      mealsOut = '',
      cravings = '',
      temporaryDislikes = '',
      notes = '',
    } = body

    const [{ data: pantryRows }, { data: recentPlans }, { data: foodProfileRow }] = await Promise.all([
      supabase.from('food_pantry_items').select('name, expires_on').eq('user_id', user.id).is('consumed_at', null),
      supabase.from('food_weekly_plans').select('plan_json').eq('user_id', user.id).order('week_start', { ascending: false }).limit(2),
      supabase.from('food_profile').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    const foodProfile = (foodProfileRow ?? null) as FoodProfile | null
    const foodProfileText = formatFoodProfileForPrompt(foodProfile)
    const neverFoods = mergedNeverFoods(foodProfile)

    const pantry = (pantryRows ?? []) as { name: string; expires_on: string | null }[]
    const pantryItems = pantry.map(r => r.name)
    const expiringSoon = pantry
      .filter(r => r.expires_on && new Date(r.expires_on).getTime() - Date.now() < 4 * 86_400_000)
      .map(r => r.name)

    const recentMealTitles = ((recentPlans ?? []) as { plan_json: unknown }[]).flatMap((row) => {
      const plan = row.plan_json as { breakfasts?: { meal: string }[]; lunches?: { meal: string }[]; dinners?: { meal: string }[] } | null
      if (!plan) return []
      return [...(plan.breakfasts ?? []), ...(plan.lunches ?? []), ...(plan.dinners ?? [])].map(m => m.meal)
    })

    const prompt = `Build Zoe's meal plan for this week.

Breakfasts at home: ${breakfastsAtHome}
Lunches at home: ${lunchesAtHome}
Dinners at home: ${dinnersAtHome}
People eating: ${people}
Grocery budget: ${groceryBudget || 'No budget supplied'}
Known meals out: ${mealsOut || 'None supplied'}
Current cravings: ${cravings || 'Use her stored favorites'}
Temporary dislikes or foods to skip this week: ${temporaryDislikes || 'None'}
Other notes: ${notes || 'None'}

Currently in her fridge/pantry: ${pantryItems.length ? pantryItems.join(', ') : 'Nothing logged yet'}
${expiringSoon.length ? `Expiring soon — strongly prefer recipes that use these up: ${expiringSoon.join(', ')}` : ''}
${recentMealTitles.length ? `Do not repeat any of these recent meals: ${recentMealTitles.join(', ')}` : ''}

Rules:
- Return exactly the requested number of breakfasts, lunches, and dinners.
- Favor recipes that use what's already in her fridge/pantry before adding new grocery items — this reduces waste and cost.
- Use repeated ingredients intelligently so the grocery list is not wasteful.
- The grocery list should only include items not already sufficiently in her pantry.
- Whenever chicken appears on the grocery list, name the brand from her Food Profile if one is set.
- Always include her daily tea (per her Food Profile behavior rules) as a recurring grocery/staple check if she's low on it.
- Give a realistic calories and protein_g estimate for every breakfast/lunch/dinner.
- Keep breakfast realistic before or after her early gym session.
- Lunch must fit inside her 10:00 AM to 6:00 PM workday.
- Greek yogurt must be paired with granola, not berries.
- Frozen blueberries with peanut butter and PB&J sandwiches are welcome options.
- Favor her Food Profile favorites and real chef technique/seasoning notes over generic suggestions.`

    const raw = await callAI(buildSystem(foodProfileText, neverFoods), prompt, 3800)
    const parsed = parseAIJson(raw)

    const weekStart = mondayOf(new Date())
    const { error: upsertError } = await supabase
      .from('food_weekly_plans')
      .upsert({ user_id: user.id, week_start: weekStart, plan_json: parsed, checked_items: [] }, { onConflict: 'user_id,week_start' })
    if (upsertError) throw upsertError

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[weekly-meal-plan]', message)
    return NextResponse.json(
      { error: 'Could not build the weekly meal plan.', detail: message },
      { status: 500 },
    )
  }
}
