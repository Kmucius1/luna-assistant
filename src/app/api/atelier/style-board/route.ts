import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import styleBoard from '@/data/atelier/style-board.json'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

// GET: the full image board + which ones this user has already liked
export async function GET() {
  const userId = await resolveUserId()
  const db = createAdminClient()

  const { data: liked } = await db
    .from('style_references')
    .select('ref_number')
    .eq('user_id', userId)
    .eq('is_preloaded', true)

  const likedSet = new Set((liked ?? []).map((r: { ref_number: number }) => r.ref_number))

  return NextResponse.json({
    board: styleBoard.map(item => ({ ...item, liked: likedSet.has(item.ref_number) })),
    likedCount: likedSet.size,
  })
}

// POST { ref_number, liked: boolean } — like or unlike one image
export async function POST(req: NextRequest) {
  const userId = await resolveUserId()
  const db = createAdminClient()
  const { ref_number, liked } = await req.json() as { ref_number: number; liked: boolean }

  const item = styleBoard.find(b => b.ref_number === ref_number)
  if (!item) return NextResponse.json({ error: 'Unknown look' }, { status: 400 })

  if (liked) {
    const { error } = await db.from('style_references').upsert({
      user_id: userId,
      ref_number,
      image_url: item.image_url,
      is_preloaded: true,
      source: 'style_board',
    }, { onConflict: 'user_id,ref_number' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await db.from('style_references')
      .delete()
      .eq('user_id', userId)
      .eq('ref_number', ref_number)
      .eq('is_preloaded', true)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
