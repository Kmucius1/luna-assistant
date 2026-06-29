import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '98f5b277-bb63-41d5-89ec-0edadc1e2858'

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json()
    const {
      type, wakeTime, sleepRating, energyRating, moodRating,
      hadDream, dreamText, feeling, onMind, supportNeed, prideGoal, aiResponse,
    } = body

    const { data, error } = await db
      .from('check_ins')
      .insert({
        user_id: ZOE_USER_ID,
        type: type || 'midday',
        wake_time: wakeTime,
        sleep_rating: sleepRating,
        energy_rating: energyRating,
        mood_rating: moodRating,
        had_dream: hadDream,
        dream_text: dreamText,
        feeling,
        on_mind: onMind,
        support_need: supportNeed,
        pride_goal: prideGoal,
        ai_response: aiResponse,
      })
      .select()
      .single()

    if (error) {
      console.error('[check-ins] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ checkIn: data })
  } catch (err) {
    console.error('[check-ins] POST error:', err)
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = createAdminClient()
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30')

    const { data, error } = await db
      .from('check_ins')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[check-ins] GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ checkIns: data || [] })
  } catch (err) {
    console.error('[check-ins] GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
  }
}
