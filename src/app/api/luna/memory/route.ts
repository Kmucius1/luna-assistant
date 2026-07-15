import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

// Read-only view of the durable daily memory built by /api/luna/nightly-memory.
export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('luna_memory')
      .select('date_key, summary, source, created_at')
      .eq('user_id', ZOE_USER_ID)
      .order('date_key', { ascending: false })
      .limit(30)

    if (error) {
      console.error('[luna/memory] GET error:', error)
      return NextResponse.json({ entries: [] })
    }
    return NextResponse.json({ entries: data ?? [] })
  } catch (err) {
    console.error('[luna/memory] GET error:', err)
    return NextResponse.json({ entries: [] })
  }
}
