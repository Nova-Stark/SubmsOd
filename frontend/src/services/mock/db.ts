import { User } from '@/types/auth'
import { Product, Plan, TaxRule, DiscountRule } from '@/types/catalog'
import { Customer } from '@/types/customer'
import { Subscription, QuotationTemplate } from '@/types/subscription'
import { Invoice, Payment } from '@/types/invoice'

export interface MockDatabase {
  users: User[]
  customers: Customer[]
  products: Product[]
  plans: Plan[]
  quotationTemplates: QuotationTemplate[]
  subscriptions: Subscription[]
  invoices: Invoice[]
  payments: Payment[]
  taxes: TaxRule[]
  discounts: DiscountRule[]
  resetTokens: { email: string; tokenCode: string; expiresAt: number }[]
}

export function createInitialDatabase(): MockDatabase {
  const users: User[] = [
    {
      id: 'usr_admin',
      email: 'admin@brightloop.io',
      name: 'Elena Vance (Finance Lead & Admin)',
      role: 'ADMIN',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'usr_staff',
      email: 'staff@brightloop.io',
      name: 'Rohan Sharma (Operations & Sales)',
      role: 'STAFF',
      isActive: true,
      createdAt: '2026-01-05T00:00:00Z',
    },
    {
      id: 'usr_customer',
      email: 'sarah@acme.inc',
      name: 'Sarah Connor (Acme Corp)',
      role: 'CUSTOMER',
      isActive: true,
      createdAt: '2026-01-10T00:00:00Z',
    },
  ]

  const customers: Customer[] = [
    {
      id: 'cust_acme',
      name: 'Acme Corp',
      email: 'sarah@acme.inc',
      phone: '+91 9876543210',
      company: 'Acme Technologies Pvt Ltd',
      gstin: '32AAAAA0000A1Z5',
      address: 'Plot 42, Infopark Phase II, Kochi, Kerala',
      activeSubscriptionsCount: 2,
      createdAt: '2026-01-10T00:00:00Z',
    },
    {
      id: 'cust_global',
      name: 'Global Logistics',
      email: 'finance@globallog.com',
      phone: '+91 9998887776',
      company: 'Global Freight Solutions',
      gstin: '32BBBBB1111B2Z6',
      address: 'Harbor Road, Willingdon Island, Kochi',
      activeSubscriptionsCount: 1,
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'cust_kerala',
      name: 'Kerala Tech Hub',
      email: 'billing@keralatech.io',
      phone: '+91 9123456789',
      company: 'Kerala Tech Innovations Ltd',
      gstin: '32CCCCC2222C3Z7',
      address: 'Maker Village, Kalamassery, Kochi',
      activeSubscriptionsCount: 1,
      createdAt: '2026-02-01T00:00:00Z',
    },
  ]

  const products: Product[] = [
    {
      id: 'prod_erp',
      name: 'Brightloop ERP Core',
      type: 'SOFTWARE',
      salesPrice: 499900, // ₹4,999.00
      costPrice: 200000,  // ₹2,000.00
      notes: 'Unified financial and supply chain automation suite.',
      createdAt: '2026-01-01T00:00:00Z',
      variants: [
        {
          id: 'var_erp_std',
          productId: 'prod_erp',
          variantName: 'Brand: Standard Cloud',
          priceExtra: 0,
        },
        {
          id: 'var_erp_odoo',
          productId: 'prod_erp',
          variantName: 'Brand: Odoo Enterprise Connector',
          priceExtra: 56000, // ₹560.00 extra!
        },
      ],
    },
    {
      id: 'prod_ledger',
      name: 'Multi-Entity Ledger Add-on',
      type: 'ADDON',
      salesPrice: 249900, // ₹2,499.00
      costPrice: 80000,
      notes: 'Consolidated reporting across subsidiary business units.',
      createdAt: '2026-01-02T00:00:00Z',
      variants: [],
    },
    {
      id: 'prod_storage',
      name: 'Managed Cloud Backup 1TB',
      type: 'ADDON',
      salesPrice: 99900, // ₹999.00
      costPrice: 35000,
      notes: 'Automated off-site hourly database replication.',
      createdAt: '2026-01-03T00:00:00Z',
      variants: [
        {
          id: 'var_stor_std',
          productId: 'prod_storage',
          variantName: 'Storage: Standard Coldline',
          priceExtra: 0,
        },
        {
          id: 'var_stor_nvme',
          productId: 'prod_storage',
          variantName: 'Storage: High-IOPS NVMe',
          priceExtra: 35000, // ₹350.00 extra
        },
      ],
    },
    {
      id: 'prod_consult',
      name: 'Solution Architect Consulting',
      type: 'SERVICE',
      salesPrice: 1500000, // ₹15,000.00
      costPrice: 800000,
      notes: 'Dedicated technical onboarding and data migration.',
      createdAt: '2026-01-04T00:00:00Z',
      variants: [],
    },
  ]

  const plans: Plan[] = [
    {
      id: 'plan_monthly',
      name: 'Enterprise Monthly Scale',
      price: 1200000, // ₹12,000.00 / month
      billingPeriod: 'MONTHLY',
      minQty: 1,
      startDate: '2026-01-01',
      endDate: null,
      flags: {
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
        autoCloseOnEnd: false,
      },
      allowedActions: ['pause', 'renew', 'close'],
    },
    {
      id: 'plan_annual',
      name: 'Corporate Annual Pro',
      price: 11900000, // ₹1,19,000.00 / year
      billingPeriod: 'YEARLY',
      minQty: 3,
      startDate: '2026-01-01',
      endDate: '2028-12-31',
      flags: {
        allowPause: false,
        allowRenew: true,
        allowEarlyClose: false,
        autoCloseOnEnd: true,
      },
      allowedActions: ['renew'],
    },
    {
      id: 'plan_daily',
      name: 'Burst Compute Daily Tier',
      price: 50000, // ₹500.00 / day
      billingPeriod: 'DAILY',
      minQty: 1,
      startDate: '2026-01-01',
      endDate: null,
      flags: {
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
        autoCloseOnEnd: true,
      },
      allowedActions: ['pause', 'renew', 'close'],
    },
  ]

  const taxes: TaxRule[] = [
    {
      id: 'tax_gst_18',
      name: 'GST @ 18% (Standard SaaS Rate)',
      rate: 1800, // 18.00%
      computation: 'PERCENTAGE',
      isIncludedInPrice: false,
    },
    {
      id: 'tax_zero',
      name: 'Zero Rated / SEZ Export (0%)',
      rate: 0,
      computation: 'PERCENTAGE',
      isIncludedInPrice: false,
    },
  ]

  const discounts: DiscountRule[] = [
    {
      id: 'disc_diwali',
      code: 'DIWALI2026',
      type: 'PERCENTAGE',
      value: 1500, // 15.00%
      minSpend: 1000000, // ₹10,000
      minQty: 1,
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      maxUsage: 100,
      currentUsage: 14,
      target: 'SUBSCRIPTION',
    },
    {
      id: 'disc_fixed500',
      code: 'WELCOME500',
      type: 'FIXED',
      value: 50000, // ₹500.00
      minSpend: 200000,
      minQty: 1,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      maxUsage: 500,
      currentUsage: 89,
      target: 'SUBSCRIPTION',
    },
  ]

  const quotationTemplates: QuotationTemplate[] = [
    {
      id: 'qtmpl_growth',
      name: 'Growth Tech Bundle (Odoo Edition)',
      validityDays: 30,
      planId: 'plan_monthly',
      planName: 'Enterprise Monthly Scale',
      lines: [
        {
          productId: 'prod_erp',
          variantId: 'var_erp_odoo',
          qty: 5,
          unitPrice: 555900, // ₹4999 + ₹560 = ₹5,559.00
        },
        {
          productId: 'prod_storage',
          variantId: 'var_stor_nvme',
          qty: 2,
          unitPrice: 134900, // ₹999 + ₹350 = ₹1,349.00
        },
      ],
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'qtmpl_starter',
      name: 'Startup Quick-Launch Pack',
      validityDays: 14,
      planId: 'plan_monthly',
      planName: 'Enterprise Monthly Scale',
      lines: [
        {
          productId: 'prod_erp',
          variantId: 'var_erp_std',
          qty: 2,
          unitPrice: 499900,
        },
      ],
      createdAt: '2026-02-01T00:00:00Z',
    },
  ]

  const subscriptions: Subscription[] = [
    {
      id: 'sub_1001',
      subscriptionNumber: 'SUB/2026/00101',
      customerId: 'cust_acme',
      customerName: 'Acme Corp',
      customerEmail: 'sarah@acme.inc',
      planId: 'plan_monthly',
      planName: 'Enterprise Monthly Scale',
      status: 'ACTIVE',
      startDate: '2026-02-01',
      expiryDate: '2027-01-31',
      paymentTerms: 'Net 30',
      currency: 'INR',
      subtotal: 3049300,
      taxTotal: 548874,
      discountTotal: 0,
      totalAmount: 3598174,
      flags: {
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
        autoCloseOnEnd: false,
      },
      allowedActions: ['pause', 'renew', 'close'],
      notes: 'Primary production contract with Odoo enterprise variant.',
      createdAt: '2026-01-28T10:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      lines: [
        {
          id: 'line_101',
          productId: 'prod_erp',
          productName: 'Brightloop ERP Core',
          variantId: 'var_erp_odoo',
          variantName: 'Brand: Odoo Enterprise Connector',
          qty: 5,
          unitPrice: 555900,
          taxId: 'tax_gst_18',
          taxRate: 1800,
          taxAmount: 500310,
          totalAmount: 3279810,
        },
        {
          id: 'line_102',
          productId: 'prod_storage',
          productName: 'Managed Cloud Backup 1TB',
          variantId: 'var_stor_nvme',
          variantName: 'Storage: High-IOPS NVMe',
          qty: 2,
          unitPrice: 134900,
          taxId: 'tax_gst_18',
          taxRate: 1800,
          taxAmount: 48564,
          totalAmount: 318364,
        },
      ],
    },
    {
      id: 'sub_1002',
      subscriptionNumber: 'SUB/2026/00102',
      customerId: 'cust_acme',
      customerName: 'Acme Corp',
      customerEmail: 'sarah@acme.inc',
      planId: 'plan_annual',
      planName: 'Corporate Annual Pro',
      status: 'CONFIRMED',
      startDate: '2026-03-01',
      expiryDate: '2027-02-28',
      paymentTerms: 'Immediate',
      currency: 'INR',
      subtotal: 11900000,
      taxTotal: 2142000,
      discountTotal: 1785000,
      totalAmount: 12257000,
      flags: {
        allowPause: false,
        allowRenew: true,
        allowEarlyClose: false,
        autoCloseOnEnd: true,
      },
      allowedActions: ['activate', 'close'],
      notes: 'Upcoming annual contract waiting for billing day activation.',
      createdAt: '2026-02-20T12:00:00Z',
      updatedAt: '2026-02-22T09:00:00Z',
      lines: [
        {
          id: 'line_103',
          productId: 'prod_erp',
          productName: 'Brightloop ERP Core',
          variantId: 'var_erp_std',
          variantName: 'Brand: Standard Cloud',
          qty: 3,
          unitPrice: 3966666,
          taxId: 'tax_gst_18',
          taxRate: 1800,
          taxAmount: 2142000,
          totalAmount: 14042000,
        },
      ],
    },
    {
      id: 'sub_1003',
      subscriptionNumber: 'SUB/2026/00103',
      customerId: 'cust_global',
      customerName: 'Global Logistics',
      customerEmail: 'finance@globallog.com',
      planId: 'plan_monthly',
      planName: 'Enterprise Monthly Scale',
      status: 'ACTIVE',
      startDate: '2026-01-15',
      expiryDate: '2027-01-14',
      paymentTerms: 'Net 15',
      currency: 'INR',
      subtotal: 4999000,
      taxTotal: 899820,
      discountTotal: 0,
      totalAmount: 5898820,
      flags: {
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
        autoCloseOnEnd: false,
      },
      allowedActions: ['pause', 'renew', 'close'],
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
      lines: [
        {
          id: 'line_104',
          productId: 'prod_erp',
          productName: 'Brightloop ERP Core',
          variantId: 'var_erp_std',
          variantName: 'Brand: Standard Cloud',
          qty: 10,
          unitPrice: 499900,
          taxId: 'tax_gst_18',
          taxRate: 1800,
          taxAmount: 899820,
          totalAmount: 5898820,
        },
      ],
    },
    {
      id: 'sub_1004',
      subscriptionNumber: 'SUB/2026/00104',
      customerId: 'cust_kerala',
      customerName: 'Kerala Tech Hub',
      customerEmail: 'billing@keralatech.io',
      planId: 'plan_monthly',
      planName: 'Enterprise Monthly Scale',
      status: 'QUOTATION',
      startDate: '2026-11-01',
      expiryDate: '2027-10-31',
      paymentTerms: 'Net 30',
      currency: 'INR',
      subtotal: 1500000,
      taxTotal: 270000,
      discountTotal: 0,
      totalAmount: 1770000,
      flags: {
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
        autoCloseOnEnd: false,
      },
      allowedActions: ['confirm', 'close'],
      createdAt: '2026-10-25T11:00:00Z',
      updatedAt: '2026-10-25T11:00:00Z',
      lines: [
        {
          id: 'line_105',
          productId: 'prod_consult',
          productName: 'Solution Architect Consulting',
          qty: 1,
          unitPrice: 1500000,
          taxId: 'tax_gst_18',
          taxRate: 1800,
          taxAmount: 270000,
          totalAmount: 1770000,
        },
      ],
    },
    {
      id: 'sub_1005',
      subscriptionNumber: 'SUB/2026/00105',
      customerId: 'cust_kerala',
      customerName: 'Kerala Tech Hub',
      customerEmail: 'billing@keralatech.io',
      planId: 'plan_daily',
      planName: 'Burst Compute Daily Tier',
      status: 'DRAFT',
      startDate: '2026-11-05',
      expiryDate: '2026-11-20',
      paymentTerms: 'Immediate',
      currency: 'INR',
      subtotal: 250000,
      taxTotal: 45000,
      discountTotal: 0,
      totalAmount: 295000,
      flags: {
        allowPause: true,
        allowRenew: true,
        allowEarlyClose: true,
        autoCloseOnEnd: true,
      },
      allowedActions: ['send_quotation', 'confirm'],
      createdAt: '2026-10-30T16:00:00Z',
      updatedAt: '2026-10-30T16:00:00Z',
      lines: [
        {
          id: 'line_106',
          productId: 'prod_storage',
          productName: 'Managed Cloud Backup 1TB',
          qty: 5,
          unitPrice: 50000,
          taxId: 'tax_gst_18',
          taxRate: 1800,
          taxAmount: 45000,
          totalAmount: 295000,
        },
      ],
    },
  ]

  const invoices: Invoice[] = [
    {
      id: 'inv_5001',
      invoiceNumber: 'INV/2026/00101',
      subscriptionId: 'sub_1001',
      subscriptionNumber: 'SUB/2026/00101',
      customerId: 'cust_acme',
      customerName: 'Acme Corp',
      customerEmail: 'sarah@acme.inc',
      customerAddress: 'Plot 42, Infopark Phase II, Kochi, Kerala',
      gstin: '32AAAAA0000A1Z5',
      status: 'PAID',
      issueDate: '2026-08-01',
      dueDate: '2026-08-31',
      isOverdue: false,
      subtotal: 3049300,
      taxAmount: 548874,
      discountAmount: 0,
      totalAmount: 3598174,
      amountPaid: 3598174,
      amountDue: 0,
      currency: 'INR',
      payments: [
        {
          id: 'pay_1',
          invoiceId: 'inv_5001',
          method: 'BANK_TRANSFER',
          amount: 3598174,
          date: '2026-08-15',
          note: 'RTGS Ref #AXIS991820',
          createdAt: '2026-08-15T11:00:00Z',
        },
      ],
      lines: [
        {
          id: 'iline_1',
          description: 'Brightloop ERP Core (Brand: Odoo Enterprise Connector) [x5]',
          qty: 5,
          unitPrice: 555900,
          taxRate: 1800,
          amount: 3279810,
        },
        {
          id: 'iline_2',
          description: 'Managed Cloud Backup 1TB (Storage: High-IOPS NVMe) [x2]',
          qty: 2,
          unitPrice: 134900,
          taxRate: 1800,
          amount: 318364,
        },
      ],
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-15T11:00:00Z',
    },
    {
      id: 'inv_5002',
      invoiceNumber: 'INV/2026/00142',
      subscriptionId: 'sub_1001',
      subscriptionNumber: 'SUB/2026/00101',
      customerId: 'cust_acme',
      customerName: 'Acme Corp',
      customerEmail: 'sarah@acme.inc',
      customerAddress: 'Plot 42, Infopark Phase II, Kochi, Kerala',
      gstin: '32AAAAA0000A1Z5',
      status: 'CONFIRMED',
      issueDate: '2026-09-01',
      dueDate: '2026-09-30',
      isOverdue: true, // Overdue by 31 days!
      subtotal: 3049300,
      taxAmount: 548874,
      discountAmount: 0,
      totalAmount: 3598174,
      amountPaid: 1000000,
      amountDue: 2598174,
      currency: 'INR',
      payments: [
        {
          id: 'pay_2',
          invoiceId: 'inv_5002',
          method: 'UPI',
          amount: 1000000,
          date: '2026-09-20',
          note: 'Partial payment UPI/acme@axis',
          createdAt: '2026-09-20T14:30:00Z',
        },
      ],
      lines: [
        {
          id: 'iline_3',
          description: 'Brightloop ERP Core (Brand: Odoo Enterprise Connector) [x5]',
          qty: 5,
          unitPrice: 555900,
          taxRate: 1800,
          amount: 3279810,
        },
        {
          id: 'iline_4',
          description: 'Managed Cloud Backup 1TB (Storage: High-IOPS NVMe) [x2]',
          qty: 2,
          unitPrice: 134900,
          taxRate: 1800,
          amount: 318364,
        },
      ],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-20T14:30:00Z',
    },
    {
      id: 'inv_5003',
      invoiceNumber: 'INV/2026/00198',
      subscriptionId: 'sub_1003',
      subscriptionNumber: 'SUB/2026/00103',
      customerId: 'cust_global',
      customerName: 'Global Logistics',
      customerEmail: 'finance@globallog.com',
      customerAddress: 'Harbor Road, Willingdon Island, Kochi',
      gstin: '32BBBBB1111B2Z6',
      status: 'CONFIRMED',
      issueDate: '2026-10-01',
      dueDate: '2026-10-16',
      isOverdue: true, // Overdue by 15 days
      subtotal: 4999000,
      taxAmount: 899820,
      discountAmount: 0,
      totalAmount: 5898820,
      amountPaid: 0,
      amountDue: 5898820,
      currency: 'INR',
      payments: [],
      lines: [
        {
          id: 'iline_5',
          description: 'Brightloop ERP Core (Standard Cloud) [x10]',
          qty: 10,
          unitPrice: 499900,
          taxRate: 1800,
          amount: 5898820,
        },
      ],
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'inv_5004',
      invoiceNumber: 'INV/2026/00220',
      subscriptionId: 'sub_1001',
      subscriptionNumber: 'SUB/2026/00101',
      customerId: 'cust_acme',
      customerName: 'Acme Corp',
      customerEmail: 'sarah@acme.inc',
      customerAddress: 'Plot 42, Infopark Phase II, Kochi, Kerala',
      gstin: '32AAAAA0000A1Z5',
      status: 'DRAFT',
      issueDate: '2026-10-31',
      dueDate: '2026-11-30',
      isOverdue: false,
      subtotal: 3049300,
      taxAmount: 548874,
      discountAmount: 0,
      totalAmount: 3598174,
      amountPaid: 0,
      amountDue: 3598174,
      currency: 'INR',
      payments: [],
      lines: [
        {
          id: 'iline_6',
          description: 'Brightloop ERP Core (Brand: Odoo Enterprise Connector) [x5]',
          qty: 5,
          unitPrice: 555900,
          taxRate: 1800,
          amount: 3279810,
        },
      ],
      createdAt: '2026-10-31T08:00:00Z',
      updatedAt: '2026-10-31T08:00:00Z',
    },
  ]

  const payments: Payment[] = [
    {
      id: 'pay_1',
      invoiceId: 'inv_5001',
      method: 'BANK_TRANSFER',
      amount: 3598174,
      date: '2026-08-15',
      note: 'RTGS Ref #AXIS991820',
      createdAt: '2026-08-15T11:00:00Z',
    },
    {
      id: 'pay_2',
      invoiceId: 'inv_5002',
      method: 'UPI',
      amount: 1000000,
      date: '2026-09-20',
      note: 'Partial payment UPI/acme@axis',
      createdAt: '2026-09-20T14:30:00Z',
    },
  ]

  return {
    users,
    customers,
    products,
    plans,
    quotationTemplates,
    subscriptions,
    invoices,
    payments,
    taxes,
    discounts,
    resetTokens: [
      {
        email: 'sarah@acme.inc',
        tokenCode: 'DEMO-RESET-9988',
        expiresAt: Date.now() + 3600 * 1000 * 24,
      },
    ],
  }
}

// Persistent In-memory repository with LocalStorage backup for session survival
const STORAGE_KEY = 'brightloop_mock_db_v1'

export function getMockDb(): MockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as MockDatabase
    }
  } catch {
    // fallback
  }
  const initial = createInitialDatabase()
  saveMockDb(initial)
  return initial
}

export function saveMockDb(db: MockDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // ignore
  }
}

export function resetMockDb(): MockDatabase {
  const fresh = createInitialDatabase()
  saveMockDb(fresh)
  return fresh
}

