import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase.from('travel_memories').select('*').eq('trip_id', id).eq('user_id', user.id).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ memories: data ?? [] })
  } catch (error) {
    console.error('[travel/trips/:id/memories] GET error:', error)
    return NextResponse.json({ memories: [] })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (!body.content?.trim() && !body.memory_type) return NextResponse.json({ error: 'content or memory_type required' }, { status: 400 })

    const { data, error } = await supabase.from('travel_memories').insert({
      trip_id: id, user_id: user.id, memory_type: body.memory_type ?? 'journal', content: body.content ?? null,
      recorded_at: body.recorded_at ?? new Date().toISOString(),
    }).select().single()
    if (error) throw error
    return NextResponse.json({ memory: data })
  } catch (error) {
    console.error('[travel/trips/:id/memories] POST error:', error)
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 })
  }
}
