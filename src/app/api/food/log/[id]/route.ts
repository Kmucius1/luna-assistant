import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase.from('food_log_entries').delete().eq('id', id).eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[food/log/:id] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove that entry' }, { status: 500 })
  }
}
