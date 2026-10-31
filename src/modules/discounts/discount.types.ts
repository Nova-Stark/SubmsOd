import { z } from 'zod';

export const DiscountTypeSchema = z.enum(['FIXED', 'PERCENTAGE']);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

export const DiscountRuleSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1, 'Discount code is required'),
  type: DiscountTypeSchema,
  value: z.number().nonnegative('Discount value must be non-negative'),
  minQuantity: z.number().int().nonnegative().optional(),
  min_quantity: z.number().int().nonnegative().optional(),
  minPurchaseAmount: z.number().int().nonnegative().optional(),
  min_purchase_amount: z.number().int().nonnegative().optional(),
  startDate: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  maxUses: z.number().int().nonnegative().optional(),
  max_uses: z.number().int().nonnegative().optional(),
  currentUses: z.number().int().nonnegative().optional(),
  current_uses: z.number().int().nonnegative().optional(),
  productId: z.string().nullable().optional(),
  product_id: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
}).transform((data) => ({
  id: data.id,
  code: data.code.trim().toUpperCase(),
  type: data.type,
  value: data.value,
  minQuantity: data.minQuantity ?? data.min_quantity ?? 0,
  minPurchaseAmount: data.minPurchaseAmount ?? data.min_purchase_amount ?? 0,
  startDate: data.startDate ?? data.start_date ?? null,
  endDate: data.endDate ?? data.end_date ?? null,
  maxUses: data.maxUses ?? data.max_uses ?? 0,
  currentUses: data.currentUses ?? data.current_uses ?? 0,
  productId: data.productId ?? data.product_id ?? null,
  isActive: data.isActive !== undefined ? data.isActive : data.is_active !== undefined ? data.is_active : true,
}));

export type DiscountRule = z.infer<typeof DiscountRuleSchema>;

export const ValidateDiscountRequestSchema = z.object({
  code: z.string().min(1, 'Discount code is required'),
  totalQuantity: z.number().int().nonnegative().optional(),
  total_quantity: z.number().int().nonnegative().optional(),
  subtotalCents: z.number().int().nonnegative().optional(),
  subtotal_cents: z.number().int().nonnegative().optional(),
  productId: z.string().nullable().optional(),
  product_id: z.string().nullable().optional(),
  rule: DiscountRuleSchema.optional(),
  evaluationDate: z.string().optional(),
  evaluation_date: z.string().optional(),
}).transform((data) => ({
  code: data.code.trim().toUpperCase(),
  totalQuantity: data.totalQuantity ?? data.total_quantity ?? 1,
  subtotalCents: data.subtotalCents ?? data.subtotal_cents ?? 0,
  productId: data.productId ?? data.product_id ?? null,
  rule: data.rule,
  evaluationDate: data.evaluationDate ?? data.evaluation_date ?? new Date().toISOString(),
}));

export type ValidateDiscountRequest = z.infer<typeof ValidateDiscountRequestSchema>;

export interface ValidateDiscountResponse {
  valid: boolean;
  code: string;
  discountCents: number;
  type?: DiscountType;
  originalAmount: number;
  finalAmount: number;
  reason?: string;
}

export const CalculateDiscountRequestSchema = z.object({
  subtotalCents: z.number().int().nonnegative().optional(),
  subtotal_cents: z.number().int().nonnegative().optional(),
  totalQuantity: z.number().int().nonnegative().optional(),
  total_quantity: z.number().int().nonnegative().optional(),
  productId: z.string().nullable().optional(),
  product_id: z.string().nullable().optional(),
  rule: DiscountRuleSchema,
  evaluationDate: z.string().optional(),
  evaluation_date: z.string().optional(),
}).refine(
  (data) => (data.subtotalCents !== undefined || data.subtotal_cents !== undefined),
  { message: 'subtotal_cents or subtotalCents is required' }
).transform((data) => ({
  subtotalCents: (data.subtotalCents ?? data.subtotal_cents) as number,
  totalQuantity: data.totalQuantity ?? data.total_quantity ?? 1,
  productId: data.productId ?? data.product_id ?? null,
  rule: data.rule,
  evaluationDate: data.evaluationDate ?? data.evaluation_date ?? new Date().toISOString(),
}));

export type CalculateDiscountRequest = z.infer<typeof CalculateDiscountRequestSchema>;

export interface CalculateDiscountResponse {
  eligible: boolean;
  code: string;
  type: DiscountType;
  discountAmount: number;
  eligibleAmount: number;
  remainingAmount: number;
  reasons: string[];
}
