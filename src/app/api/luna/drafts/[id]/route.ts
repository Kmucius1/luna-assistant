import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: { text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.text || !body.text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const db = createAdminClient()

  try {
    const { data: draft, error: fetchError } = await db
      .from('luna_text_drafts')
      .select('id, current_text')
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    const editDiff = { before: draft.current_text, after: body.text, edited_at: new Date().toISOString() }

    const { data: updated, error: updateError } = await db
      .from('luna_text_drafts')
      .update({
        current_text: body.text,
        edited: true,
        edit_diff: editDiff,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()
    if (updateError) throw updateError

    return NextResponse.json({ draft: updated })
  } catch (err) {
    console.error('[luna/drafts/[id]] error:', err)
    return NextResponse.json({ error: 'Failed to save edit' }, { status: 500 })
  }
}
