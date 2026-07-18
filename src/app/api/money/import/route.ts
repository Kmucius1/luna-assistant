import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveMoneyUserId } from '@/lib/money/auth'
import { parseCsv, extractTransactionsFromImage, extractTransactionsFromPdf, type RawTransactionRow } from '@/lib/money/importParsers'
import { runImportPipeline } from '@/lib/money/importPipeline'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      account_id?: string
      source_type?: 'csv' | 'pdf' | 'image' | 'manual'
      filename?: string
      csv_content?: string
      file_data_url?: string // base64 data URL for pdf/image
      manual_transaction?: { date: string; merchant: string; amount: number; direction: 'inflow' | 'outflow'; status?: 'pending' | 'posted' }
    }
    const { account_id, source_type, filename, csv_content, file_data_url, manual_transaction } = body
    if (!account_id || !source_type) {
      return NextResponse.json({ error: 'account_id and source_type are required' }, { status: 400 })
    }

    const userId = await resolveMoneyUserId()
    const db = createAdminClient()

    let rows: RawTransactionRow[] = []
    switch (source_type) {
      case 'csv':
        if (!csv_content) return NextResponse.json({ error: 'csv_content required' }, { status: 400 })
        rows = parseCsv(csv_content)
        break
      case 'image':
        if (!file_data_url) return NextResponse.json({ error: 'file_data_url required' }, { status: 400 })
        rows = await extractTransactionsFromImage(file_data_url)
        break
      case 'pdf': {
        if (!file_data_url) return NextResponse.json({ error: 'file_data_url required' }, { status: 400 })
        const base64 = file_data_url.split(',')[1]
        rows = await extractTransactionsFromPdf(Buffer.from(base64, 'base64'))
        break
      }
      case 'manual':
        if (!manual_transaction) return NextResponse.json({ error: 'manual_transaction required' }, { status: 400 })
        rows = [{
          date: manual_transaction.date, merchant: manual_transaction.merchant,
          amount: Math.abs(manual_transaction.amount), direction: manual_transaction.direction,
          status: manual_transaction.status ?? 'posted',
        }]
        break
    }

    if (!rows.length) {
      return NextResponse.json({ error: source_type === 'manual' ? 'Could not save that transaction.' : "Couldn't read any transactions from that file — try a clearer statement or check the format." }, { status: 200 })
    }

    // Idempotency: same account + same content = same hash, so re-uploading
    // the identical statement doesn't create a second import record.
    const importHash = source_type === 'manual'
      ? null
      : createHash('sha256').update(`${account_id}|${source_type}|${csv_content ?? file_data_url ?? ''}`).digest('hex')

    const { data: importRow, error: importErr } = await db.from('financial_imports').insert({
      user_id: userId,
      account_id,
      source_type,
      source_filename: filename ?? null,
      import_hash: importHash,
      status: 'processing',
    }).select('id').single()
    if (importErr) {
      // Duplicate hash (same statement re-uploaded) — still safe to run the
      // pipeline again since transaction fingerprints dedupe independently.
      console.warn('[money/import] import record insert warning:', importErr.message)
    }

    const report = await runImportPipeline(db, userId, account_id, importRow?.id ?? null, rows)
    return NextResponse.json({ report })
  } catch (err) {
    console.error('[money/import] error:', err)
    return NextResponse.json({ error: 'Import failed. Try again.' }, { status: 500 })
  }
}
