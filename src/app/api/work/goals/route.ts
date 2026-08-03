import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('work_goals')
      .select('id, title, notes, target_date, progress_percent, status, created_at, updated_at')
      .eq('user_id', ZOE_USER_ID)
      .neq('status', 'archived')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ goals: data ?? [] })
  } catch (err) {
    console.error('[work/goals] GET error:', err)
    return NextResponse.json({ goals: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { title?: string; notes?: string; target_date?: string }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    const db = createAdminClient()
    const { data, error } = await db
      .from('work_goals')
      .insert({
        user_id: ZOE_USER_ID,
        title: body.title.trim(),
        notes: body.notes?.trim() || null,
        target_date: body.target_date || null,
      })
      .select('id, title, notes, target_date, progress_percent, status, created_at, updated_at')
      .single()
    if (error) throw error
    return NextResponse.json({ goal: data })
  } catch (err) {
    console.error('[work/goals] POST error:', err)
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 })
  }
}
