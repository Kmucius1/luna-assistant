import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculatePriorityScore } from '@/lib/priority'
import { Task } from '@/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'in', '("done","cancelled")')
      .order('priority_score', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Recalculate scores based on current time
    const scored = (tasks as Task[]).map(task => ({
      ...task,
      priority_score: calculatePriorityScore(task),
    })).sort((a, b) => b.priority_score - a.priority_score)

    return NextResponse.json({ tasks: scored })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
