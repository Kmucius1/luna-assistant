import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getReadingHistory } from '@/lib/luna/dailyReadingStore'
import { localDateKeyFromDate } from '@/lib/luna/dateWindow'

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
  const { searchParams } = new URL(req.url)
  const timezone = searchParams.get('tz') || 'America/New_York'

  const userId = await resolveUserId()
  const todayKey = localDateKeyFromDate(new Date(), timezone)
  const readings = await getReadingHistory(userId, timezone, todayKey)

  return NextResponse.json({ readings })
}
