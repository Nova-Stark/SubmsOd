import { z } from 'zod';
import { VariantAdjustmentSchema } from '../pricing/pricing.types';
import { TaxRuleSchema, TaxRule } from '../tax/tax.types';
import { DiscountRuleSchema, DiscountRule } from '../discounts/discount.types';

export const InvoiceCustomerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Valid customer email is required'),
  address: z.string().optional(),
  billingAddress: z.string().optional(),
  billing_address: z.string().optional(),
  taxId: z.string().optional(),
  tax_id: z.string().optional(),
  phone: z.string().optional(),
}).transform((data) => ({
  id: data.id,
  name: data.name,
  email: data.email,
  address: data.address ?? data.billingAddress ?? data.billing_address,
  taxId: data.taxId ?? data.tax_id,
  phone: data.phone,
}));

export type InvoiceCustomer = z.infer<typeof InvoiceCustomerSchema>;

export const InvoiceLineInputSchema = z.object({
  productId: z.string().optional(),
  product_id: z.string().optional(),
  productName: z.string().optional(),
  product_name: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().int().nonnegative().optional(),
  base_price: z.number().int().nonnegative().optional(),
  quantity: z.number().int().positive().default(1),
  variants: z.array(VariantAdjustmentSchema).optional(),
  variantAdjustments: z.array(VariantAdjustmentSchema).optional(),
  variant_adjustments: z.array(VariantAdjustmentSchema).optional(),
  taxRules: z.array(TaxRuleSchema).optional(),
  tax_rules: z.array(TaxRuleSchema).optional(),
}).refine(
  (data) => (data.basePrice !== undefined || data.base_price !== undefined),
  { message: 'base_price or basePrice is required for line items' }
).transform((data) => ({
  productId: data.productId ?? data.product_id ?? 'item',
  productName: data.productName ?? data.product_name ?? data.description ?? 'Product',
  basePrice: (data.basePrice ?? data.base_price) as number,
  quantity: data.quantity,
  variants: data.variants ?? data.variantAdjustments ?? data.variant_adjustments ?? [],
  taxRules: data.taxRules ?? data.tax_rules ?? [],
}));

export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

export const CalculateInvoiceRequestSchema = z.object({
  customer: InvoiceCustomerSchema.optional(),
  lines: z.array(InvoiceLineInputSchema).min(1, 'At least one line item is required'),
  discounts: z.array(DiscountRuleSchema).optional(),
  discount_rules: z.array(DiscountRuleSchema).optional(),
  globalTaxRules: z.array(TaxRuleSchema).optional(),
  tax_rules: z.array(TaxRuleSchema).optional(),
  currency: z.string().default('INR'),
}).transform((data) => ({
  customer: data.customer,
  lines: data.lines,
  discounts: data.discounts ?? data.discount_rules ?? [],
  globalTaxRules: data.globalTaxRules ?? data.tax_rules ?? [],
  currency: data.currency,
}));

export type CalculateInvoiceRequest = z.infer<typeof CalculateInvoiceRequestSchema>;

export interface CalculatedInvoiceLine {
  productId: string;
  productName: string;
  basePrice: number;
  variantExtra: number;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  lineDiscount: number;
  taxableAmount: number;
  lineTax: number;
  lineTotal: number;
}

export interface InvoiceTaxSummary {
  name: string;
  ratePercentage: number;
  inclusive: boolean;
  amount: number;
}

export interface InvoiceDiscountSummary {
  code: string;
  type: string;
  amount: number;
}

export interface CalculateInvoiceResponse {
  lines: CalculatedInvoiceLine[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  finalTotal: number;
  currency: string;
  appliedDiscounts: InvoiceDiscountSummary[];
  appliedTaxes: InvoiceTaxSummary[];
}

export const GenerateInvoicePdfRequestSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').optional(),
  invoice_number: z.string().min(1, 'Invoice number is required').optional(),
  issueDate: z.string().optional(),
  issue_date: z.string().optional(),
  dueDate: z.string().optional(),
  due_date: z.string().optional(),
  customer: InvoiceCustomerSchema,
  lines: z.array(z.object({
    productId: z.string().optional(),
    product_id: z.string().optional(),
    productName: z.string().min(1).optional(),
    product_name: z.string().optional(),
    unitPrice: z.number().int().nonnegative().optional(),
    unit_price: z.number().int().nonnegative().optional(),
    quantity: z.number().int().positive(),
    lineAmount: z.number().int().nonnegative().optional(),
    line_amount: z.number().int().nonnegative().optional(),
  })).min(1),
  subtotal: z.number().int().nonnegative(),
  discountTotal: z.number().int().nonnegative().optional(),
  discount_total: z.number().int().nonnegative().optional(),
  taxTotal: z.number().int().nonnegative().optional(),
  tax_total: z.number().int().nonnegative().optional(),
  finalTotal: z.number().int().nonnegative().optional(),
  final_total: z.number().int().nonnegative().optional(),
  currency: z.string().default('INR'),
  notes: z.string().optional(),
}).refine(
  (data) => Boolean(data.invoiceNumber || data.invoice_number),
  { message: 'invoice_number or invoiceNumber is required', path: ['invoice_number'] }
).refine(
  (data) => data.lines.every((line) => Boolean(line.productName || line.product_name)),
  { message: 'product_name or productName is required for each line', path: ['lines'] }
).transform((data) => ({
  invoiceNumber: data.invoiceNumber || (data.invoice_number as string),
  issueDate: data.issueDate ?? data.issue_date ?? new Date().toISOString().split('T')[0],
  dueDate: data.dueDate ?? data.due_date ?? new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  customer: data.customer,
  lines: data.lines.map((l) => ({
    productName: l.productName || (l.product_name as string) || 'Product',
    unitPrice: l.unitPrice ?? l.unit_price ?? 0,
    quantity: l.quantity,
    lineAmount: l.lineAmount ?? l.line_amount ?? ((l.unitPrice ?? l.unit_price ?? 0) * l.quantity),
  })),
  subtotal: data.subtotal,
  discountTotal: data.discountTotal ?? data.discount_total ?? 0,
  taxTotal: data.taxTotal ?? data.tax_total ?? 0,
  finalTotal: data.finalTotal ?? data.final_total ?? (data.subtotal - (data.discountTotal ?? data.discount_total ?? 0) + (data.taxTotal ?? data.tax_total ?? 0)),
  currency: data.currency,
  notes: data.notes,
}));

export type GenerateInvoicePdfRequest = z.infer<typeof GenerateInvoicePdfRequestSchema>;
