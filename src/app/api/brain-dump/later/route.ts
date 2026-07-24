import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('later_items').select('*').eq('user_id', user.id).eq('status', 'open').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (error) {
    console.error('[brain-dump/later] GET error:', error)
    return NextResponse.json({ items: [] })
  }
}

// Called both from the Brain Dump entry-detail "Add to Later" action and
// directly from an active Work focus session's "Capture for Later" button —
// either way this never ends or interrupts whatever the user was doing.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

    const { data, error } = await supabase.from('later_items').insert({
      user_id: user.id,
      content: body.content.trim(),
      source: body.source ?? 'manual',
      source_entry_id: body.source_entry_id ?? null,
    }).select().single()
    if (error) throw error

    if (body.source_entry_id) {
      await supabase.from('brain_dump_entries').update({ linked_type: 'later', linked_id: data.id, status: 'converted' }).eq('id', body.source_entry_id).eq('user_id', user.id)
    }

    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('[brain-dump/later] POST error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('later_items').update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('[brain-dump/later] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
