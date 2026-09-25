import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = createAdminClient()

  try {
    const now = new Date().toISOString()
    const { data: updated, error } = await db
      .from('luna_text_drafts')
      .update({ status: 'sent', approved_at: now, sent_at: now, updated_at: now })
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .select('*')
      .single()

    if (error) throw error
    if (!updated) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    return NextResponse.json({ draft: updated })
  } catch (err) {
    console.error('[luna/drafts/[id]/approve] error:', err)
    return NextResponse.json({ error: 'Failed to approve draft' }, { status: 500 })
  }
}
