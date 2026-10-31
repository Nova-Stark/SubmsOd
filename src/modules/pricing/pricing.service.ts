import {
  CalculatePricingRequest,
  CalculatePricingResponse,
  VariantAdjustment,
} from './pricing.types';
import { MoneyUtil } from '../../utils/money';

export class PricingService {
  /**
   * Calculates final unit price and total line amount.
   * 
   * Formula:
   * Final Unit Price = max(0, Base Price + Sum of Variant Adjustments)
   * Line Amount = Final Unit Price * Quantity
   */
  static calculate(request: CalculatePricingRequest): CalculatePricingResponse {
    const { basePrice, quantity, variantAdjustments } = request;

    if (quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }

    const totalAdjustment = variantAdjustments.reduce(
      (sum: number, v: VariantAdjustment) => sum + v.priceExtra,
      0
    );

    // Final unit price cannot drop below 0
    const finalUnitPrice = MoneyUtil.clampNonNegative(basePrice + totalAdjustment);
    const lineAmount = finalUnitPrice * quantity;

    return {
      basePrice,
      totalAdjustment,
      finalUnitPrice,
      quantity,
      lineAmount,
    };
  }
}
