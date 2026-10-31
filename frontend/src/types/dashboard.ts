export interface FinanceKpis {
  activeSubscriptions: number
  revenueCollected: number // cents/paise
  outstandingAmount: number // cents/paise
  overdueInvoicesCount: number
  mrr: number // cents/paise
  currency: string
}

export interface RevenueDataPoint {
  period: string
  revenue: number // cents/paise
  projected: number // cents/paise
}

export interface BillingRunResult {
  created: number
  skipped: number
  failed: number
  invoiceIds: string[]
  timestamp: string
}
