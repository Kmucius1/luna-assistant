import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = OWNER_USER_ID

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as { progress_percent?: number; status?: 'active' | 'completed' | 'archived'; title?: string; notes?: string; target_date?: string | null }
    const db = createAdminClient()

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.progress_percent !== undefined) update.progress_percent = Math.max(0, Math.min(100, body.progress_percent))
    if (body.status !== undefined) update.status = body.status
    if (body.title !== undefined) update.title = body.title.trim()
    if (body.notes !== undefined) update.notes = body.notes?.trim() || null
    if (body.target_date !== undefined) update.target_date = body.target_date

    const { data, error } = await db
      .from('work_goals')
      .update(update)
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .select('id, title, notes, target_date, progress_percent, status, created_at, updated_at')
      .single()
    if (error) throw error
    return NextResponse.json({ goal: data })
  } catch (err) {
    console.error('[work/goals/:id] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const { error } = await db.from('work_goals').delete().eq('id', id).eq('user_id', ZOE_USER_ID)
    if (error) throw error
    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[work/goals/:id] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
