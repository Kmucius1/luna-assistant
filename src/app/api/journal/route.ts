import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('journal_page_entries')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[journal] GET error:', error)
      return NextResponse.json({ entries: [] })
    }
    return NextResponse.json({ entries: data ?? [] })
  } catch (err) {
    console.error('[journal] GET error:', err)
    return NextResponse.json({ entries: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const { entry_type, mood, content, tags } = await req.json() as {
      entry_type: string; mood?: string; content: string; tags?: string[]
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('journal_page_entries')
      .insert({
        user_id: ZOE_USER_ID,
        entry_type: entry_type || 'journal',
        mood: mood || null,
        content: content.trim(),
        tags: tags ?? [],
      })
      .select()
      .single()

    if (error) {
      console.error('[journal] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ entry: data })
  } catch (err) {
    console.error('[journal] POST error:', err)
    return NextResponse.json({ error: 'Failed to save journal entry' }, { status: 500 })
  }
}
