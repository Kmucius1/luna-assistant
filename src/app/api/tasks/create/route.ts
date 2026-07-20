import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isUnauthorizedError, resolveMoneyUserId } from '@/lib/money/auth'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const ALLOWED_TASK_FIELDS = [
  'title', 'description', 'due_date', 'due_time', 'priority', 'status',
  'category', 'completed', 'source', 'notes',
] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const userId = await resolveMoneyUserId()
    const task: Record<string, unknown> = {}
    for (const field of ALLOWED_TASK_FIELDS) {
      if (body[field] !== undefined) task[field] = body[field]
    }
    task.title = body.title.trim().slice(0, 300)

    const { data, error } = await adminDb()
      .from('tasks')
      .insert({ ...task, user_id: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ task: data })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('[tasks/create] error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
