export type InvoiceStatus = 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED'

export type PaymentMethod = 'BANK_TRANSFER' | 'CREDIT_CARD' | 'UPI' | 'CASH'

export interface Payment {
  id: string
  invoiceId: string
  method: PaymentMethod
  amount: number // cents/paise
  date: string
  note?: string
  createdAt: string
}

export interface InvoiceLine {
  id: string
  description: string
  qty: number
  unitPrice: number // cents/paise
  taxRate: number   // basis points
  amount: number     // cents/paise
}

export interface Invoice {
  id: string
  invoiceNumber: string
  subscriptionId?: string
  subscriptionNumber?: string
  customerId: string
  customerName: string
  customerEmail: string
  customerAddress?: string
  gstin?: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  isOverdue: boolean
  lines: InvoiceLine[]
  subtotal: number       // cents/paise
  taxAmount: number      // cents/paise
  discountAmount: number // cents/paise
  totalAmount: number    // cents/paise
  amountPaid: number     // cents/paise
  amountDue: number      // cents/paise
  currency: string
  payments: Payment[]
  notes?: string
  createdAt: string
  updatedAt: string
}

