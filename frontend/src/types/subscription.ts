import { PlanFlags } from './catalog'

export type SubscriptionStatus =
  | 'DRAFT'
  | 'QUOTATION'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'

export type SubscriptionAction =
  | 'send_quotation'
  | 'confirm'
  | 'activate'
  | 'pause'
  | 'renew'
  | 'close'

export interface OrderLine {
  id: string
  productId: string
  productName: string
  variantId?: string
  variantName?: string
  qty: number
  unitPrice: number // in cents/paise
  taxId?: string
  taxRate?: number  // in basis points (e.g. 1800 for 18%)
  taxAmount: number // in cents/paise
  discountAmount?: number // in cents/paise
  totalAmount: number // in cents/paise
}

export interface Subscription {
  id: string
  subscriptionNumber: string
  customerId: string
  customerName: string
  customerEmail?: string
  planId: string
  planName: string
  status: SubscriptionStatus
  startDate: string
  expiryDate: string
  paymentTerms: string
  currency: string
  subtotal: number // cents/paise
  taxTotal: number // cents/paise
  discountTotal: number // cents/paise
  totalAmount: number // cents/paise
  lines: OrderLine[]
  flags: PlanFlags
  allowedActions: SubscriptionAction[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface QuotationTemplateLine {
  productId: string
  variantId?: string
  qty: number
  unitPrice: number
}

export interface QuotationTemplate {
  id: string
  name: string
  validityDays: number
  planId: string
  planName: string
  lines: QuotationTemplateLine[]
  createdAt: string
}

