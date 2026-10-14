import { NextRequest, NextResponse } from 'next/server'
import { OWNER_USER_ID } from '@/lib/owner'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Serves a closet piece's photo. Photos are small JPEGs kept on the item row, so
// the list payload stays light and each image is fetched on demand.
export async function GET(req: NextRequest) {
  let userId = OWNER_USER_ID
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) userId = user.id
  } catch { /* single-owner fallback */ }

  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse('Not found', { status: 404 })

  const db = createAdminClient()
  const { data } = await db.from('luna_30d_items').select('data').eq('id', id).eq('user_id', userId).maybeSingle()
  const photo = (data?.data as { photo?: string } | undefined)?.photo
  const m = photo?.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/)
  if (!m) return new NextResponse('Not found', { status: 404 })

  return new NextResponse(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=86400' },
  })
}
