import * as fs from 'fs';
import * as path from 'path';
import {
  SeedDataset,
  SeedProduct,
  SeedPlan,
  SeedTaxRule,
  SeedDiscountRule,
  SeedCustomer,
  SeedSubscription,
  SeedInvoice,
  SeedInvoicePayment,
} from './seed-data';
import { PricingService } from '../modules/pricing/pricing.service';
import { TaxService } from '../modules/tax/tax.service';
import { DiscountService } from '../modules/discounts/discount.service';
import { MoneyUtil } from '../utils/money';

export function generateSeedDataset(): SeedDataset {
  // 1. Products and Variants
  const products: SeedProduct[] = [
    {
      id: 'prod-crm-001',
      name: 'Brightloop CRM Core',
      type: 'SOFTWARE',
      salesPrice: 15000, // ₹150.00
      costPrice: 5000,
      notes: 'Customer Relationship Management core license',
      variants: [
        { id: 'var-crm-apac', name: 'Region: APAC Cloud', priceExtra: 2000 },
        { id: 'var-crm-us', name: 'Region: US East', priceExtra: 3500 },
        { id: 'var-crm-self', name: 'Deployment: Self-Hosted', priceExtra: -2000 },
      ],
    },
    {
      id: 'prod-erp-002',
      name: 'Brightloop ERP Enterprise',
      type: 'SOFTWARE',
      salesPrice: 50000, // ₹500.00
      costPrice: 18000,
      notes: 'Enterprise Resource Planning full suite',
      variants: [
        { id: 'var-erp-odoo', name: 'Brand: Odoo Connector', priceExtra: 56000 },
        { id: 'var-erp-sap', name: 'Brand: SAP Bridge', priceExtra: 85000 },
      ],
    },
    {
      id: 'prod-addon-ai-003',
      name: 'Brightloop AI Copilot Add-on',
      type: 'ADDON',
      salesPrice: 12000, // ₹120.00
      costPrice: 4000,
      notes: 'Automated workflow intelligence and summarization',
      variants: [
        { id: 'var-ai-unlimited', name: 'Tier: Unlimited Tokens', priceExtra: 15000 },
      ],
    },
    {
      id: 'prod-svc-support-004',
      name: '24/7 Dedicated Support SLA',
      type: 'SERVICE',
      salesPrice: 25000, // ₹250.00
      costPrice: 10000,
      notes: 'Guaranteed 15-minute response SLA with dedicated TAM',
      variants: [
        { id: 'var-sup-tam', name: 'Senior Staff Engineer TAM', priceExtra: 10000 },
      ],
    },
  ];

  // 2. Billing Plans
  const plans: SeedPlan[] = [
    {
      id: 'plan-monthly-std',
      name: 'Standard Monthly',
      billingPeriod: 'MONTHLY',
      minQuantity: 1,
      autoClose: true,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
    },
    {
      id: 'plan-yearly-std',
      name: 'Standard Yearly (2 Months Free)',
      billingPeriod: 'YEARLY',
      minQuantity: 1,
      autoClose: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
    },
    {
      id: 'plan-monthly-ent',
      name: 'Enterprise High-Volume Monthly',
      billingPeriod: 'MONTHLY',
      minQuantity: 10,
      autoClose: false,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
    },
  ];

  // 3. Tax Configurations
  const taxes: SeedTaxRule[] = [
    {
      id: 'tax-gst-18',
      name: 'Standard GST (18%)',
      ratePercentage: 18.0,
      fixedAmount: 0,
      type: 'PERCENTAGE',
      isInclusive: false,
      isActive: true,
    },
    {
      id: 'tax-reduced-5',
      name: 'Reduced Concessional GST (5%)',
      ratePercentage: 5.0,
      fixedAmount: 0,
      type: 'PERCENTAGE',
      isInclusive: false,
      isActive: true,
    },
    {
      id: 'tax-inclusive-18',
      name: 'All-Inclusive VAT (18%)',
      ratePercentage: 18.0,
      fixedAmount: 0,
      type: 'PERCENTAGE',
      isInclusive: true,
      isActive: true,
    },
    {
      id: 'tax-green-cess',
      name: 'Fixed Environmental Cess (₹2.50)',
      ratePercentage: 0,
      fixedAmount: 250,
      type: 'FIXED',
      isInclusive: false,
      isActive: true,
    },
    {
      id: 'tax-legacy-vat',
      name: 'Legacy VAT 12.5% (Archived)',
      ratePercentage: 12.5,
      fixedAmount: 0,
      type: 'PERCENTAGE',
      isInclusive: false,
      isActive: false, // Inactive
    },
  ];

  // 4. Discounts (Active, Expired, Exhausted, Product-Specific)
  const discounts: SeedDiscountRule[] = [
    {
      id: 'disc-vip20',
      code: 'VIP20',
      type: 'PERCENTAGE',
      value: 20.0,
      minQuantity: 1,
      minPurchaseAmount: 10000,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      maxUses: 1000,
      currentUses: 45,
      productId: null,
      isActive: true,
    },
    {
      id: 'disc-save500',
      code: 'SAVE500',
      type: 'FIXED',
      value: 50000, // ₹500.00
      minQuantity: 1,
      minPurchaseAmount: 100000, // ₹1,000.00
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      maxUses: 500,
      currentUses: 12,
      productId: null,
      isActive: true,
    },
    {
      id: 'disc-expired',
      code: 'SUMMER2025',
      type: 'PERCENTAGE',
      value: 25.0,
      minQuantity: 0,
      minPurchaseAmount: 0,
      startDate: '2025-06-01T00:00:00Z',
      endDate: '2025-08-31T23:59:59Z',
      maxUses: 100,
      currentUses: 30,
      productId: null,
      isActive: true, // Expired by date
    },
    {
      id: 'disc-future',
      code: 'BLACKFRIDAY2026',
      type: 'PERCENTAGE',
      value: 40.0,
      minQuantity: 0,
      minPurchaseAmount: 0,
      startDate: '2026-11-20T00:00:00Z',
      endDate: '2026-11-30T23:59:59Z',
      maxUses: 200,
      currentUses: 0,
      productId: null,
      isActive: true, // Not yet started
    },
    {
      id: 'disc-exhausted',
      code: 'FIRST10',
      type: 'FIXED',
      value: 10000,
      minQuantity: 0,
      minPurchaseAmount: 0,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      maxUses: 10,
      currentUses: 10, // Max reached
      productId: null,
      isActive: true,
    },
    {
      id: 'disc-prod-odoo',
      code: 'ODDEV10',
      type: 'PERCENTAGE',
      value: 10.0,
      minQuantity: 1,
      minPurchaseAmount: 0,
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:59:59Z',
      maxUses: 0,
      currentUses: 5,
      productId: 'prod-erp-002', // Specific product
      isActive: true,
    },
  ];

  // 5. Generate 115 Customers
  const customers: SeedCustomer[] = [];
  for (let i = 1; i <= 115; i++) {
    const pad = String(i).padStart(3, '0');
    customers.push({
      id: `cust-uuid-${pad}`,
      email: `customer${i}@brightloop-client.com`,
      name: `Client Corporation ${i}`,
      role: 'CUSTOMER',
      companyName: `Apex Technologies Ltd ${i}`,
      address: `${100 + i} Innovation Way, Tech Park, Bangalore 560100`,
    });
  }

  // 6. Generate 110 Subscriptions (102 Active, 4 Quotations, 2 Paused, 2 Closed)
  const subscriptions: SeedSubscription[] = [];
  const baseDate = new Date('2026-01-15T00:00:00Z');

  for (let i = 1; i <= 110; i++) {
    const pad = String(i).padStart(3, '0');
    const customer = customers[i - 1];

    let status: 'ACTIVE' | 'DRAFT' | 'QUOTATION' | 'PAUSED' | 'CLOSED' = 'ACTIVE';
    if (i > 102 && i <= 106) status = 'QUOTATION';
    else if (i > 106 && i <= 108) status = 'PAUSED';
    else if (i > 108) status = 'CLOSED';

    const planIndex = (i - 1) % plans.length;
    const plan = plans[planIndex];

    const prodIndex = (i - 1) % products.length;
    const prod = products[prodIndex];
    const variant = prod.variants.length > 0 ? prod.variants[(i - 1) % prod.variants.length] : null;

    const quantity = Math.max(1 + ((i - 1) % 5), plan.minQuantity);
    const pricing = PricingService.calculate({
      basePrice: prod.salesPrice,
      quantity,
      variantAdjustments: variant ? [{ id: variant.id, name: variant.name, priceExtra: variant.priceExtra }] : [],
    });

    const subDate = new Date(baseDate.getTime() + i * 86400000 * 2);
    const nextBill = new Date(subDate);
    if (plan.billingPeriod === 'YEARLY') nextBill.setUTCFullYear(nextBill.getUTCFullYear() + 1);
    else nextBill.setUTCMonth(nextBill.getUTCMonth() + 1);

    const appliedDisc = i % 5 === 0 ? discounts[0].id : null;

    subscriptions.push({
      id: `sub-uuid-${pad}`,
      subscriptionNumber: `SUB-2026-${pad}`,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate: subDate.toISOString(),
      nextBillingDate: nextBill.toISOString(),
      paymentTerms: 'NET30',
      appliedDiscountId: appliedDisc,
      lines: [
        {
          id: `subline-${pad}-1`,
          productId: prod.id,
          variantId: variant ? variant.id : null,
          quantity: pricing.quantity,
          unitPrice: pricing.finalUnitPrice,
          taxRate: 18.0,
          subtotal: pricing.lineAmount,
        },
      ],
    });
  }

  // 7. Generate Invoices
  // - 40 Previously PAID invoices
  // - 35 OVERDUE invoices (spread across: 1-30 days, 31-60 days, 60+ days)
  // - 30 Current / CONFIRMED / DRAFT invoices
  const invoices: SeedInvoice[] = [];
  const now = new Date('2026-10-31T12:00:00Z');

  // A. 40 Paid Invoices (Fully settled)
  for (let i = 1; i <= 40; i++) {
    const pad = String(i).padStart(3, '0');
    const sub = subscriptions[i - 1];
    const line = sub.lines[0];

    const subtotal = line.subtotal;
    const discountAmount = i % 3 === 0 ? MoneyUtil.calculatePercentage(subtotal, 10) : 0;
    const taxable = subtotal - discountAmount;
    const taxAmount = MoneyUtil.calculatePercentage(taxable, 18);
    const totalAmount = taxable + taxAmount;

    const issueDate = new Date(now.getTime() - (90 - i) * 86400000);
    const dueDate = new Date(issueDate.getTime() + 30 * 86400000);
    const paymentDate = new Date(dueDate.getTime() - 5 * 86400000);

    invoices.push({
      id: `inv-paid-${pad}`,
      invoiceNumber: `INV-2026-PAID-${pad}`,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      status: 'PAID',
      billingPeriodStart: issueDate.toISOString(),
      billingPeriodEnd: dueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      amountPaid: totalAmount, // Paid in full
      lines: [
        {
          id: `invline-paid-${pad}-1`,
          productName: products.find((p) => p.id === line.productId)?.name || 'Product',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: 18.0,
          lineTotal: subtotal,
        },
      ],
      payments: [
        {
          id: `pay-uuid-${pad}`,
          paymentMethod: i % 2 === 0 ? 'BANK_TRANSFER' : 'CREDIT_CARD',
          amount: totalAmount,
          paymentDate: paymentDate.toISOString(),
          notes: 'Full payment received and settled automatically.',
        },
      ],
    });
  }

  // B. 35 Overdue Invoices across Aging Buckets:
  // - i=1..15: 1 to 30 days overdue (due 10-25 days ago)
  // - i=16..25: 31 to 60 days overdue (due 35-55 days ago)
  // - i=26..35: 60+ days overdue (due 65-90 days ago)
  for (let i = 1; i <= 35; i++) {
    const pad = String(i).padStart(3, '0');
    const sub = subscriptions[40 + i - 1];
    const line = sub.lines[0];

    const subtotal = line.subtotal;
    const discountAmount = 0;
    const taxAmount = MoneyUtil.calculatePercentage(subtotal, 18);
    const totalAmount = subtotal + taxAmount;

    let overdueDays = 15;
    if (i <= 15) overdueDays = 5 + i; // 1-30 days overdue
    else if (i <= 25) overdueDays = 30 + (i - 15) * 2; // 31-60 days overdue
    else overdueDays = 60 + (i - 25) * 3; // 60+ days overdue

    const dueDate = new Date(now.getTime() - overdueDays * 86400000);
    const issueDate = new Date(dueDate.getTime() - 30 * 86400000);

    invoices.push({
      id: `inv-overdue-${pad}`,
      invoiceNumber: `INV-2026-OVERDUE-${pad}`,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      status: 'CONFIRMED', // Confirmed but unpaid past due date = Overdue
      billingPeriodStart: issueDate.toISOString(),
      billingPeriodEnd: dueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      amountPaid: 0, // Unpaid
      lines: [
        {
          id: `invline-overdue-${pad}-1`,
          productName: products.find((p) => p.id === line.productId)?.name || 'Product',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: 18.0,
          lineTotal: subtotal,
        },
      ],
      payments: [],
    });
  }

  // C. 30 Current / DRAFT / CONFIRMED Invoices (not yet due)
  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(3, '0');
    const sub = subscriptions[75 + i - 1];
    const line = sub.lines[0];

    const subtotal = line.subtotal;
    const discountAmount = i % 4 === 0 ? 5000 : 0;
    const taxAmount = MoneyUtil.calculatePercentage(subtotal - discountAmount, 18);
    const totalAmount = subtotal - discountAmount + taxAmount;

    const issueDate = new Date(now.getTime() - (i % 10) * 86400000);
    const dueDate = new Date(issueDate.getTime() + 30 * 86400000); // In future

    invoices.push({
      id: `inv-current-${pad}`,
      invoiceNumber: `INV-2026-CURR-${pad}`,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      status: i % 3 === 0 ? 'DRAFT' : 'CONFIRMED',
      billingPeriodStart: issueDate.toISOString(),
      billingPeriodEnd: dueDate.toISOString(),
      dueDate: dueDate.toISOString(),
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      amountPaid: 0,
      lines: [
        {
          id: `invline-curr-${pad}-1`,
          productName: products.find((p) => p.id === line.productId)?.name || 'Product',
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: 18.0,
          lineTotal: subtotal,
        },
      ],
      payments: [],
    });
  }

  return {
    products,
    plans,
    taxes,
    discounts,
    customers,
    subscriptions,
    invoices,
  };
}

export function writeSeedDatasetToFile(filePath?: string): string {
  const dataset = generateSeedDataset();
  const targetPath = filePath || path.resolve(__dirname, '../../fixtures/seed-data.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  // Emit Go model JSON field names and only fields represented by the GORM
  // models. Go remains responsible for hashing passwords and inserting rows.
  const payload = {
    products: dataset.products.map((p) => ({
      id: p.id, name: p.name, type: p.type, sales_price: p.salesPrice,
      cost_price: p.costPrice, notes: p.notes,
      variants: p.variants.map((v) => ({ id: v.id, variant_name: v.name, price_extra: v.priceExtra })),
    })),
    plans: dataset.plans.map((p) => ({
      id: p.id, name: p.name, billing_period: p.billingPeriod,
      min_quantity: p.minQuantity, auto_close: p.autoClose, allow_pause: p.allowPause,
      allow_early_close: p.allowEarlyClose, allow_renewal: p.allowRenewal,
    })),
    taxes: dataset.taxes.filter((t) => t.type === 'PERCENTAGE').map((t) => ({
      id: t.id, name: t.name, rate_percentage: t.ratePercentage, is_active: t.isActive,
    })),
    discounts: dataset.discounts.map((d) => ({
      id: d.id, code: d.code, type: d.type, value: d.value, min_quantity: d.minQuantity,
      min_purchase_amount: d.minPurchaseAmount, start_date: d.startDate, end_date: d.endDate,
      max_uses: d.maxUses, current_uses: d.currentUses, product_id: d.productId, is_active: d.isActive,
    })),
    // These map to Go User rows. The Go seeder must hash its fixture password.
    customers: dataset.customers.map((c) => ({ id: c.id, email: c.email, role: c.role, is_verified: true, is_active: true })),
    subscriptions: dataset.subscriptions.map((s) => ({
      id: s.id, subscription_number: s.subscriptionNumber, customer_id: s.customerId,
      plan_id: s.planId, status: s.status, start_date: s.startDate,
      next_billing_date: s.nextBillingDate, payment_terms: s.paymentTerms,
      applied_discount_id: s.appliedDiscountId,
      lines: s.lines.map((l) => ({ id: l.id, product_id: l.productId, variant_id: l.variantId,
        quantity: l.quantity, unit_price: l.unitPrice, tax_rate: l.taxRate, subtotal: l.subtotal })),
    })),
    invoices: dataset.invoices.map((i) => ({
      id: i.id, invoice_number: i.invoiceNumber, subscription_id: i.subscriptionId,
      customer_id: i.customerId, status: i.status, billing_period_start: i.billingPeriodStart,
      billing_period_end: i.billingPeriodEnd, due_date: i.dueDate, subtotal: i.subtotal,
      discount_amount: i.discountAmount, tax_amount: i.taxAmount, total_amount: i.totalAmount,
      amount_paid: i.amountPaid,
      lines: i.lines.map((l) => ({ id: l.id, product_name: l.productName,
        variant_name: l.variantName || '', quantity: l.quantity, unit_price: l.unitPrice,
        tax_rate: l.taxRate, line_total: l.lineTotal })),
      payments: i.payments.map((p) => ({ id: p.id, payment_method: p.paymentMethod,
        amount: p.amount, payment_date: p.paymentDate, notes: p.notes })),
    })),
  };
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
  return targetPath;
}

if (require.main === module) {
  const out = writeSeedDatasetToFile();
  console.log(`Successfully generated seed dataset at: ${out}`);
}
