import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ZOE_USER_ID = '5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb'

interface ImportRow {
  merchant: string
  category?: string
  amount?: number
  frequency?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await req.json() as {
      rows: ImportRow[]
      source_period?: string
      file_name?: string
    }
    const { rows, source_period, file_name } = body

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    // Fetch existing subscriptions
    const { data: existingSubs } = await db
      .from('money_subscriptions')
      .select('id, merchant_name')
      .eq('user_id', ZOE_USER_ID)

    const existingMap: Record<string, string> = {}
    for (const sub of existingSubs ?? []) {
      if (sub.merchant_name) {
        existingMap[sub.merchant_name.toLowerCase()] = sub.id
      }
    }

    // Create import record
    const { data: importRecord, error: importError } = await db
      .from('money_imports')
      .insert({
        user_id: ZOE_USER_ID,
        file_name: file_name ?? 'manual-import.csv',
        import_type: 'subscriptions',
        source_period: source_period ?? 'Manual',
        status: 'processing',
        total_rows: rows.length,
        matched_rows: 0,
      })
      .select()
      .single()

    if (importError) {
      console.error('[sub-import] import record error:', importError)
      return NextResponse.json({ error: importError.message }, { status: 500 })
    }

    let matched = 0
    let new_subs = 0

    for (const row of rows) {
      const key = row.merchant.toLowerCase()
      const existingId = existingMap[key]

      if (existingId) {
        matched++
        // Update if amount provided
        if (row.amount) {
          await db.from('money_subscriptions')
            .update({ amount_estimate: row.amount, updated_at: new Date().toISOString() })
            .eq('id', existingId)
        }
        await db.from('money_import_rows').insert({
          user_id: ZOE_USER_ID,
          import_id: importRecord.id,
          merchant: row.merchant,
          category: row.category ?? 'Other',
          amount: row.amount ?? 0,
          frequency: row.frequency ?? 'monthly',
          notes: row.notes ?? null,
          status: 'matched',
          matched_subscription_id: existingId,
          result_status: 'matched',
        })
      } else {
        // Try fuzzy match via ilike
        const { data: fuzzy } = await db
          .from('money_subscriptions')
          .select('id')
          .eq('user_id', ZOE_USER_ID)
          .ilike('merchant_name', `%${row.merchant}%`)
          .maybeSingle()

        if (fuzzy) {
          matched++
          await db.from('money_import_rows').insert({
            user_id: ZOE_USER_ID,
            import_id: importRecord.id,
            merchant: row.merchant,
            category: row.category ?? 'Other',
            amount: row.amount ?? 0,
            frequency: row.frequency ?? 'monthly',
            status: 'matched',
            matched_subscription_id: fuzzy.id,
            result_status: 'fuzzy_match',
          })
        } else {
          // Insert new subscription
          const { data: newSub } = await db.from('money_subscriptions').insert({
            user_id: ZOE_USER_ID,
            merchant_name: row.merchant,
            amount_estimate: row.amount ?? 0,
            frequency: row.frequency ?? 'monthly',
            category: row.category ?? 'Other',
            notes: row.notes ?? null,
            status: 'active',
          }).select().single()

          new_subs++
          await db.from('money_import_rows').insert({
            user_id: ZOE_USER_ID,
            import_id: importRecord.id,
            merchant: row.merchant,
            category: row.category ?? 'Other',
            amount: row.amount ?? 0,
            frequency: row.frequency ?? 'monthly',
            status: 'new',
            matched_subscription_id: newSub?.id ?? null,
            result_status: 'created',
          })
        }
      }
    }

    // Update import record
    await db.from('money_imports').update({
      status: 'complete',
      matched_rows: matched,
    }).eq('id', importRecord.id)

    return NextResponse.json({
      matched,
      new_subs,
      total: rows.length,
      import_id: importRecord.id,
    })
  } catch (error) {
    console.error('[sub-import] error:', error)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
