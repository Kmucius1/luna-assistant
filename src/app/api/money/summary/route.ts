import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId , isUnauthorizedError } from '@/lib/money/auth'
import { computeSafeToSpend } from '@/lib/money/safeToSpend'
import { callAI, parseAIJson } from '@/lib/ai'
import { todayKey, daysFromNow } from '@/lib/luna/today'

const SYSTEM = `You are Luna, narrating Zoe's real financial numbers in plain, warm, direct language — never generic personal-finance filler. You are told the exact real numbers below; never invent or round loosely, and never claim income exists unless it's marked confirmed. Write 2-3 short sentences: what's covered, what's left, and the single most useful thing to pay attention to right now (if anything). No toxic positivity, no shame, no jargon.

Return ONLY valid JSON: { "message": "..." }`


export async function GET() {
  try {
    const userId = await resolveMoneyUserId()
    const db = createAdminClient()
    const today = todayKey()

    const [sts, billsRes, subsRes, dupesRes] = await Promise.all([
      computeSafeToSpend(db, userId),
      db.from('bills').select('name, due_date, expected_amount, minimum_amount').eq('user_id', userId).in('status', ['upcoming', 'needs_review']).gte('due_date', today).lte('due_date', daysFromNow(14)).order('due_date', { ascending: true }),
      db.from('subscriptions').select('display_name, merchant_normalized').eq('user_id', userId).eq('status', 'review'),
      db.from('duplicate_charge_alerts').select('reason').eq('user_id', userId).eq('status', 'open').limit(3),
    ])

    interface BillRow { name: string; due_date: string; expected_amount: number | null; minimum_amount: number | null }
    interface SubRow { display_name: string | null; merchant_normalized: string }
    interface DupeRow { reason: string }
    const bills = (billsRes.data ?? []) as BillRow[]
    const lastCoveredBill = bills[bills.length - 1]
    const subs = (subsRes.data ?? []) as SubRow[]
    const dupes = (dupesRes.data ?? []) as DupeRow[]

    const prompt = `Safe to spend: $${sts.safeToSpend.toFixed(2)}
${sts.dailySpendingAmount != null && sts.daysUntilNextConfirmedIncome != null ? `That's about $${sts.dailySpendingAmount.toFixed(2)}/day for ${sts.daysUntilNextConfirmedIncome} days until next confirmed income.` : 'No confirmed upcoming income on file yet.'}
Bills covered/reserved through: ${lastCoveredBill?.due_date ?? 'no bills due in the next 14 days'}
Subscriptions needing review: ${subs.length} ${subs.length ? '(' + subs.map(s => s.display_name ?? s.merchant_normalized).join(', ') + ')' : ''}
Open duplicate/unusual charge alerts: ${dupes.length} ${dupes.length ? '(' + dupes.map(d => d.reason).join('; ') + ')' : ''}
Safety buffer held back: $${sts.safetyBuffer.toFixed(2)}`

    const raw = await callAI(SYSTEM, prompt, 300)
    const parsed = parseAIJson(raw)
    return NextResponse.json(parsed)
  } catch (error) {
    if (isUnauthorizedError(error)) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    const message = error instanceof Error ? error.message : String(error)
    console.error('[money/summary]', message)
    return NextResponse.json({ message: null, error: 'Could not generate summary', detail: message }, { status: 500 })
  }
}
