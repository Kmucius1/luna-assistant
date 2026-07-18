import type { SupabaseClient } from '@supabase/supabase-js'
import type { RawTransactionRow } from './importParsers'
import { normalizeMerchant, type MerchantAlias } from './merchants'
import { guessCategory } from './categories'
import { buildFingerprint } from './fingerprint'
import { runAllMatching } from './matching'
import { detectRecurring } from './recurring'
import { detectDuplicates } from './duplicates'
import { computeSafeToSpend } from './safeToSpend'

export interface ImportReport {
  transactionsImported: number
  transactionsSkippedDuplicate: number
  recurringChargesFound: number
  possibleDuplicateCharges: number
  businessExpensesPaidPersonally: number
  transactionsNeedReview: number
  safeToSpend: number
}

const BUSINESS_OWNERSHIP = ['dryp_business', 'client_expense', 'linkd_up_event', 'shared_expense']

// The full spec pipeline: identify account (caller's job — accountId is
// passed in), parse (caller's job via importParsers), normalize merchant,
// match transfers/card-payments/refunds, detect recurring, detect
// duplicates, assign category, flag uncertain ones for review, recompute
// safe-to-spend, produce a report. Idempotent via the fingerprint unique
// constraint — re-importing the same statement upserts onto the same rows.
export async function runImportPipeline(
  db: SupabaseClient,
  userId: string,
  accountId: string,
  importId: string | null,
  rows: RawTransactionRow[]
): Promise<ImportReport> {
  const { data: aliasRows } = await db.from('merchant_aliases').select('raw_pattern, normalized_name, default_category, default_ownership_type').eq('user_id', userId)
  const aliases = (aliasRows ?? []) as MerchantAlias[]

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const { normalized, category: hintCategory, ownership } = normalizeMerchant(row.merchant, aliases)
    const category = guessCategory(normalized, hintCategory)
    const fingerprint = buildFingerprint({
      userId, accountId, postedDate: row.date, merchantNormalized: normalized, amount: row.amount, direction: row.direction,
    })

    const { error, data } = await db.from('transactions').upsert({
      user_id: userId,
      account_id: accountId,
      import_id: importId,
      transaction_date: row.date,
      posted_date: row.status === 'posted' ? row.date : null,
      merchant_raw: row.merchant,
      merchant_normalized: normalized,
      amount: row.amount,
      direction: row.direction,
      status: row.status,
      category,
      ownership_type: ownership ?? 'unknown',
      fingerprint,
      review_status: category === 'unknown' ? 'needs_review' : 'unreviewed',
    }, { onConflict: 'user_id,fingerprint', ignoreDuplicates: true }).select('id')

    if (!error && data && data.length > 0) imported++
    else skipped++
  }

  await runAllMatching(db, userId)
  const recurring = await detectRecurring(db, userId)
  const duplicates = await detectDuplicates(db, userId)

  const { data: businessOnPersonal } = await db.from('transactions')
    .select('id, account_id')
    .eq('user_id', userId)
    .in('ownership_type', BUSINESS_OWNERSHIP)
  let businessExpensesPaidPersonally = 0
  if (businessOnPersonal?.length) {
    const accountIds = [...new Set(businessOnPersonal.map(t => t.account_id))]
    const { data: personalAccounts } = await db.from('financial_accounts').select('id').in('id', accountIds).eq('ownership_type', 'personal')
    const personalAccountIds = new Set((personalAccounts ?? []).map(a => a.id))
    businessExpensesPaidPersonally = businessOnPersonal.filter(t => personalAccountIds.has(t.account_id)).length
  }

  const { count: needsReviewCount } = await db.from('transactions')
    .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('review_status', 'needs_review')

  const safeToSpend = await computeSafeToSpend(db, userId)

  const report: ImportReport = {
    transactionsImported: imported,
    transactionsSkippedDuplicate: skipped,
    recurringChargesFound: recurring.recurringCount + recurring.possibleCount,
    possibleDuplicateCharges: duplicates.alertsCreated,
    businessExpensesPaidPersonally,
    transactionsNeedReview: needsReviewCount ?? 0,
    safeToSpend: safeToSpend.safeToSpend,
  }

  if (importId) {
    await db.from('financial_imports').update({
      status: 'complete', completed_at: new Date().toISOString(), summary: report,
    }).eq('id', importId)
  }

  return report
}
