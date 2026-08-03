import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'
import { FoodProfile, formatFoodProfileForPrompt, mergedNeverFoods } from '@/lib/luna/foodProfile'

const SYSTEM = `You are Luna, Zoe's meal-decision assistant for "what can I eat right now" moments.

You will be given her CONFIRMED inventory (only these items actually exist in her home — never claim she has
anything not listed), her Food Profile (favorites, brand/rice/dressing preferences, real chef technique notes),
and her current mood/energy state.

Rules:
- Give exactly 3 options: the fastest option, the best complete meal, and a meal-prep option (makes extra for later).
- For each option give a realistic time estimate and basic numbered steps, written with real technique/seasoning
  (use her Food Profile's cooking technique notes whenever a dish matches one), not generic instructions.
- Never suggest anything on the never-suggest list.
- For each option, list "missing" ingredients explicitly — anything the recipe needs that is NOT in her confirmed
  inventory. If nothing is missing, say so plainly.
- Do not assume she has an ingredient unless it is in her confirmed inventory list.
- If she's hungry, tired, or overwhelmed, weight the fastest/simplest option first and keep tone practical, not chipper.
- Prefer using items that are expiring soon.

Return ONLY valid JSON in this shape:
{
  "options": [
    { "type": "fastest", "title": "...", "minutes": 10, "steps": ["...", "..."], "missing_ingredients": ["..."] },
    { "type": "best_complete_meal", "title": "...", "minutes": 30, "steps": ["...", "..."], "missing_ingredients": [] },
    { "type": "meal_prep", "title": "...", "minutes": 45, "steps": ["...", "..."], "missing_ingredients": ["..."] }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const mood: string = typeof body.mood === 'string' ? body.mood : 'no particular mood mentioned'

    const [{ data: pantryRows }, { data: foodProfileRow }] = await Promise.all([
      supabase.from('food_pantry_items').select('name, quantity, expires_on').eq('user_id', user.id).is('consumed_at', null),
      supabase.from('food_profile').select('*').eq('user_id', user.id).maybeSingle(),
    ])

    const pantry = (pantryRows ?? []) as { name: string; quantity: string | null; expires_on: string | null }[]
    if (pantry.length === 0) {
      return NextResponse.json({ error: 'No confirmed inventory yet — add what\'s in your fridge/pantry on the Pantry tab first.' }, { status: 400 })
    }

    const foodProfile = (foodProfileRow ?? null) as FoodProfile | null
    const foodProfileText = formatFoodProfileForPrompt(foodProfile)
    const neverFoods = mergedNeverFoods(foodProfile)

    const inventoryList = pantry
      .sort((a, b) => (a.expires_on ?? '9999').localeCompare(b.expires_on ?? '9999'))
      .map(p => `${p.name}${p.quantity ? ` (${p.quantity})` : ''}${p.expires_on ? ` — expires ${p.expires_on}` : ''}`)
      .join('\n')

    const prompt = `Zoe's confirmed inventory right now (soonest-expiring first):
${inventoryList}

${foodProfileText ? `Zoe's Food Profile:\n${foodProfileText}\n` : ''}

Never suggest: ${neverFoods.join(', ')}

Her current state: ${mood}

What can she eat right now?`

    const raw = await callAI(SYSTEM, prompt, 2200)
    const parsed = parseAIJson(raw)
    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[what-can-i-eat]', message)
    return NextResponse.json({ error: 'Could not figure that out.', detail: message }, { status: 500 })
  }
}
