import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export async function GET() {
  const userId = await resolveUserId()
  const db = createAdminClient()

  const [{ data: profile }, { count: likedCount }] = await Promise.all([
    db.from('fashion_style_profile').select('style_name, core_formula').eq('user_id', userId).maybeSingle(),
    db.from('style_references').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_preloaded', true),
  ])

  if (profile) {
    return NextResponse.json({ hasProfile: true, summary: profile.core_formula || profile.style_name || null })
  }

  if (likedCount && likedCount > 0) {
    return NextResponse.json({ hasProfile: true, summary: `${likedCount} looks saved to your style board` })
  }

  return NextResponse.json({ hasProfile: false })
}
