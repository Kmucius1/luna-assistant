import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY!) }
const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

export async function POST(req: NextRequest) {
  try {
    const { account_id } = await req.json() as { account_id: string }
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    const db = createAdminClient()

    // Fetch account details for labeling
    const account = await getStripe().financialConnections.accounts.retrieve(account_id)
    const accountLabel = account.display_name ?? account.institution_name ?? 'Bank Account'

    // Fetch transactions via Financial Connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txnList = await (getStripe().financialConnections.accounts as any).listTransactions(account_id, { limit: 200 }) as { data: any[] }
    const txns = txnList.data

    if (!txns.length) return NextResponse.json({ imported: 0 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = txns.map((t: any, idx: number) => {
      const amount = Math.abs(t.amount) / 100
      const isIncome = t.amount > 0
      const date = new Date(t.transacted_at * 1000).toISOString().split('T')[0]
      return {
        user_id: ZOE_USER_ID,
        plaid_transaction_id: `stripe_fc_${account_id}_${idx}`,
        name: t.description ?? 'Transaction',
        merchant_name: t.description ?? null,
        amount,
        is_income: isIncome,
        transaction_date: date,
        pending: t.status === 'pending',
        account_name: accountLabel,
        source: 'stripe_fc',
      }
    })

    const { error } = await db.from('money_transactions').upsert(rows, { onConflict: 'plaid_transaction_id' })
    if (error) throw new Error(error.message)

    return NextResponse.json({ imported: rows.length, account: accountLabel })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Stripe FC] import error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
