import {
  DiscountRule,
  ValidateDiscountRequest,
  ValidateDiscountResponse,
  CalculateDiscountRequest,
  CalculateDiscountResponse,
} from './discount.types';
import { MoneyUtil } from '../../utils/money';

export class DiscountService {
  /**
   * Validates discount eligibility against rules and constraints.
   */
  static validate(request: ValidateDiscountRequest, rule?: DiscountRule): ValidateDiscountResponse {
    const activeRule = rule ?? request.rule;
    const subtotal = request.subtotalCents;
    const quantity = request.totalQuantity;
    const evalTime = new Date(request.evaluationDate).getTime();

    if (!activeRule) {
      return {
        valid: false,
        code: request.code,
        discountCents: 0,
        originalAmount: subtotal,
        finalAmount: subtotal,
        reason: 'Discount rule not found',
      };
    }

    if (!activeRule.isActive) {
      return {
        valid: false,
        code: activeRule.code,
        discountCents: 0,
        originalAmount: subtotal,
        finalAmount: subtotal,
        reason: 'Discount is inactive',
      };
    }

    if (activeRule.startDate) {
      const startTime = new Date(activeRule.startDate).getTime();
      if (evalTime < startTime) {
        return {
          valid: false,
          code: activeRule.code,
          discountCents: 0,
          originalAmount: subtotal,
          finalAmount: subtotal,
          reason: 'Discount has not started yet',
        };
      }
    }

    if (activeRule.endDate) {
      const endTime = new Date(activeRule.endDate).getTime();
      if (evalTime > endTime) {
        return {
          valid: false,
          code: activeRule.code,
          discountCents: 0,
          originalAmount: subtotal,
          finalAmount: subtotal,
          reason: 'Discount has expired',
        };
      }
    }

    if (activeRule.maxUses > 0 && activeRule.currentUses >= activeRule.maxUses) {
      return {
        valid: false,
        code: activeRule.code,
        discountCents: 0,
        originalAmount: subtotal,
        finalAmount: subtotal,
        reason: 'Discount usage limit reached',
      };
    }

    if (activeRule.minQuantity > 0 && quantity < activeRule.minQuantity) {
      return {
        valid: false,
        code: activeRule.code,
        discountCents: 0,
        originalAmount: subtotal,
        finalAmount: subtotal,
        reason: `Minimum quantity threshold of ${activeRule.minQuantity} not met`,
      };
    }

    if (activeRule.minPurchaseAmount > 0 && subtotal < activeRule.minPurchaseAmount) {
      return {
        valid: false,
        code: activeRule.code,
        discountCents: 0,
        originalAmount: subtotal,
        finalAmount: subtotal,
        reason: `Minimum purchase amount of ${activeRule.minPurchaseAmount} cents not met`,
      };
    }

    if (activeRule.productId && request.productId && activeRule.productId !== request.productId) {
      return {
        valid: false,
        code: activeRule.code,
        discountCents: 0,
        originalAmount: subtotal,
        finalAmount: subtotal,
        reason: `Discount is product-specific and does not apply to product ${request.productId}`,
      };
    }

    // Calculate discount amount
    let rawDiscount = 0;
    if (activeRule.type === 'FIXED') {
      rawDiscount = MoneyUtil.round(activeRule.value);
    } else if (activeRule.type === 'PERCENTAGE') {
      rawDiscount = MoneyUtil.calculatePercentage(subtotal, activeRule.value);
    }

    // A discount must never exceed the eligible amount
    const discountCents = Math.min(rawDiscount, subtotal);
    const finalAmount = subtotal - discountCents;

    return {
      valid: true,
      code: activeRule.code,
      type: activeRule.type,
      discountCents,
      originalAmount: subtotal,
      finalAmount,
    };
  }

  /**
   * Calculates discount amounts with full audit breakdown.
   */
  static calculate(request: CalculateDiscountRequest): CalculateDiscountResponse {
    const { rule, subtotalCents, totalQuantity, productId, evaluationDate } = request;

    const validation = this.validate(
      {
        code: rule.code,
        subtotalCents,
        totalQuantity,
        productId,
        evaluationDate,
        rule,
      },
      rule
    );

    if (!validation.valid) {
      return {
        eligible: false,
        code: rule.code,
        type: rule.type,
        discountAmount: 0,
        eligibleAmount: subtotalCents,
        remainingAmount: subtotalCents,
        reasons: [validation.reason || 'Not eligible for discount'],
      };
    }

    return {
      eligible: true,
      code: rule.code,
      type: rule.type,
      discountAmount: validation.discountCents,
      eligibleAmount: subtotalCents,
      remainingAmount: validation.finalAmount,
      reasons: [],
    };
  }
}
