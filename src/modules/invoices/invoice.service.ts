import {
  CalculateInvoiceRequest,
  CalculateInvoiceResponse,
  CalculatedInvoiceLine,
  InvoiceTaxSummary,
  InvoiceDiscountSummary,
  InvoiceLineInput,
} from './invoice.types';
import { PricingService } from '../pricing/pricing.service';
import { TaxService } from '../tax/tax.service';
import { DiscountService } from '../discounts/discount.service';
import { MoneyUtil } from '../../utils/money';
import { DiscountRule } from '../discounts/discount.types';
import { TaxRule } from '../tax/tax.types';

export class InvoiceService {
  /**
   * Calculates a complete invoice:
   * 1. Compute line subtotals (base + variants) × quantity.
   * 2. Apply eligible discounts (subscription-wide first, then product-specific).
   * 3. Calculate taxes on post-discount amounts.
   * 4. Aggregate totals.
   *
   * All monetary values are integer minor units (paise/cents).
   * Final total is clamped to >= 0.
   */
  static calculate(request: CalculateInvoiceRequest): CalculateInvoiceResponse {
    const { lines, discounts, globalTaxRules, currency } = request;
    const now = new Date().toISOString();

    // Phase 1: Calculate line subtotals
    const calculatedLines: CalculatedInvoiceLine[] = lines.map((line: InvoiceLineInput) => {
      const pricing = PricingService.calculate({
        basePrice: line.basePrice,
        quantity: line.quantity,
        variantAdjustments: line.variants,
      });

      return {
        productId: line.productId,
        productName: line.productName,
        basePrice: line.basePrice,
        variantExtra: pricing.totalAdjustment,
        unitPrice: pricing.finalUnitPrice,
        quantity: line.quantity,
        lineSubtotal: pricing.lineAmount,
        lineDiscount: 0,
        taxableAmount: pricing.lineAmount,
        lineTax: 0,
        lineTotal: pricing.lineAmount,
      };
    });

    const subtotal = calculatedLines.reduce((sum, l) => sum + l.lineSubtotal, 0);

    // Phase 2: Apply discounts
    const appliedDiscounts: InvoiceDiscountSummary[] = [];
    let discountTotal = 0;
    let remainingSubtotal = subtotal;

    // Separate subscription-wide and product-specific discounts
    const subscriptionDiscounts = discounts.filter((d: DiscountRule) => !d.productId);
    const productDiscounts = discounts.filter((d: DiscountRule) => !!d.productId);

    // Apply subscription-wide discounts to the entire subtotal
    for (const rule of subscriptionDiscounts) {
      if (remainingSubtotal <= 0) break;

      const result = DiscountService.calculate({
        subtotalCents: remainingSubtotal,
        totalQuantity: calculatedLines.reduce((sum, l) => sum + l.quantity, 0),
        productId: null,
        rule,
        evaluationDate: now,
      });

      if (result.eligible && result.discountAmount > 0) {
        appliedDiscounts.push({
          code: result.code,
          type: result.type,
          amount: result.discountAmount,
        });
        discountTotal += result.discountAmount;
        remainingSubtotal -= result.discountAmount;

        // Distribute subscription discount proportionally across lines
        let distributed = 0;
        for (let i = 0; i < calculatedLines.length; i++) {
          const line = calculatedLines[i];
          if (i === calculatedLines.length - 1) {
            // Last line gets remainder to avoid rounding drift
            const share = result.discountAmount - distributed;
            line.lineDiscount += share;
          } else {
            const share = subtotal > 0
              ? MoneyUtil.round((result.discountAmount * line.lineSubtotal) / subtotal)
              : 0;
            line.lineDiscount += share;
            distributed += share;
          }
        }
      }
    }

    // Apply product-specific discounts to matching lines
    for (const rule of productDiscounts) {
      for (const line of calculatedLines) {
        if (line.productId !== rule.productId) continue;

        const lineRemaining = line.lineSubtotal - line.lineDiscount;
        if (lineRemaining <= 0) continue;

        const result = DiscountService.calculate({
          subtotalCents: lineRemaining,
          totalQuantity: line.quantity,
          productId: line.productId,
          rule,
          evaluationDate: now,
        });

        if (result.eligible && result.discountAmount > 0) {
          appliedDiscounts.push({
            code: result.code,
            type: result.type,
            amount: result.discountAmount,
          });
          line.lineDiscount += result.discountAmount;
          discountTotal += result.discountAmount;
          remainingSubtotal -= result.discountAmount;
        }
      }
    }

    // Phase 3: Calculate taxes on each line's post-discount amount
    const appliedTaxes: InvoiceTaxSummary[] = [];
    const taxMap = new Map<string, InvoiceTaxSummary>();
    let taxTotal = 0;

    for (const line of calculatedLines) {
      line.taxableAmount = MoneyUtil.clampNonNegative(line.lineSubtotal - line.lineDiscount);

      // Merge line-level and global tax rules
      const lineTaxRules: TaxRule[] = [
        ...globalTaxRules,
      ];

      if (lineTaxRules.length === 0 || line.taxableAmount === 0) {
        line.lineTax = 0;
        line.lineTotal = line.taxableAmount;
        continue;
      }

      const taxResult = TaxService.calculate({
        taxableAmount: line.taxableAmount,
        taxRules: lineTaxRules,
      });

      line.lineTax = taxResult.exclusiveTaxTotal;
      line.lineTotal = line.taxableAmount + taxResult.exclusiveTaxTotal;
      taxTotal += taxResult.exclusiveTaxTotal;

      // Aggregate tax summaries
      for (const applied of taxResult.appliedTaxes) {
        const key = `${applied.name}-${applied.ratePercentage}-${applied.inclusive}`;
        const existing = taxMap.get(key);
        if (existing) {
          existing.amount += applied.amount;
        } else {
          taxMap.set(key, {
            name: applied.name,
            ratePercentage: applied.ratePercentage,
            inclusive: applied.inclusive,
            amount: applied.amount,
          });
        }
      }
    }

    for (const summary of taxMap.values()) {
      appliedTaxes.push(summary);
    }

    // Phase 4: Calculate final total (never negative)
    const finalTotal = MoneyUtil.clampNonNegative(subtotal - discountTotal + taxTotal);

    return {
      lines: calculatedLines,
      subtotal,
      discountTotal,
      taxTotal,
      finalTotal,
      currency,
      appliedDiscounts,
      appliedTaxes,
    };
  }
}
