import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUnauthorizedError, resolveMoneyUserId } from '@/lib/money/auth'
import { runImportPipeline } from '@/lib/money/importPipeline'
import type { RawTransactionRow } from '@/lib/money/importParsers'

function mapAccountType(type: string, subtype: string | null): string {
  if (type === 'credit') return 'credit_card'
  if (type === 'loan') return 'loan'
  if (subtype === 'savings') return 'savings'
  return 'checking'
}

function plaidErrorMessage(err: unknown, fallback: string): string {
  const plaidError = (err as { response?: { data?: unknown } })?.response?.data
  console.error('[plaid] error:', plaidError ?? err)
  return (plaidError as { error_message?: string })?.error_message
    ?? (err instanceof Error ? err.message : fallback)
}

export async function POST(req: NextRequest) {
  try {
    const userId = await resolveMoneyUserId()
    const { public_token, institution_id, institution_name } = await req.json() as {
      public_token?: string; institution_id?: string; institution_name?: string
    }
    if (!public_token) return NextResponse.json({ error: 'public_token required' }, { status: 400 })

    const db = createAdminClient()

    let exchangeData
    try {
      const exchange = await plaidClient.itemPublicTokenExchange({ public_token })
      exchangeData = exchange.data
    } catch (err) {
      return NextResponse.json({ error: plaidErrorMessage(err, 'Could not link that account') }, { status: 502 })
    }
    const { access_token, item_id } = exchangeData

    const { data: item, error: itemErr } = await db.from('plaid_items').upsert({
      user_id: userId,
      plaid_item_id: item_id,
      access_token,
      institution_id: institution_id ?? null,
      institution_name: institution_name ?? null,
      products: ['transactions'],
      status: 'active',
      last_synced_at: new Date().toISOString(),
    }, { onConflict: 'plaid_item_id' }).select('id').single()

    if (itemErr || !item) {
      console.error('[plaid/exchange-token] item persist error:', itemErr)
      return NextResponse.json({ error: 'Linked, but failed to save the connection.' }, { status: 500 })
    }

    const plaidToFinancialAccountId = new Map<string, string>()
    try {
      const accountsRes = await plaidClient.accountsGet({ access_token })
      for (const a of accountsRes.data.accounts) {
        const { data: acct, error: acctErr } = await db.from('financial_accounts').upsert({
          user_id: userId,
          plaid_account_id: a.account_id,
          plaid_item_id: item.id,
          nickname: a.name,
          institution_name: institution_name ?? null,
          account_type: mapAccountType(a.type, a.subtype ?? null),
          last_four: a.mask ?? null,
          ownership_type: 'personal',
          current_balance: a.balances.current ?? null,
          available_balance: a.balances.available ?? null,
        }, { onConflict: 'plaid_account_id' }).select('id').single()
        if (!acctErr && acct) plaidToFinancialAccountId.set(a.account_id, acct.id)
      }
    } catch (err) {
      console.error('[plaid/exchange-token] accounts sync failed (non-fatal):', plaidErrorMessage(err, ''))
    }

    let imported = 0
    let cursor: string | undefined
    let hasMore = true
    const rowsByAccount = new Map<string, RawTransactionRow[]>()
    try {
      while (hasMore) {
        const syncRes = await plaidClient.transactionsSync({ access_token, cursor })
        const { added, modified, next_cursor, has_more } = syncRes.data
        for (const t of [...added, ...modified]) {
          const financialAccountId = plaidToFinancialAccountId.get(t.account_id)
          if (!financialAccountId) continue
          const row: RawTransactionRow = {
            date: t.date,
            merchant: t.merchant_name ?? t.name,
            amount: Math.abs(t.amount),
            direction: t.amount < 0 ? 'inflow' : 'outflow',
            status: t.pending ? 'pending' : 'posted',
          }
          if (!rowsByAccount.has(financialAccountId)) rowsByAccount.set(financialAccountId, [])
          rowsByAccount.get(financialAccountId)!.push(row)
        }
        cursor = next_cursor
        hasMore = has_more
      }
      await db.from('plaid_items').update({ cursor, last_synced_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', userId)

      const { data: importRow } = await db.from('financial_imports').insert({
        user_id: userId, source_type: 'plaid', status: 'processing',
      }).select('id').single()

      for (const [financialAccountId, rows] of rowsByAccount) {
        const report = await runImportPipeline(db, userId, financialAccountId, importRow?.id ?? null, rows)
        imported += report.transactionsImported
      }
    } catch (err) {
      console.error('[plaid/exchange-token] transactions sync failed:', plaidErrorMessage(err, ''))
    }

    return NextResponse.json({ imported, institution_name: institution_name ?? 'Bank Account' })
  } catch (err) {
    if (isUnauthorizedError(err)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    console.error('[plaid/exchange-token] error:', err)
    return NextResponse.json({ error: 'Something went wrong linking that account.' }, { status: 500 })
  }
}
