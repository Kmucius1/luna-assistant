import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from '@/lib/ai'
import { getWeekRange } from '@/lib/money'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST() {
  try {
    const db = createAdminClient()
    const { start, end } = getWeekRange()

    const [txnsRes, billsRes, subsRes] = await Promise.all([
      db.from('money_transactions')
        .select('*')
        .eq('user_id', ZOE_USER_ID)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .order('amount', { ascending: false }),
      db.from('money_bills')
        .select('*')
        .eq('user_id', ZOE_USER_ID)
        .neq('status', 'cancelled'),
      db.from('money_subscriptions')
        .select('*')
        .eq('user_id', ZOE_USER_ID)
        .eq('status', 'active'),
    ])

    const txns = txnsRes.data ?? []
    const bills = billsRes.data ?? []
    const subs = subsRes.data ?? []

    const total_spent = txns
      .filter((t: { is_income?: boolean; amount: number }) => !t.is_income)
      .reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    const total_income = txns
      .filter((t: { is_income?: boolean; amount: number }) => t.is_income)
      .reduce((s: number, t: { amount: number }) => s + t.amount, 0)

    // Category breakdown
    const categories: Record<string, number> = {}
    for (const t of txns) {
      if (!t.is_income) {
        const cat = (t.category_primary ?? 'Other') as string
        categories[cat] = (categories[cat] ?? 0) + (t.amount as number)
      }
    }
    const top_categories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => ({ category: cat, amount: amt }))

    const sub_total = subs.reduce((s: number, sub: { amount_estimate?: number | null; frequency?: string | null }) => {
      const amt = sub.amount_estimate ?? 0
      if (sub.frequency === 'annual') return s + amt / 12
      return s + amt
    }, 0)

    const prompt = `You are LUNA, Zoe's AI financial advisor. Generate a weekly money report.

Week: ${start} to ${end}
Total spent: $${total_spent.toFixed(2)}
Total income: $${total_income.toFixed(2)}
Net: $${(total_income - total_spent).toFixed(2)}
Transactions: ${txns.length}
Top categories: ${JSON.stringify(top_categories)}
Active subscriptions: ${subs.length} ($${sub_total.toFixed(2)}/mo)
Bills: ${bills.length} active

Respond in EXACT JSON format, no markdown:
{
  "summary": "2-3 sentence weekly financial summary with CEO founder energy",
  "top_categories": [{"category": "string", "amount": 0, "insight": "string"}],
  "ceo_money_move": "one strategic action Zoe can take this week to grow wealth",
  "affirmation": "powerful money affirmation for this week"
}`

    const rawText = await callAI('You are LUNA, Zoe\'s AI financial advisor. Generate sharp, honest, CEO-level money analysis. Return only valid JSON, no markdown.', prompt, 800)
    let parsed: {
      summary?: string
      top_categories?: { category: string; amount: number; insight: string }[]
      ceo_money_move?: string
      affirmation?: string
    } = {}
    try {
      parsed = JSON.parse(rawText) as typeof parsed
    } catch {
      parsed = { summary: rawText }
    }

    return NextResponse.json({
      ...parsed,
      week: { start, end },
      total_spent,
      total_income,
      net: total_income - total_spent,
      transaction_count: txns.length,
    })
  } catch (error) {
    console.error('[weekly-report] error:', error)
    return NextResponse.json({ error: 'Weekly report failed' }, { status: 500 })
  }
}
