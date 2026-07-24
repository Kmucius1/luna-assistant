import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase.from('travel_profiles').select('*').eq('user_id', user.id).maybeSingle()
    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('[travel/profile] GET error:', error)
    return NextResponse.json({ profile: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { data, error } = await supabase.from('travel_profiles').upsert({
      user_id: user.id,
      ...body,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select().single()
    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('[travel/profile] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}
