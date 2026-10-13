import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI, WARDROBE_ITEM_ANALYSIS_PROMPT, parseAIJson } from '@/lib/ai'

const ZOE_USER_ID = OWNER_USER_ID

// Same session-with-fallback resolution as wardrobe/detect (the route that
// actually inserts items from an outfit-photo upload) — this route was
// requiring a real session and reading/writing strictly by auth.uid(), which
// silently diverged from wardrobe/detect's ZOE_USER_ID fallback whenever
// there wasn't an active session: uploads landed under one user id, this
// GET only ever looked under another, so newly added items never appeared.
async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

// GET — list wardrobe items
export async function GET() {
  try {
    const userId = await resolveUserId()
    const db = createAdminClient()
    const { data, error } = await db
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ items: data })
  } catch (err) {
    console.error('Wardrobe GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch wardrobe' }, { status: 500 })
  }
}

// POST — add item (optionally run AI analysis)
export async function POST(request: NextRequest) {
  try {
    const userId = await resolveUserId()
    const db = createAdminClient()
    const body = await request.json()
    const { analyze, description, ...item } = body

    let aiAnalysis = null
    if (analyze && description) {
      const result = await callAI(
        WARDROBE_ITEM_ANALYSIS_PROMPT,
        `Analyze this wardrobe item for Zoe:\n${description}`,
        800
      )
      aiAnalysis = parseAIJson(result)
    }

    const toInsert = {
      user_id: userId,
      name: item.name,
      category: item.category,
      color: aiAnalysis ? (aiAnalysis as { color?: string }).color ?? item.color : item.color,
      fit: item.fit,
      vibe_tags: aiAnalysis ? (aiAnalysis as { tags?: string[] }).tags ?? item.vibe_tags : item.vibe_tags,
      photo_url: item.photo_url,
      clean_status: item.clean_status ?? 'clean',
      last_worn_at: item.last_worn_at,
      favorite_rating: item.favorite_rating ?? 0,
      customization_notes: aiAnalysis
        ? (aiAnalysis as { customization_ideas?: string }).customization_ideas
        : item.customization_notes,
      pairs_well_with: aiAnalysis ? (aiAnalysis as { pairs_with?: string[] }).pairs_with : item.pairs_well_with,
      repair_notes: item.repair_notes,
    }

    const { data, error } = await db.from('wardrobe_items').insert(toInsert).select().single()
    if (error) throw error

    return NextResponse.json({ item: data, analysis: aiAnalysis })
  } catch (err) {
    console.error('Wardrobe POST error:', err)
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
  }
}

// PATCH — update item
export async function PATCH(request: NextRequest) {
  try {
    const userId = await resolveUserId()
    const db = createAdminClient()
    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'Item ID required' }, { status: 400 })

    const { data, error } = await db
      .from('wardrobe_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('Wardrobe PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}
