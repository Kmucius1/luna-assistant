import { OWNER_USER_ID } from '@/lib/owner'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = OWNER_USER_ID

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('intentions')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[intentions] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ intentions: data || [] })
  } catch (err) {
    console.error('[intentions] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch intentions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const { text } = await req.json() as { text: string }

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('intentions')
      .insert({ user_id: ZOE_USER_ID, text: text.trim(), done: false })
      .select()
      .single()

    if (error) {
      console.error('[intentions] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ intention: data })
  } catch (err) {
    console.error('[intentions] POST error:', err)
    return NextResponse.json({ error: 'Failed to save intention' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = createAdminClient()
    const { id, done } = await req.json() as { id: string; done: boolean }

    if (!id) {
      return NextResponse.json({ error: 'Intention id required' }, { status: 400 })
    }

    const { data, error } = await db
      .from('intentions')
      .update({ done })
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .select()
      .single()

    if (error) {
      console.error('[intentions] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ intention: data })
  } catch (err) {
    console.error('[intentions] PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update intention' }, { status: 500 })
  }
}
