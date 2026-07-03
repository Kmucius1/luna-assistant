import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI } from '@/lib/ai'
import { getMonthRange } from '@/lib/money'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST() {
  try {
    const db = createAdminClient()
    const { start, end } = getMonthRange()

    const { data: txns } = await db
      .from('money_transactions')
      .select('*')
      .eq('user_id', ZOE_USER_ID)
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('amount', { ascending: false })

    const allTxns = txns ?? []
    const expenses = allTxns.filter((t: { is_income?: boolean }) => !t.is_income)
    const income = allTxns.filter((t: { is_income?: boolean }) => t.is_income)

    const total_spent = expenses.reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    const total_income = income.reduce((s: number, t: { amount: number }) => s + t.amount, 0)

    // Merchant breakdown
    const merchants: Record<string, { amount: number; count: number }> = {}
    for (const t of expenses) {
      const key = ((t.merchant_name ?? t.name ?? 'Unknown') as string)
      if (!merchants[key]) merchants[key] = { amount: 0, count: 0 }
      merchants[key].amount += t.amount as number
      merchants[key].count++
    }
    const biggest_merchants = Object.entries(merchants)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 8)
      .map(([name, data]) => ({ name, ...data }))

    // Category breakdown
    const categories: Record<string, number> = {}
    for (const t of expenses) {
      const cat = (t.category_primary ?? 'Other') as string
      categories[cat] = (categories[cat] ?? 0) + (t.amount as number)
    }
    const top_categories = Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([cat, amt]) => ({ category: cat, amount: amt }))

    const prompt = `You are LUNA, Zoe's AI wealth advisor. Generate a monthly money report with billionaire founder energy.

Month: ${start} to ${end}
Total income: $${total_income.toFixed(2)}
Total expenses: $${total_spent.toFixed(2)}
Net: $${(total_income - total_spent).toFixed(2)}
Transactions: ${allTxns.length}
Top spending merchants: ${JSON.stringify(biggest_merchants.slice(0, 5))}
Spending categories: ${JSON.stringify(top_categories)}

Respond in EXACT JSON format, no markdown:
{
  "summary": "2-3 sentence monthly assessment with real numbers, Saturn Taurus energy — direct, no fluff",
  "biggest_merchants": [{"name": "string", "amount": 0, "verdict": "keep|cut|reduce", "note": "string"}],
  "waste_detected": "specific spending pattern that needs attention",
  "next_month_suggestion": "one concrete financial strategy for next month",
  "wealth_score": "score out of 10 with one sentence explanation"
}`

    const rawText = await callAI('You are LUNA, Zoe\'s AI wealth advisor with billionaire founder energy. Return only valid JSON, no markdown.', prompt, 1000)
    let parsed: {
      summary?: string
      biggest_merchants?: { name: string; amount: number; verdict: string; note: string }[]
      waste_detected?: string
      next_month_suggestion?: string
      wealth_score?: string
    } = {}
    try {
      parsed = JSON.parse(rawText) as typeof parsed
    } catch {
      parsed = { summary: rawText }
    }

    return NextResponse.json({
      ...parsed,
      month: { start, end },
      total_income,
      total_spent,
      net: total_income - total_spent,
      transaction_count: allTxns.length,
      top_categories,
    })
  } catch (error) {
    console.error('[monthly-report] error:', error)
    return NextResponse.json({ error: 'Monthly report failed' }, { status: 500 })
  }
}
