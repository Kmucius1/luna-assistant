import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

interface CsvTransaction {
  date: string
  description: string
  amount: number
  category?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { transactions: CsvTransaction[]; source?: string }
    const { transactions, source } = body

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions provided' }, { status: 400 })
    }

    const db = createAdminClient()

    // Build rows for money_transactions
    const rows = transactions.map((t, idx) => {
      const isIncome = (t.category ?? '').toLowerCase() === 'income'
      const isTransfer = (t.category ?? '').toLowerCase() === 'transfer'
      return {
        user_id: ZOE_USER_ID,
        plaid_transaction_id: `csv_${source ?? 'import'}_${idx}`,
        name: t.description,
        merchant_name: t.description,
        amount: t.amount,
        transaction_date: normalizeDate(t.date),
        expense_type: t.category ?? 'Other',
        custom_category: t.category ?? 'Other',
        is_income: isIncome,
        is_bill: false,
        is_subscription: false,
        is_business_expense: isBusinessCategory(t.category ?? ''),
        is_personal_expense: !isIncome && !isTransfer && !isBusinessCategory(t.category ?? ''),
        needs_review: false,
        payment_channel: 'other',
        pending: false,
        raw: t,
        updated_at: new Date().toISOString(),
      }
    })

    // Insert in batches of 100
    let imported = 0
    let skipped = 0
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100)
      const { error, data } = await db
        .from('money_transactions')
        .upsert(batch, { onConflict: 'plaid_transaction_id', ignoreDuplicates: false })
      if (error) {
        console.error('[import-csv] batch error:', error)
        skipped += batch.length
      } else {
        imported += data?.length ?? batch.length
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: 0,
      transactions: [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[import-csv]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0]
  // Try MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (mdy) {
    const [, m, d, y] = mdy
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // Try YYYY-MM-DD — already correct
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  // Fallback
  try { return new Date(raw).toISOString().split('T')[0] } catch { return new Date().toISOString().split('T')[0] }
}

function isBusinessCategory(cat: string): boolean {
  const biz = ['ai tools', 'business', 'hosting', 'software', 'marketing', 'tools']
  return biz.some(b => cat.toLowerCase().includes(b))
}
