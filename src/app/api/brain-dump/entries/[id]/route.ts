import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ data: entry, error }, { data: attachments }] = await Promise.all([
      supabase.from('brain_dump_entries').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('brain_dump_attachments').select('*').eq('entry_id', id).eq('user_id', user.id),
    ])
    if (error) throw error

    // Signed URL for audio if present (private bucket — never a public link).
    let audioUrl: string | null = null
    if (entry?.audio_storage_path) {
      const { data: signed } = await supabase.storage.from('brain-dump').createSignedUrl(entry.audio_storage_path, 3600)
      audioUrl = signed?.signedUrl ?? null
    }
    interface AttachmentRow { storage_path: string; [key: string]: unknown }
    const attachmentsWithUrls = await Promise.all(((attachments ?? []) as AttachmentRow[]).map(async a => {
      const { data: signed } = await supabase.storage.from('brain-dump').createSignedUrl(a.storage_path, 3600)
      return { ...a, url: signed?.signedUrl ?? null }
    }))

    return NextResponse.json({ entry, audio_url: audioUrl, attachments: attachmentsWithUrls })
  } catch (error) {
    console.error('[brain-dump/entries/:id] GET error:', error)
    return NextResponse.json({ error: 'Could not load entry' }, { status: 500 })
  }
}

// Never lets AI output overwrite raw_content — only user-editable fields
// and AI-suggestion fields (populated only by /api/brain-dump/analyze) can
// be updated here.
const ALLOWED_FIELDS = [
  'title', 'category', 'status', 'is_pinned', 'is_archived', 'is_locked', 'ai_analysis_enabled',
  'ai_summary', 'ai_suggested_title', 'ai_suggested_category', 'ai_confidence', 'analysis_status',
  'transcript', 'transcription_status', 'linked_type', 'linked_id',
]

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of ALLOWED_FIELDS) if (key in body) updates[key] = body[key]

    const { data, error } = await supabase.from('brain_dump_entries').update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('[brain-dump/entries/:id] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('brain_dump_entries').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[brain-dump/entries/:id] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
