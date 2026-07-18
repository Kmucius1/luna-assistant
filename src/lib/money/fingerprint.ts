import { createHash } from 'crypto'

// Idempotency key for imports: user + account + posted date + normalized
// merchant + amount + direction. Two imports of the same statement produce
// identical fingerprints and upsert onto the same row instead of duplicating.
export function buildFingerprint(parts: {
  userId: string; accountId: string; postedDate: string | null; merchantNormalized: string; amount: number; direction: string
}): string {
  const raw = [
    parts.userId, parts.accountId, parts.postedDate ?? 'no-date',
    parts.merchantNormalized.toLowerCase().trim(), parts.amount.toFixed(2), parts.direction,
  ].join('|')
  return createHash('sha256').update(raw).digest('hex')
}
