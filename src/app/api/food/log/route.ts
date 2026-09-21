import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI, parseAIJson } from '@/lib/ai'
import { depleteStaplesFromMealTitle } from '@/lib/luna/staplesDepletion'
import { todayKey } from '@/lib/luna/today'


const NUTRITION_ESTIMATE_SYSTEM = `You estimate real-world nutrition for a short food description someone just ate.
Give your honest best estimate for a typical serving — not zero, not a refusal, even if the description is vague (use a reasonable typical portion).

Return ONLY valid JSON: { "title": "clean short name for this food, e.g. 'Banana' or 'Turkey sandwich'", "calories": number, "protein_g": number }`

async function estimateNutrition(description: string): Promise<{ title: string; calories: number; protein_g: number }> {
  const raw = await callAI(NUTRITION_ESTIMATE_SYSTEM, description, 200)
  const parsed = parseAIJson<{ title?: string; calories?: number; protein_g?: number }>(raw)
  return {
    title: parsed.title?.trim() || description,
    calories: typeof parsed.calories === 'number' ? Math.round(parsed.calories) : 0,
    protein_g: typeof parsed.protein_g === 'number' ? Math.round(parsed.protein_g) : 0,
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dateKey = searchParams.get('date') || todayKey()

    const { data, error } = await supabase
      .from('food_log_entries')
      .select('id, meal_type, source, title, calories, protein_g, logged_at')
      .eq('user_id', user.id)
      .eq('date_key', dateKey)
      .order('logged_at', { ascending: true })
    if (error) throw error

    return NextResponse.json({ entries: data ?? [] })
  } catch (error) {
    console.error('[food/log] GET error:', error)
    return NextResponse.json({ entries: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as {
      meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      mode?: 'planned' | 'custom'
      title?: string
      description?: string
      calories?: number
      protein_g?: number
    }
    if (!body.meal_type) {
      return NextResponse.json({ error: 'meal_type is required' }, { status: 400 })
    }

    let title = body.title?.trim() || ''
    let calories = body.calories ?? 0
    let proteinG = body.protein_g ?? 0
    const source = body.mode === 'custom' ? 'custom' : 'planned'

    if (source === 'custom') {
      if (!body.description?.trim()) {
        return NextResponse.json({ error: 'description is required to log a custom food' }, { status: 400 })
      }
      try {
        const est = await estimateNutrition(body.description.trim())
        title = est.title
        calories = est.calories
        proteinG = est.protein_g
      } catch (err) {
        console.error('[food/log] nutrition estimate failed:', err)
        return NextResponse.json({ error: "Couldn't figure out the nutrition for that — try describing it a little differently." }, { status: 502 })
      }
    } else if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('food_log_entries')
      .insert({
        user_id: user.id,
        date_key: todayKey(),
        meal_type: body.meal_type,
        source,
        title,
        calories,
        protein_g: proteinG,
      })
      .select('id, meal_type, source, title, calories, protein_g, logged_at')
      .single()
    if (error) throw error

    // Real automatic pantry depletion — a planned meal she actually ate
    // nudges any matching staple toward low/empty, not just a bare log
    // entry with no memory effect.
    if (source === 'planned') {
      await depleteStaplesFromMealTitle(supabase, user.id, title)
    }

    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('[food/log] POST error:', error)
    return NextResponse.json({ error: 'Failed to log that meal' }, { status: 500 })
  }
}
