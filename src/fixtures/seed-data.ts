export interface SeedProductVariant {
  id: string;
  name: string;
  priceExtra: number;
}

export interface SeedProduct {
  id: string;
  name: string;
  type: 'SOFTWARE' | 'ADDON' | 'SERVICE';
  salesPrice: number;
  costPrice: number;
  notes: string;
  variants: SeedProductVariant[];
}

export interface SeedPlan {
  id: string;
  name: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  minQuantity: number;
  autoClose: boolean;
  allowPause: boolean;
  allowEarlyClose: boolean;
  allowRenewal: boolean;
}

export interface SeedTaxRule {
  id: string;
  name: string;
  ratePercentage: number;
  fixedAmount: number;
  type: 'PERCENTAGE' | 'FIXED';
  isInclusive: boolean;
  isActive: boolean;
}

export interface SeedDiscountRule {
  id: string;
  code: string;
  type: 'FIXED' | 'PERCENTAGE';
  value: number;
  minQuantity: number;
  minPurchaseAmount: number;
  startDate: string | null;
  endDate: string | null;
  maxUses: number;
  currentUses: number;
  productId: string | null;
  isActive: boolean;
}

export interface SeedCustomer {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER';
  companyName: string;
  address: string;
}

export interface SeedSubscriptionLine {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
}

export interface SeedSubscription {
  id: string;
  subscriptionNumber: string;
  customerId: string;
  planId: string;
  status: 'ACTIVE' | 'DRAFT' | 'QUOTATION' | 'PAUSED' | 'CLOSED';
  startDate: string;
  nextBillingDate: string;
  paymentTerms: string;
  appliedDiscountId: string | null;
  lines: SeedSubscriptionLine[];
}

export interface SeedInvoicePayment {
  id: string;
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH';
  amount: number;
  paymentDate: string;
  notes: string;
}

export interface SeedInvoiceLine {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineTotal: number;
}

export interface SeedInvoice {
  id: string;
  invoiceNumber: string;
  subscriptionId: string;
  customerId: string;
  status: 'PAID' | 'CONFIRMED' | 'DRAFT' | 'CANCELLED';
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  lines: SeedInvoiceLine[];
  payments: SeedInvoicePayment[];
}

export interface SeedDataset {
  products: SeedProduct[];
  plans: SeedPlan[];
  taxes: SeedTaxRule[];
  discounts: SeedDiscountRule[];
  customers: SeedCustomer[];
  subscriptions: SeedSubscription[];
  invoices: SeedInvoice[];
}
