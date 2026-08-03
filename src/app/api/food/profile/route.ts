import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('food_profile')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json({ profile: data ?? null })
  } catch (error) {
    console.error('[food/profile] GET error:', error)
    return NextResponse.json({ profile: null })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const updates: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() }
    if (typeof body.preferred_chicken_brand === 'string') updates.preferred_chicken_brand = body.preferred_chicken_brand
    if (typeof body.rice_preference === 'string') updates.rice_preference = body.rice_preference
    if (typeof body.dressing_preference === 'string') updates.dressing_preference = body.dressing_preference
    if (body.favorite_meals && typeof body.favorite_meals === 'object') updates.favorite_meals = body.favorite_meals
    if (Array.isArray(body.behavior_rules)) updates.behavior_rules = body.behavior_rules
    if (Array.isArray(body.never_foods)) updates.never_foods = body.never_foods
    if (body.cooking_techniques && typeof body.cooking_techniques === 'object') updates.cooking_techniques = body.cooking_techniques

    const { data, error } = await supabase
      .from('food_profile')
      .upsert(updates, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/profile] PUT error:', message)
    return NextResponse.json({ error: 'Failed to save food profile', detail: message }, { status: 500 })
  }
}
