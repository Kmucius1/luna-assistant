import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mondayKeyOf } from '@/lib/luna/today'

type TaskType = 'laundry' | 'cleaning'

function mondayOf(date: Date): string { return mondayKeyOf(date) }

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const weekStart = req.nextUrl.searchParams.get('week_start') || mondayOf(new Date())

    const { data, error } = await supabase
      .from('home_tasks')
      .select('type, choice, categories, completed_at')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)

    if (error) throw error
    const rows = (data ?? []) as { type: TaskType; choice: string; categories: string[] | null; completed_at: string | null }[]
    return NextResponse.json({
      week_start: weekStart,
      laundry: rows.find(r => r.type === 'laundry') ?? null,
      cleaning: rows.find(r => r.type === 'cleaning') ?? null,
    })
  } catch (error) {
    console.error('[home/tasks] GET error:', error)
    return NextResponse.json({ week_start: null, laundry: null, cleaning: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const type: TaskType = body.type
    const choice: string = body.choice
    const categories: string[] | undefined = Array.isArray(body.categories) ? body.categories : undefined
    const weekStart: string = body.week_start || mondayOf(new Date())

    if (type !== 'laundry' && type !== 'cleaning') return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    if (!choice) return NextResponse.json({ error: 'Choice is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('home_tasks')
      .upsert(
        { user_id: user.id, week_start: weekStart, type, choice, categories: categories ?? null, completed_at: null },
        { onConflict: 'user_id,week_start,type' },
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ task: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[home/tasks] POST error:', message)
    return NextResponse.json({ error: 'Could not save that', detail: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const type: TaskType = body.type
    const weekStart: string = body.week_start || mondayOf(new Date())
    const completed: boolean = body.completed !== false

    if (type !== 'laundry' && type !== 'cleaning') return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

    const { data, error } = await supabase
      .from('home_tasks')
      .update({ completed_at: completed ? new Date().toISOString() : null })
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .eq('type', type)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ task: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[home/tasks] PATCH error:', message)
    return NextResponse.json({ error: 'Could not update that', detail: message }, { status: 500 })
  }
}
