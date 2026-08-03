import { NextRequest, NextResponse } from 'next/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { createClient } from '@/lib/supabase/server'
import { FoodProfile } from '@/lib/luna/foodProfile'

interface RecipeDetail {
  servings: string
  prep_minutes: number
  cook_minutes: number
  ingredients: { item: string; quantity: string }[]
  steps: string[]
}

function buildSystem(techniqueNotes: string): string {
  return `You are Luna, a chef writing a real, restaurant-quality recipe for Zoe to cook at home.

Write with genuine chef technique — actual seasonings with real measurements, actual pan/oven temperatures, actual timing per step, actual prep technique (pounding, dredging, searing, deglazing, resting, etc.). Never write vague instructions like "season to taste" or "cook until done" — always give a real amount and a real doneness cue (temperature, color, texture, time).

${techniqueNotes ? `Reference technique notes for dishes like this one, use them if they apply:\n${techniqueNotes}\n` : ''}

Return ONLY valid JSON in this shape:
{
  "servings": "1",
  "prep_minutes": 10,
  "cook_minutes": 20,
  "ingredients": [{ "item": "boneless chicken breast", "quantity": "1 (6 oz)" }],
  "steps": [
    "Pat the chicken breast dry, then pound to an even 1/2-inch thickness between plastic wrap.",
    "Season both sides with 1/2 tsp salt, 1/4 tsp black pepper, and 1/2 tsp garlic powder."
  ]
}

Write 6-12 steps depending on the dish's real complexity. Each step should be one clear, complete action — not a whole paragraph of the recipe crammed into one bullet.`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const title: string = typeof body.title === 'string' ? body.title.trim() : ''
    const prepNote: string = typeof body.prep_note === 'string' ? body.prep_note.trim() : ''
    if (!title) return NextResponse.json({ error: 'A meal title is required' }, { status: 400 })

    const { data: foodProfileRow } = await supabase
      .from('food_profile').select('cooking_techniques').eq('user_id', user.id).maybeSingle()
    const cookingTechniques = (foodProfileRow as Pick<FoodProfile, 'cooking_techniques'> | null)?.cooking_techniques
    const techniqueNotes = cookingTechniques
      ? Object.entries(cookingTechniques).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join('\n')
      : ''

    const prompt = `Write the full recipe for: ${title}${prepNote ? `\nShort description already given to Zoe: ${prepNote}` : ''}`

    const raw = await callAI(buildSystem(techniqueNotes), prompt, 1800)
    const parsed = parseAIJson<RecipeDetail>(raw)

    return NextResponse.json(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ai/recipe-detail]', message)
    return NextResponse.json({ error: 'Could not build this recipe.', detail: message }, { status: 500 })
  }
}
