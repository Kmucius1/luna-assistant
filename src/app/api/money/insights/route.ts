import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callAI, parseAIJson, ZOE_SOUL } from '@/lib/ai'
import { getMonthRange, formatCurrency } from '@/lib/money'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

const MONEY_INSIGHTS_PROMPT = `${ZOE_SOUL}

You are generating Zoe's LUNA Money Insight — a grounded, Saturn-in-Taurus money wisdom transmission.

Tone: Calm. Grounded. Never scary. Never shameful. Like a trusted financial advisor who also understands spirituality and human design. Saturn Taurus energy: slow wealth, self-worth before production, steady actions compound.

Examples of good tone:
- "Wealth is built through calm choices, not panic moves."
- "One money move today."
- "Your money needs visibility, not fear."
- "Slow wealth. Stable ground."

NEVER say: "you're overspending" "you need to stop" "this is alarming" — reframe everything through growth and self-worth.

Return ONLY valid JSON:
{
  "daily_move": "one specific, actionable money move she can make today — grounded, clear, doable",
  "pattern_noticed": "one spending or money pattern from the data — stated with love, not judgment (2-3 sentences)",
  "highest_self_action": "what Zoe's highest self would do with her money this month",
  "affirmation": "one powerful money affirmation tied to Saturn in Taurus",
  "alert_if_any": "only if there is a genuine concern — brief, calm, constructive; otherwise null",
  "spending_theme": "the overall theme or energy of her spending this month in 4-6 words"
}`

export async function POST() {
  try {
    const db = createAdminClient()
    const { start: monthStart, end: monthEnd } = getMonthRange()

    const [txnsResult, subsResult, accountsResult] = await Promise.allSettled([
      db.from('money_transactions')
        .select('merchant_name, name, amount, expense_type, is_income, is_business_expense, is_subscription')
        .eq('user_id', ZOE_USER_ID)
        .eq('pending', false)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd)
        .order('amount', { ascending: false })
        .limit(50),
      db.from('money_subscriptions').select('merchant_name, amount_estimate').eq('user_id', ZOE_USER_ID).eq('status', 'active'),
      db.from('plaid_accounts').select('name, available_balance, type').eq('user_id', ZOE_USER_ID).eq('hidden', false),
    ])

    const txns = txnsResult.status === 'fulfilled' ? (txnsResult.value.data ?? []) : []
    const subs = subsResult.status === 'fulfilled' ? (subsResult.value.data ?? []) : []
    const accounts = accountsResult.status === 'fulfilled' ? (accountsResult.value.data ?? []) : []

    const totalSpend = txns
      .filter((t: { is_income: boolean; amount: number }) => !t.is_income)
      .reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0)
    const totalIncome = txns
      .filter((t: { is_income: boolean }) => t.is_income)
      .reduce((s: number, t: { amount: number }) => s + Math.abs(t.amount), 0)
    const totalAvailable = accounts.reduce((s: number, a: { available_balance: number | null }) => s + (a.available_balance ?? 0), 0)
    const subsTotal = subs.reduce((s: number, sub: { amount_estimate: number | null }) => s + (sub.amount_estimate ?? 0), 0)

    const topExpenses = txns
      .filter((t: { is_income: boolean }) => !t.is_income)
      .slice(0, 5)
      .map((t: { merchant_name: string | null; name: string; amount: number; expense_type: string }) =>
        `${t.merchant_name ?? t.name}: ${formatCurrency(t.amount)} (${t.expense_type})`)
      .join('\n')

    const userMessage = `
Zoe's money snapshot for this month:

Total available cash across accounts: ${formatCurrency(totalAvailable)}
Income this month: ${formatCurrency(totalIncome)}
Total spending this month: ${formatCurrency(totalSpend)}
Active subscriptions total: ${formatCurrency(subsTotal)}/month

Top expenses:
${topExpenses || 'No expense data yet'}

Number of transactions: ${txns.length}

Generate her money insight.
`

    const aiText = await callAI(MONEY_INSIGHTS_PROMPT, userMessage, 800)
    const insights = parseAIJson(aiText)

    return NextResponse.json(insights)
  } catch (error) {
    console.error('[Money] insights error:', error)
    return NextResponse.json({
      daily_move: 'Review your top 3 expenses from this week.',
      pattern_noticed: 'Your money is moving — visibility is the first step to wisdom.',
      highest_self_action: 'Choose one subscription to evaluate this week.',
      affirmation: 'I build wealth through calm, consistent choices.',
      alert_if_any: null,
      spending_theme: 'Building clarity and ground',
    })
  }
}
