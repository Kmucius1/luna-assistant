import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('money_subscriptions')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .order('amount_estimate', { ascending: false })

    if (error) {
      console.error('[subscriptions] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const today = new Date()
    const subs = (data ?? []).map((sub: {
      id: string
      next_expected_charge?: string | null
      last_charge_date?: string | null
      frequency?: string | null
      amount_estimate?: number | null
      status: string
      [key: string]: unknown
    }) => {
      if (!sub.next_expected_charge && sub.last_charge_date) {
        const last = new Date(sub.last_charge_date)
        let next = new Date(last)
        if (sub.frequency === 'monthly' || !sub.frequency) {
          next.setMonth(last.getMonth() + 1)
        } else if (sub.frequency === 'annual') {
          next.setFullYear(last.getFullYear() + 1)
        } else if (sub.frequency === 'weekly') {
          next.setDate(last.getDate() + 7)
        }
        // If still in past, add another interval
        while (next < today) {
          if (sub.frequency === 'annual') {
            next.setFullYear(next.getFullYear() + 1)
          } else if (sub.frequency === 'weekly') {
            next.setDate(next.getDate() + 7)
          } else {
            next.setMonth(next.getMonth() + 1)
          }
        }
        return { ...sub, next_expected_charge: next.toISOString().slice(0, 10) }
      }
      return sub
    })

    const active = subs.filter((s: { status: string }) => s.status === 'active')
    const monthly_total = active.reduce((sum: number, s: { amount_estimate?: number | null; frequency?: string | null }) => {
      const amt = s.amount_estimate ?? 0
      if (s.frequency === 'annual') return sum + amt / 12
      if (s.frequency === 'weekly') return sum + amt * 4
      return sum + amt
    }, 0)

    return NextResponse.json({ subscriptions: subs, count: active.length, monthly_total })
  } catch (error) {
    console.error('[subscriptions] error:', error)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json() as {
      merchant_name?: string
      amount_estimate?: number
      frequency?: string
      category?: string
      cancel_url?: string
      notes?: string
    }

    const { data, error } = await db
      .from('money_subscriptions')
      .insert({ ...body, user_id: ZOE_USER_ID, status: 'active' })
      .select()
      .single()

    if (error) {
      console.error('[subscriptions] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('[subscriptions] POST error:', error)
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json() as { id: string; status?: string; notes?: string; cancel_url?: string }
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const { data, error } = await db
      .from('money_subscriptions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', ZOE_USER_ID)
      .select()
      .single()

    if (error) {
      console.error('[subscriptions] update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ subscription: data })
  } catch (error) {
    console.error('[subscriptions] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
  }
}
