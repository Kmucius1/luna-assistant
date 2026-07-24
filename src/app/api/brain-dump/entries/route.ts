import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Instant capture: save the raw entry immediately, no title/category
// required. AI classification happens afterward via a separate call to
// /api/brain-dump/analyze so it never blocks the save.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.raw_content?.trim()) return NextResponse.json({ error: 'raw_content required' }, { status: 400 })

    const { data, error } = await supabase.from('brain_dump_entries').insert({
      user_id: user.id,
      raw_content: body.raw_content.trim(),
      entry_type: body.entry_type ?? 'text',
      category: body.category ?? null,
      ai_analysis_enabled: body.ai_analysis_enabled ?? true,
      audio_storage_path: body.audio_storage_path ?? null,
      audio_duration_seconds: body.audio_duration_seconds ?? null,
      transcript: body.transcript ?? null,
      transcription_status: body.transcription_status ?? (body.entry_type === 'voice' ? 'pending' : 'not_applicable'),
    }).select().single()

    if (error) throw error
    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('[brain-dump/entries] POST error:', error)
    return NextResponse.json({ error: 'Failed to save entry — your draft is still safe, try again' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let query = supabase.from('brain_dump_entries').select('*').eq('user_id', user.id).eq('is_archived', false)
    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (search) query = query.or(`raw_content.ilike.%${search}%,title.ilike.%${search}%,ai_summary.ilike.%${search}%`)
    query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(limit)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ entries: data ?? [] })
  } catch (error) {
    console.error('[brain-dump/entries] GET error:', error)
    return NextResponse.json({ entries: [] })
  }
}
