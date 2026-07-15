import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

async function resolveUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user.id
  } catch { /* fall through */ }
  return ZOE_USER_ID
}

function plaidErrorMessage(err: unknown, fallback: string): string {
  const plaidError = (err as { response?: { data?: unknown } })?.response?.data
  console.error('[plaid] error:', plaidError ?? err)
  return (plaidError as { error_message?: string })?.error_message
    ?? (err instanceof Error ? err.message : fallback)
}

export async function POST(req: NextRequest) {
  try {
    const { public_token, institution_id, institution_name } = await req.json() as {
      public_token?: string; institution_id?: string; institution_name?: string
    }
    if (!public_token) return NextResponse.json({ error: 'public_token required' }, { status: 400 })

    const userId = await resolveUserId()
    const db = createAdminClient()

    // 1. Exchange the temporary public_token for a permanent access_token.
    let exchangeData
    try {
      const exchange = await plaidClient.itemPublicTokenExchange({ public_token })
      exchangeData = exchange.data
    } catch (err) {
      return NextResponse.json({ error: plaidErrorMessage(err, 'Could not link that account') }, { status: 502 })
    }
    const { access_token, item_id } = exchangeData

    // 2. Store the item — access_token never reaches the client.
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

    // 3. Pull accounts.
    const accountNames = new Map<string, string>()
    try {
      const accountsRes = await plaidClient.accountsGet({ access_token })
      const accountRows = accountsRes.data.accounts.map(a => {
        accountNames.set(a.account_id, a.name)
        return {
          user_id: userId,
          plaid_item_id: item.id,
          plaid_account_id: a.account_id,
          name: a.name,
          official_name: a.official_name ?? null,
          type: a.type,
          subtype: a.subtype ?? null,
          mask: a.mask ?? null,
          current_balance: a.balances.current ?? null,
          available_balance: a.balances.available ?? null,
          iso_currency_code: a.balances.iso_currency_code ?? 'USD',
          last_balance_update: new Date().toISOString(),
        }
      })
      if (accountRows.length) {
        await db.from('plaid_accounts').upsert(accountRows, { onConflict: 'plaid_account_id' })
      }
    } catch (err) {
      console.error('[plaid/exchange-token] accounts sync failed (non-fatal):', plaidErrorMessage(err, ''))
    }

    // 4. Initial transactions sync (cursor-based — the modern Plaid pattern,
    // matches plaid_items.cursor already in the schema).
    let imported = 0
    let cursor: string | undefined
    let hasMore = true
    try {
      while (hasMore) {
        const syncRes = await plaidClient.transactionsSync({ access_token, cursor })
        const { added, modified, next_cursor, has_more } = syncRes.data
        const rows = [...added, ...modified].map(t => ({
          user_id: userId,
          plaid_item_id: item.id,
          plaid_account_id: t.account_id,
          plaid_transaction_id: t.transaction_id,
          account_name: accountNames.get(t.account_id) ?? institution_name ?? 'Bank Account',
          amount: Math.abs(t.amount),
          is_income: t.amount < 0, // Plaid: positive = money out, negative = money in
          transaction_date: t.date,
          authorized_date: t.authorized_date ?? null,
          merchant_name: t.merchant_name ?? null,
          name: t.name,
          payment_channel: t.payment_channel ?? null,
          pending: t.pending,
          category_primary: t.personal_finance_category?.primary ?? t.category?.[0] ?? null,
          category_detailed: t.personal_finance_category?.detailed ?? null,
          personal_finance_category: t.personal_finance_category ?? null,
          raw: t,
        }))
        if (rows.length) {
          const { error: txnErr } = await db.from('money_transactions').upsert(rows, { onConflict: 'plaid_transaction_id' })
          if (!txnErr) imported += rows.length
          else console.error('[plaid/exchange-token] transaction upsert error:', txnErr)
        }
        cursor = next_cursor
        hasMore = has_more
      }
      await db.from('plaid_items').update({ cursor, last_synced_at: new Date().toISOString() }).eq('id', item.id)
    } catch (err) {
      console.error('[plaid/exchange-token] transactions sync failed:', plaidErrorMessage(err, ''))
      // Item is linked even if the initial sync hiccuped — she can retry sync later.
    }

    return NextResponse.json({ imported, institution_name: institution_name ?? 'Bank Account' })
  } catch (err) {
    console.error('[plaid/exchange-token] error:', err)
    return NextResponse.json({ error: 'Something went wrong linking that account.' }, { status: 500 })
  }
}
