import { z } from 'zod';

export const VariantAdjustmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  variantName: z.string().optional(),
  variant_name: z.string().optional(),
  priceExtra: z.number().int().optional(),
  price_extra: z.number().int().optional(),
}).transform((data) => ({
  id: data.id,
  name: data.name || data.variantName || data.variant_name || 'Variant',
  priceExtra: data.priceExtra ?? data.price_extra ?? 0,
}));

export type VariantAdjustment = z.infer<typeof VariantAdjustmentSchema>;

export const CalculatePricingRequestSchema = z.object({
  basePrice: z.number().int().nonnegative().optional(),
  base_price: z.number().int().nonnegative().optional(),
  quantity: z.number().int().positive({ message: 'Quantity must be a positive integer' }),
  variantAdjustments: z.array(VariantAdjustmentSchema).optional(),
  variant_adjustments: z.array(VariantAdjustmentSchema).optional(),
  variants: z.array(VariantAdjustmentSchema).optional(),
}).refine(
  (data) => (data.basePrice !== undefined || data.base_price !== undefined),
  { message: 'base_price or basePrice is required and must be non-negative' }
).transform((data) => {
  const basePrice = (data.basePrice ?? data.base_price) as number;
  const adjustments = data.variantAdjustments ?? data.variant_adjustments ?? data.variants ?? [];
  return {
    basePrice,
    quantity: data.quantity,
    variantAdjustments: adjustments,
  };
});

export type CalculatePricingRequest = z.infer<typeof CalculatePricingRequestSchema>;

export interface CalculatePricingResponse {
  basePrice: number;
  totalAdjustment: number;
  finalUnitPrice: number;
  quantity: number;
  lineAmount: number;
}
