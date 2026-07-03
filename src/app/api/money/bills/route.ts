import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('money_bills')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .neq('status', 'cancelled')
      .order('due_day', { ascending: true })

    if (error) {
      console.error('[bills] query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const bills = (data ?? []).map((bill: {
      id: string
      due_date?: string | null
      due_day?: number | null
      [key: string]: unknown
    }) => {
      let days_until: number | null = null
      if (bill.due_date) {
        const due = new Date(bill.due_date)
        days_until = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      } else if (bill.due_day) {
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), bill.due_day)
        if (thisMonth < today) {
          thisMonth.setMonth(thisMonth.getMonth() + 1)
        }
        days_until = Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
      return { ...bill, days_until }
    })

    const total_monthly = bills.reduce((s: number, b: { amount_estimate?: number | null; frequency?: string | null }) => {
      const amt = b.amount_estimate ?? 0
      if (b.frequency === 'annual') return s + amt / 12
      return s + amt
    }, 0)

    return NextResponse.json({ bills, total_monthly, count: bills.length })
  } catch (error) {
    console.error('[bills] error:', error)
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json() as {
      name?: string
      merchant_name?: string
      amount_estimate?: number
      due_day?: number
      due_date?: string
      frequency?: string
      category?: string
      autopay?: boolean
      notes?: string
    }

    const { data, error } = await db
      .from('money_bills')
      .insert({ ...body, user_id: ZOE_USER_ID, status: 'active' })
      .select()
      .single()

    if (error) {
      console.error('[bills] insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bill: data })
  } catch (error) {
    console.error('[bills] POST error:', error)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
