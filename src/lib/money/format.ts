export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Math.abs(amount))
}

export const CATEGORY_ICONS: Record<string, string> = {
  income: '💚', transfer: '🔁', debt_payment: '💳', phone_internet: '📱', insurance: '🛡️',
  groceries: '🛒', gas: '⛽', pharmacy_medical: '💊', household_necessities: '🧻', dining: '🍽️',
  coffee: '☕', delivery: '🛵', shopping: '🛍️', beauty_personal_care: '💅', nightlife: '🍸',
  smoke_vape: '💨', entertainment: '🎬', subscriptions: '🔄', business_software: '💻',
  business_advertising: '📣', business_hosting_domains: '🌐', event_expense: '🎟️', travel: '✈️',
  fees: '⚠️', savings: '🏦', taxes: '📄', unknown: '❓',
}
