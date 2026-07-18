export const CATEGORIES = [
  'income', 'transfer', 'debt_payment', 'phone_internet', 'insurance', 'groceries',
  'gas', 'pharmacy_medical', 'household_necessities', 'dining', 'coffee', 'delivery',
  'shopping', 'beauty_personal_care', 'nightlife', 'smoke_vape', 'entertainment',
  'subscriptions', 'business_software', 'business_advertising', 'business_hosting_domains',
  'event_expense', 'travel', 'fees', 'savings', 'taxes', 'unknown',
] as const

export type MoneyCategory = typeof CATEGORIES[number]

const KEYWORD_CATEGORIES: [RegExp, MoneyCategory][] = [
  [/grocery|supermarket|market/i, 'groceries'],
  [/gas station|fuel|chevron|shell|exxon|bp\b/i, 'gas'],
  [/pharmacy|drug\s*store/i, 'pharmacy_medical'],
  [/restaurant|grill|kitchen|diner/i, 'dining'],
  [/coffee|cafe/i, 'coffee'],
  [/deliver|doordash|grubhub|instacart/i, 'delivery'],
  [/salon|nails|spa|barber/i, 'beauty_personal_care'],
  [/bar\b|lounge|nightclub/i, 'nightlife'],
  [/vape|smoke\s*shop|tobacco/i, 'smoke_vape'],
  [/movie|theater|cinema|concert/i, 'entertainment'],
  [/insurance/i, 'insurance'],
  [/hotel|airbnb|flight|airline/i, 'travel'],
  [/\bfee\b|overdraft|nsf/i, 'fees'],
  [/tax|irs/i, 'taxes'],
]

export function guessCategory(merchantNormalized: string, merchantHintCategory?: string): MoneyCategory {
  if (merchantHintCategory && (CATEGORIES as readonly string[]).includes(merchantHintCategory)) {
    return merchantHintCategory as MoneyCategory
  }
  const hit = KEYWORD_CATEGORIES.find(([re]) => re.test(merchantNormalized))
  return hit ? hit[1] : 'unknown'
}
