import { CURRENCY_CONFIG } from '@/config/currency'

/**
 * Format monetary amount stored in cents/paise to localized string
 * @param cents Amount in smallest currency unit (e.g. 56000 cents = ₹560.00)
 */
export function formatCurrency(cents: number): string {
  const units = (cents || 0) / CURRENCY_CONFIG.subunitsPerUnit
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.code,
    minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
    maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits,
  }).format(units)
}

/**
 * Format monetary amount in compact Indian notation for KPI cards (e.g. ₹3.48 Cr, ₹5.20 L)
 */
export function formatCompactCurrency(cents: number): string {
  const units = (cents || 0) / CURRENCY_CONFIG.subunitsPerUnit
  if (Math.abs(units) >= 10_000_000) {
    return `${CURRENCY_CONFIG.symbol}${(units / 10_000_000).toFixed(2)} Cr`
  }
  if (Math.abs(units) >= 100_000) {
    return `${CURRENCY_CONFIG.symbol}${(units / 100_000).toFixed(2)} L`
  }
  return formatCurrency(cents)
}

/**
 * Format basis points (e.g. 1800) into a readable tax percentage (18%)
 */
export function formatTaxRate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`
}

/**
 * Standard date formatter
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—'
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    return new Intl.DateTimeFormat(CURRENCY_CONFIG.locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateString
  }
}

