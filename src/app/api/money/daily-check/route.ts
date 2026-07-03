import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from '@/lib/ai'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST() {
  try {
    const db = createAdminClient()

    const today = new Date().toISOString().slice(0, 10)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const [todayRes, weekRes, reviewRes] = await Promise.all([
      db.from('money_transactions').select('*').eq('user_id', ZOE_USER_ID).eq('transaction_date', today),
      db.from('money_transactions').select('*').eq('user_id', ZOE_USER_ID).gte('transaction_date', weekAgo).order('transaction_date', { ascending: false }),
      db.from('money_transactions').select('*').eq('user_id', ZOE_USER_ID).eq('needs_review', true).limit(20),
    ])

    const todayTxns = todayRes.data ?? []
    const weekTxns = weekRes.data ?? []
    const reviewTxns = reviewRes.data ?? []

    // Auto-categorize review transactions
    for (const txn of reviewTxns) {
      const name = ((txn.merchant_name ?? txn.name ?? '') as string).toLowerCase()
      const updates: Record<string, unknown> = { needs_review: false }
      if (['spotify', 'hulu', 'netflix', 'apple music', 'youtube'].some((s: string) => name.includes(s))) {
        updates['is_subscription'] = true
        updates['expense_type'] = 'subscription'
      } else if (['amazon', 'walmart', 'target', 'costco', 'whole foods'].some((s: string) => name.includes(s))) {
        updates['expense_type'] = 'shopping'
      } else if (['mcdonald', 'starbucks', 'doordash', 'ubereats', 'chipotle'].some((s: string) => name.includes(s))) {
        updates['expense_type'] = 'dining'
      }
      await db.from('money_transactions').update(updates).eq('id', txn.id)
    }

    const weekSpend = weekTxns
      .filter((t: { is_income?: boolean; amount: number }) => !t.is_income)
      .reduce((s: number, t: { amount: number }) => s + t.amount, 0)

    const prompt = `You are LUNA, Zoe's personal AI financial advisor with the energy of a billionaire CFO who also does morning astrology.

Today's date: ${today}
Transactions today: ${JSON.stringify(todayTxns.slice(0, 10))}
This week spending: $${weekSpend.toFixed(2)} across ${weekTxns.length} transactions
Auto-reviewed ${reviewTxns.length} unknown charges.

Respond in this EXACT JSON format, no markdown, no extra text:
{
  "check_questions": ["string", "string", "string"],
  "todays_assessment": "1-2 sentence assessment of today's spending or encouragement if no spend",
  "one_move": "one specific money action Zoe should take today",
  "affirmation": "short powerful money affirmation for a Taurus founder energy"
}`

    const rawText = await callAI('You are LUNA, Zoe\'s personal AI financial advisor with the energy of a billionaire CFO who also does morning astrology. Return only valid JSON, no markdown.', prompt, 600)
    let parsed: {
      check_questions?: string[]
      todays_assessment?: string
      one_move?: string
      affirmation?: string
    } = {}
    try {
      parsed = JSON.parse(rawText) as typeof parsed
    } catch {
      parsed = { todays_assessment: rawText, one_move: 'Review your spending today.', affirmation: 'My money works for me.' }
    }

    return NextResponse.json({
      ...parsed,
      today_txn_count: todayTxns.length,
      week_spend: weekSpend,
      auto_reviewed: reviewTxns.length,
    })
  } catch (error) {
    console.error('[daily-check] error:', error)
    return NextResponse.json({ error: 'Daily check failed' }, { status: 500 })
  }
}
