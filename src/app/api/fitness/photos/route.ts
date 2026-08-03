import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { localDateKey } from '@/lib/luna/dailyCache'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient()
    const userId = await resolveUserId()
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

    const { data, error } = await db
      .from('progress_photos')
      .select('id, date_key, photo_url, note, created_at')
      .eq('user_id', userId)
      .order('date_key', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[fitness/photos] GET error:', error)
      return NextResponse.json({ photos: [] })
    }
    return NextResponse.json({ photos: data ?? [] })
  } catch (err) {
    console.error('[fitness/photos] GET error:', err)
    return NextResponse.json({ photos: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const userId = await resolveUserId()
    const { image, note, tz } = await req.json() as { image: string; note?: string; tz?: string }

    if (!image?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Send a base64 data URL image.' }, { status: 400 })
    }

    const dateKey = localDateKey(new Date(), tz)
    const { data, error } = await db
      .from('progress_photos')
      .insert({ user_id: userId, date_key: dateKey, photo_url: image, note: note ?? null })
      .select('id, date_key, photo_url, note, created_at')
      .single()

    if (error) {
      console.error('[fitness/photos] POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ photo: data })
  } catch (err) {
    console.error('[fitness/photos] POST error:', err)
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }
}
