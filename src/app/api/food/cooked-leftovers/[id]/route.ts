import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    if (!['consumed', 'frozen', 'discarded', 'active'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('cooked_leftovers')
      .update({ status: body.status })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ leftover: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[food/cooked-leftovers/[id]] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update that', detail: message }, { status: 500 })
  }
}
