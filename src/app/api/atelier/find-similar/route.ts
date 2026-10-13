import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI, parseAIJson } from '@/lib/ai'

const ZOE_USER_ID = OWNER_USER_ID

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

interface WardrobeItem { id: string; name: string; category: string; color: string | null; fit: string | null; vibe_tags: string[] | null; photo_url: string | null }

const SYSTEM = `You are LUNA, Zoe's personal stylist. She picked one piece from her real closet — build ONE complete
outfit around it using ONLY other pieces she actually owns from the candidate list given. Never invent an item
that isn't in the list. Pick 2-4 complementary pieces (aim to cover top/bottom or dress, plus shoes and/or an
accessory when the closet has them) that genuinely work with the anchor piece's color, fit, and vibe.

Return ONLY valid JSON:
{
  "outfit_item_ids": ["id1", "id2"],
  "styling_note": "1-2 sentences on why this combination works and how to wear it"
}`

export async function POST(req: NextRequest) {
  try {
    const { item_id } = await req.json() as { item_id?: string }
    if (!item_id) return NextResponse.json({ error: 'item_id is required' }, { status: 400 })

    const userId = await resolveUserId()
    const db = createAdminClient()

    const { data: items, error } = await db
      .from('wardrobe_items')
      .select('id, name, category, color, fit, vibe_tags, photo_url')
      .eq('user_id', userId)
    if (error) throw error

    const all = (items ?? []) as WardrobeItem[]
    const anchor = all.find(i => i.id === item_id)
    if (!anchor) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const candidates = all.filter(i => i.id !== item_id)
    if (candidates.length === 0) {
      return NextResponse.json({ anchor, outfit: [], styling_note: "You'll need a few more pieces logged in your closet before LUNA can build a full outfit around this one." })
    }

    const anchorLine = `Anchor piece: ${anchor.id} — ${[anchor.color, anchor.fit, anchor.category, anchor.name].filter(Boolean).join(' ')}${anchor.vibe_tags?.length ? ` (${anchor.vibe_tags.join(', ')})` : ''}`
    const candidateLines = candidates.map(c =>
      `${c.id} — ${[c.color, c.fit, c.category, c.name].filter(Boolean).join(' ')}${c.vibe_tags?.length ? ` (${c.vibe_tags.join(', ')})` : ''}`
    ).join('\n')

    const raw = await callAI(SYSTEM, `${anchorLine}\n\nHer other closet pieces:\n${candidateLines}`, 500)
    const parsed = parseAIJson<{ outfit_item_ids?: string[]; styling_note?: string }>(raw)

    const candidateIds = new Set(candidates.map(c => c.id))
    const chosenIds = (parsed.outfit_item_ids ?? []).filter(id => candidateIds.has(id)).slice(0, 4)
    const outfit = chosenIds.map(id => candidates.find(c => c.id === id)).filter((c): c is WardrobeItem => !!c)

    return NextResponse.json({
      anchor,
      outfit,
      styling_note: parsed.styling_note?.trim() || 'A cohesive look built from pieces you already own.',
    })
  } catch (err) {
    console.error('[atelier/find-similar] error:', err)
    return NextResponse.json({ error: "Couldn't build an outfit around that piece — try again." }, { status: 500 })
  }
}
