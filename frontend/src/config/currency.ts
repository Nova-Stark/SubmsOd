// Single source of truth for Brightloop platform currency configuration

export const CURRENCY_CONFIG = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
  subunitsPerUnit: 100, // Cents / Paise
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
} as const

export type CurrencyCode = typeof CURRENCY_CONFIG.code

