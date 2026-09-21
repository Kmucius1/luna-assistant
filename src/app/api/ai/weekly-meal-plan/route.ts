import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { ZOE_LIFESTYLE_PROFILE, ZOE_MEAL_ROTATION_BY_DAY } from '@/lib/luna/zoeLifestyleProfile'
import { createClient } from '@/lib/supabase/server'
import { FoodProfile, formatFoodProfileForPrompt, mergedNeverFoods } from '@/lib/luna/foodProfile'
import { ZOE_PANTRY_STAPLES, type StapleDef } from '@/lib/luna/pantryStaples'
import { todayKey, mondayKeyOf } from '@/lib/luna/today'

const MEAL_ROTATION_PROSE = Object.entries(ZOE_MEAL_ROTATION_BY_DAY)
  .map(([day, note]) => `- ${day}: ${note}`)
  .join('\n')

function buildSystem(foodProfileText: string, neverFoods: string[], leftoversText: string): string {
  return `You are Luna, Zoe's personal meal planner and grocery assistant.

${ZOE_LIFESTYLE_PROFILE}

${foodProfileText ? `Zoe's Food Profile — her real favorites, brand preferences, and cooking notes:\n${foodProfileText}\n` : ''}

Create realistic meals Zoe will actually eat. NEVER include anything from this never-suggest list: ${neverFoods.join(', ')}.
Do not silently replace her preferences with generic fitness foods.
Write every recipe/prep_note at real restaurant/chef quality — actual seasonings, actual technique (searing, dredging, sauce-building steps), not vague instructions like "season to taste" or "cook until done." Use the cooking technique notes above whenever a dish matches one of them.
Keep meals practical for a 5:00 AM wake-up, 5:45 AM gym arrival, and protected work hours from 10:00 AM to 6:00 PM.

HER WEEKLY MEAL ROTATION — a suggestion pool to draw from, not a rigid requirement. Skip a day's theme whenever real context (cravings, what's on hand, meals out) points somewhere better:
${MEAL_ROTATION_PROSE}

COOKED-LEFTOVER FOOD SAFETY: cooked chicken/protein is only safe as leftovers for 3-4 days refrigerated. Do not suggest reusing a cooked dish as a leftover meal beyond that window unless the prep_note explicitly says a portion was frozen.
${leftoversText}

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

function mondayOf(date: Date): string { return mondayKeyOf(date) }

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

    // Staple status may not exist yet if the pantry-staples migration hasn't
    // been run — fail soft to "no known statuses" rather than erroring the
    // whole weekly plan.
    let stapleStatusByName = new Map<string, string | null>()
    try {
      const { data, error } = await supabase
        .from('food_pantry_items')
        .select('name, status')
        .eq('user_id', user.id)
        .not('staple_group', 'is', null)
        .is('consumed_at', null)
      if (error) throw error
      stapleStatusByName = new Map((data ?? []).map((r: { name: string; status: string | null }) => [r.name.toLowerCase(), r.status]))
    } catch { /* migration not applied yet */ }

    const requiredStaples: StapleDef[] = ZOE_PANTRY_STAPLES.filter(s => {
      const status = stapleStatusByName.get(s.name.toLowerCase())
      return status === 'low' || status === 'empty'
    })
    const wellStockedStaples = ZOE_PANTRY_STAPLES.filter(
      s => stapleStatusByName.get(s.name.toLowerCase()) === 'in_stock',
    )

    // Real cooked-leftover safety facts, not just an advisory rule — may not
    // exist yet if that migration hasn't been run.
    let activeLeftovers: { meal_name: string; cooked_at: string; safe_until: string }[] = []
    try {
      const { data, error } = await supabase
        .from('cooked_leftovers')
        .select('meal_name, cooked_at, safe_until')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('safe_until', todayKey())
      if (error) throw error
      activeLeftovers = data ?? []
    } catch { /* migration not applied yet */ }

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
${wellStockedStaples.length ? `Recurring staples she already has — don't add these to the grocery list: ${wellStockedStaples.map(s => s.name).join(', ')}` : ''}
${requiredStaples.length ? `Recurring staples she's marked low/empty — needs restocking, factor these into meal planning: ${requiredStaples.map(s => s.name).join(', ')}` : ''}

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

    const leftoversText = activeLeftovers.length
      ? `Real cooked leftovers on hand right now, safe to reuse until their listed date: ${activeLeftovers.map(l => `${l.meal_name} (safe until ${l.safe_until})`).join(', ')}. Feel free to plan a meal around using one of these up before it expires.`
      : ''
    const raw = await callAI(buildSystem(foodProfileText, neverFoods, leftoversText), prompt, 3800)
    const parsed = parseAIJson<{ grocery_list?: Record<string, { item: string; quantity?: string; used_for?: string[] }[]> }>(raw)

    // Low/empty staples are a deterministic fact, not a judgment call — merge
    // them into the grocery list in code rather than trusting the AI to have
    // included every one. Dedupe case-insensitively against what it already added.
    if (requiredStaples.length) {
      parsed.grocery_list = parsed.grocery_list ?? {}
      for (const staple of requiredStaples) {
        const bucket = parsed.grocery_list[staple.category] ?? []
        const already = bucket.some(i => i.item.toLowerCase() === staple.name.toLowerCase())
        if (!already) bucket.push({ item: staple.name, quantity: '', used_for: ['pantry restock'] })
        parsed.grocery_list[staple.category] = bucket
      }
    }

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
