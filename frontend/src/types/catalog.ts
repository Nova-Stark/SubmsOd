export type ProductType = 'SOFTWARE' | 'ADDON' | 'SERVICE'

export interface ProductVariant {
  id: string
  productId: string
  variantName: string
  priceExtra: number // in cents/paise
  createdAt?: string
}

export interface Product {
  id: string
  name: string
  type: ProductType
  salesPrice: number // in cents/paise
  costPrice: number  // in cents/paise
  notes?: string
  variants: ProductVariant[]
  createdAt: string
  updatedAt?: string
}

export type BillingPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface PlanFlags {
  allowPause: boolean
  allowRenew: boolean
  allowEarlyClose: boolean
  autoCloseOnEnd: boolean
}

export interface Plan {
  id: string
  name: string
  price: number // in cents/paise
  billingPeriod: BillingPeriod
  minQty: number
  startDate: string
  endDate: string | null
  flags: PlanFlags
  allowedActions: string[]
  createdAt?: string
}

export interface TaxRule {
  id: string
  name: string
  rate: number // stored in hundredths of percent: 1800 = 18.00%
  computation: 'PERCENTAGE' | 'FIXED'
  isIncludedInPrice: boolean
}

export interface DiscountRule {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number // in cents/paise or hundredths of percent
  minSpend: number // in cents/paise
  minQty: number
  startDate: string
  endDate: string
  maxUsage: number
  currentUsage: number
  target: 'SUBSCRIPTION' | 'PRODUCT'
  targetProductIds?: string[]
}
