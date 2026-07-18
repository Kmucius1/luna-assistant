// Merchant normalization — built-in patterns from the Luna Money spec, plus
// Zoe's own saved aliases (merchant_aliases table) which always take
// priority since they reflect her own corrections.

interface BuiltInAlias { pattern: RegExp; normalized: string; category?: string; ownership?: string }

// Order matters — more specific patterns first so e.g. "Amazon Prime" isn't
// swallowed by a generic "Amazon" match.
const BUILT_IN_ALIASES: BuiltInAlias[] = [
  { pattern: /openai|chatgpt/i, normalized: 'OpenAI / ChatGPT', category: 'business_software' },
  { pattern: /anthropic|claude\.ai/i, normalized: 'Anthropic / Claude', category: 'business_software' },
  { pattern: /autods/i, normalized: 'AutoDS', category: 'business_software' },
  { pattern: /vercel/i, normalized: 'Vercel', category: 'business_hosting_domains' },
  { pattern: /godaddy/i, normalized: 'GoDaddy', category: 'business_hosting_domains' },
  { pattern: /google\s*workspace|gsuite/i, normalized: 'Google Workspace', category: 'business_software' },
  { pattern: /amazon\s*prime/i, normalized: 'Amazon Prime', category: 'subscriptions' },
  { pattern: /amazon\s*(digital|prime video|music)/i, normalized: 'Amazon Digital', category: 'entertainment' },
  { pattern: /amazon(\.com|mktp| marketplace)?/i, normalized: 'Amazon Marketplace', category: 'shopping' },
  { pattern: /google\s*\*?(purchase|play|storage)/i, normalized: 'Google Purchase', category: 'shopping' },
  { pattern: /apple\.com\/?bill|apple\s*services/i, normalized: 'Apple.com/bill', category: 'subscriptions' },
  { pattern: /apple\s*cash/i, normalized: 'Apple Cash', category: 'transfer' },
  { pattern: /netflix/i, normalized: 'Netflix', category: 'entertainment' },
  { pattern: /hulu/i, normalized: 'Hulu', category: 'entertainment' },
  { pattern: /spotify/i, normalized: 'Spotify', category: 'entertainment' },
  { pattern: /siteseeker\s*pro/i, normalized: 'SiteSeeker Pro', category: 'business_software' },
  { pattern: /read\.?ai/i, normalized: 'Read.ai', category: 'business_software' },
  { pattern: /opus\s*clip/i, normalized: 'Opus Clip', category: 'business_software' },
  { pattern: /crunch\s*fitness|crunch\s*gym/i, normalized: 'Crunch Fitness', category: 'entertainment' },
  { pattern: /credit\s*one/i, normalized: 'Credit One', category: 'debt_payment' },
  { pattern: /at&t|att\s*\*?bill/i, normalized: 'AT&T', category: 'phone_internet' },
  { pattern: /spectrum/i, normalized: 'Spectrum', category: 'phone_internet' },
  { pattern: /chase.*(monthly|maintenance)\s*fee/i, normalized: 'Chase Monthly Fee', category: 'fees' },
  { pattern: /bank\s*of\s*america.*(maintenance|monthly)\s*fee/i, normalized: 'Bank of America Maintenance Fee', category: 'fees' },
  { pattern: /acorns/i, normalized: 'Acorns', category: 'savings' },
  { pattern: /edreams\s*prime/i, normalized: 'eDreams Prime', category: 'subscriptions' },
  { pattern: /fanbasis/i, normalized: 'Fanbasis', category: 'unknown' },
  { pattern: /frontier\s*ai/i, normalized: 'Frontier AI', category: 'business_software' },
  { pattern: /south\s*beach\s*tanning/i, normalized: 'South Beach Tanning', category: 'beauty_personal_care' },
  { pattern: /uber\s*eats/i, normalized: 'Uber Eats', category: 'delivery' },
  { pattern: /starbucks/i, normalized: 'Starbucks', category: 'coffee' },
  { pattern: /dunkin/i, normalized: 'Dunkin', category: 'coffee' },
  { pattern: /target/i, normalized: 'Target', category: 'shopping' },
  { pattern: /publix/i, normalized: 'Publix', category: 'groceries' },
  { pattern: /whole\s*foods/i, normalized: 'Whole Foods', category: 'groceries' },
  { pattern: /walgreens/i, normalized: 'Walgreens', category: 'pharmacy_medical' },
  { pattern: /\bcvs\b/i, normalized: 'CVS', category: 'pharmacy_medical' },
  { pattern: /\bwawa\b/i, normalized: 'Wawa', category: 'gas' },
  { pattern: /dollar\s*tree/i, normalized: 'Dollar Tree', category: 'shopping' },
  { pattern: /urban\s*planet/i, normalized: 'Urban Planet', category: 'shopping' },
  { pattern: /\btemu\b/i, normalized: 'Temu', category: 'shopping' },
  { pattern: /dhgate/i, normalized: 'DHgate', category: 'shopping' },
]

export interface MerchantAlias { raw_pattern: string; normalized_name: string; default_category?: string | null; default_ownership_type?: string | null }

export interface NormalizedMerchant { normalized: string; category?: string; ownership?: string }

export function normalizeMerchant(raw: string, userAliases: MerchantAlias[] = []): NormalizedMerchant {
  const cleaned = raw.trim()

  // Zoe's own saved aliases win over built-ins — substring match, case-insensitive.
  const userMatch = userAliases.find(a => cleaned.toLowerCase().includes(a.raw_pattern.toLowerCase()))
  if (userMatch) {
    return { normalized: userMatch.normalized_name, category: userMatch.default_category ?? undefined, ownership: userMatch.default_ownership_type ?? undefined }
  }

  const builtIn = BUILT_IN_ALIASES.find(a => a.pattern.test(cleaned))
  if (builtIn) return { normalized: builtIn.normalized, category: builtIn.category }

  // No known alias — return a title-cased, whitespace-collapsed version of
  // the raw string rather than leaving it as noisy POS text.
  const fallback = cleaned
    .replace(/\s+/g, ' ')
    .replace(/#\d+.*$/, '')
    .replace(/\d{4,}/g, '')
    .trim()
  return { normalized: fallback || cleaned, category: undefined }
}
