import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

export async function GET() {
  try {
    const userId = await resolveUserId()
    const db = createAdminClient()
    const { data, error } = await db
      .from('coach_contacts')
      .select('id, name, relationship_type, notes, created_at')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ contacts: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[coach-contacts] GET error:', err)
    return NextResponse.json({ contacts: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, relationship_type, notes } = await req.json() as { name?: string; relationship_type?: string; notes?: string }
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const userId = await resolveUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('coach_contacts').insert({
      user_id: userId,
      name: name.trim(),
      relationship_type: relationship_type || 'other',
      notes: notes || null,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ contact: data })
  } catch (err) {
    console.error('[coach-contacts] POST error:', err)
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json() as { id?: string; name?: string; relationship_type?: string; notes?: string }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const userId = await resolveUserId()
    const db = createAdminClient()
    const { data, error } = await db.from('coach_contacts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId)
      .select().single()

    if (error) throw error
    return NextResponse.json({ contact: data })
  } catch (err) {
    console.error('[coach-contacts] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}
