import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '98f5b277-bb63-41d5-89ec-0edadc1e2858'

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

  const { data } = await db
    .from('fashion_style_profile')
    .select('style_name, core_formula')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ hasProfile: false })
  }

  return NextResponse.json({
    hasProfile: true,
    summary: data.core_formula || data.style_name || null,
  })
}
