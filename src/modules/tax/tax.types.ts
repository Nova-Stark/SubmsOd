import { z } from 'zod';

export const TaxTypeSchema = z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE');
export type TaxType = z.infer<typeof TaxTypeSchema>;

export const TaxRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tax rule name is required'),
  ratePercentage: z.number().min(0, 'Rate percentage cannot be negative').optional(),
  rate_percentage: z.number().min(0, 'Rate percentage cannot be negative').optional(),
  type: TaxTypeSchema.optional(),
  taxType: TaxTypeSchema.optional(),
  tax_type: TaxTypeSchema.optional(),
  fixedAmount: z.number().int().nonnegative().optional(),
  fixed_amount: z.number().int().nonnegative().optional(),
  isInclusive: z.boolean().optional(),
  is_inclusive: z.boolean().optional(),
  inclusive: z.boolean().optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
}).transform((data) => ({
  id: data.id,
  name: data.name,
  ratePercentage: data.ratePercentage ?? data.rate_percentage ?? 0,
  type: (data.type ?? data.taxType ?? data.tax_type ?? 'PERCENTAGE') as TaxType,
  fixedAmount: data.fixedAmount ?? data.fixed_amount ?? 0,
  isInclusive: Boolean(data.isInclusive ?? data.is_inclusive ?? data.inclusive ?? false),
  isActive: (data.isActive !== undefined ? data.isActive : data.is_active !== undefined ? data.is_active : true),
}));

export type TaxRule = z.infer<typeof TaxRuleSchema>;

export const CalculateTaxRequestSchema = z.object({
  taxableAmount: z.number().int().nonnegative().optional(),
  taxable_amount: z.number().int().nonnegative().optional(),
  taxRules: z.array(TaxRuleSchema).optional(),
  tax_rules: z.array(TaxRuleSchema).optional(),
}).refine(
  (data) => (data.taxableAmount !== undefined || data.taxable_amount !== undefined),
  { message: 'taxable_amount or taxableAmount is required' }
).transform((data) => ({
  taxableAmount: (data.taxableAmount ?? data.taxable_amount) as number,
  taxRules: data.taxRules ?? data.tax_rules ?? [],
}));

export type CalculateTaxRequest = z.infer<typeof CalculateTaxRequestSchema>;

export interface AppliedTaxItem {
  id?: string;
  name: string;
  type: TaxType;
  ratePercentage: number;
  fixedAmount: number;
  inclusive: boolean;
  amount: number;
}

export interface CalculateTaxResponse {
  taxableAmount: number;
  inclusiveTaxTotal: number;
  exclusiveTaxTotal: number;
  totalTax: number;
  netAmount: number;
  grossAmount: number;
  appliedTaxes: AppliedTaxItem[];
}
