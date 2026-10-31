import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { DiscountService } from '../src/modules/discounts/discount.service';
import { DiscountRule } from '../src/modules/discounts/discount.types';

describe('Discount Engine (Unit & Integration)', () => {
  const app = createApp();

  const baseFixedRule: DiscountRule = {
    id: 'disc-1',
    code: 'SAVE500',
    type: 'FIXED',
    value: 50000, // ₹500.00 (50000 paise)
    minQuantity: 0,
    minPurchaseAmount: 0,
    startDate: null,
    endDate: null,
    maxUses: 0,
    currentUses: 0,
    productId: null,
    isActive: true,
  };

  const basePctRule: DiscountRule = {
    id: 'disc-2',
    code: 'VIP20',
    type: 'PERCENTAGE',
    value: 20.0, // 20%
    minQuantity: 0,
    minPurchaseAmount: 0,
    startDate: null,
    endDate: null,
    maxUses: 0,
    currentUses: 0,
    productId: null,
    isActive: true,
  };

  describe('DiscountService Unit Tests', () => {
    it('applies fixed discount correctly', () => {
      const res = DiscountService.validate(
        {
          code: 'SAVE500',
          subtotalCents: 150000, // ₹1,500.00
          totalQuantity: 1,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        baseFixedRule
      );

      expect(res.valid).toBe(true);
      expect(res.discountCents).toBe(50000);
      expect(res.originalAmount).toBe(150000);
      expect(res.finalAmount).toBe(100000);
    });

    it('applies percentage discount correctly', () => {
      // 20% off ₹1,000.00 (100000 paise) = 20000 paise
      const res = DiscountService.validate(
        {
          code: 'VIP20',
          subtotalCents: 100000,
          totalQuantity: 2,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        basePctRule
      );

      expect(res.valid).toBe(true);
      expect(res.discountCents).toBe(20000);
      expect(res.finalAmount).toBe(80000);
    });

    it('rejects expired discount', () => {
      const expiredRule: DiscountRule = {
        ...baseFixedRule,
        code: 'EXPIRED10',
        endDate: '2026-10-01T00:00:00Z',
      };

      const res = DiscountService.validate(
        {
          code: 'EXPIRED10',
          subtotalCents: 100000,
          totalQuantity: 1,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        expiredRule
      );

      expect(res.valid).toBe(false);
      expect(res.discountCents).toBe(0);
      expect(res.reason).toBe('Discount has expired');
    });

    it('rejects not-yet-active discount', () => {
      const futureRule: DiscountRule = {
        ...baseFixedRule,
        code: 'FUTURE10',
        startDate: '2026-11-15T00:00:00Z',
      };

      const res = DiscountService.validate(
        {
          code: 'FUTURE10',
          subtotalCents: 100000,
          totalQuantity: 1,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        futureRule
      );

      expect(res.valid).toBe(false);
      expect(res.discountCents).toBe(0);
      expect(res.reason).toBe('Discount has not started yet');
    });

    it('rejects discount when usage limit is exhausted', () => {
      const exhaustedRule: DiscountRule = {
        ...baseFixedRule,
        code: 'ONETIME',
        maxUses: 100,
        currentUses: 100,
      };

      const res = DiscountService.validate(
        {
          code: 'ONETIME',
          subtotalCents: 100000,
          totalQuantity: 1,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        exhaustedRule
      );

      expect(res.valid).toBe(false);
      expect(res.reason).toBe('Discount usage limit reached');
    });

    it('rejects discount when minimum quantity requirement is not met', () => {
      const minQtyRule: DiscountRule = {
        ...baseFixedRule,
        code: 'BULK5',
        minQuantity: 5,
      };

      const res = DiscountService.validate(
        {
          code: 'BULK5',
          subtotalCents: 100000,
          totalQuantity: 4, // 4 < 5
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        minQtyRule
      );

      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Minimum quantity threshold of 5 not met');
    });

    it('rejects discount when minimum purchase amount is not met', () => {
      const minSpendRule: DiscountRule = {
        ...baseFixedRule,
        code: 'SPEND2000',
        minPurchaseAmount: 200000, // ₹2,000.00
      };

      const res = DiscountService.validate(
        {
          code: 'SPEND2000',
          subtotalCents: 150000, // ₹1,500.00 < ₹2,000.00
          totalQuantity: 1,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        minSpendRule
      );

      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Minimum purchase amount of 200000 cents not met');
    });

    it('clamps discount so it NEVER exceeds the eligible purchase amount', () => {
      // Subtotal ₹300.00 (30000 paise), fixed discount ₹500.00 (50000 paise)
      // Discount must be capped at ₹300.00, remaining = 0
      const res = DiscountService.validate(
        {
          code: 'BIGDISCOUNT',
          subtotalCents: 30000,
          totalQuantity: 1,
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        baseFixedRule
      );

      expect(res.valid).toBe(true);
      expect(res.discountCents).toBe(30000); // capped at subtotal
      expect(res.finalAmount).toBe(0); // never negative
    });

    it('validates product-specific discounts', () => {
      const productRule: DiscountRule = {
        ...basePctRule,
        code: 'CRM10',
        productId: 'prod-crm-001',
      };

      // Matched product -> valid
      const matchRes = DiscountService.validate(
        {
          code: 'CRM10',
          subtotalCents: 50000,
          totalQuantity: 1,
          productId: 'prod-crm-001',
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        productRule
      );
      expect(matchRes.valid).toBe(true);

      // Mismatched product -> rejected
      const mismatchRes = DiscountService.validate(
        {
          code: 'CRM10',
          subtotalCents: 50000,
          totalQuantity: 1,
          productId: 'prod-other-999',
          evaluationDate: '2026-10-31T12:00:00Z',
        },
        productRule
      );
      expect(mismatchRes.valid).toBe(false);
      expect(mismatchRes.reason).toContain('Discount is product-specific');
    });

    it('calculates audit response via calculate() method', () => {
      const calcRes = DiscountService.calculate({
        subtotalCents: 80000,
        totalQuantity: 2,
        rule: basePctRule,
        evaluationDate: '2026-10-31T12:00:00Z',
      });

      expect(calcRes.eligible).toBe(true);
      expect(calcRes.discountAmount).toBe(16000); // 20% of 80000
      expect(calcRes.remainingAmount).toBe(64000);
      expect(calcRes.reasons.length).toBe(0);
    });
  });

  describe('HTTP Endpoints Integration', () => {
    it('POST /api/v1/discounts/validate returns validation response', async () => {
      const res = await request(app)
        .post('/api/v1/discounts/validate')
        .send({
          code: 'SAVE500',
          subtotal_cents: 100000,
          total_quantity: 1,
          rule: baseFixedRule,
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.discountCents).toBe(50000);
      expect(res.body.finalAmount).toBe(50000);
    });

    it('POST /api/v1/discounts/calculate returns calculation breakdown', async () => {
      const res = await request(app)
        .post('/api/v1/discounts/calculate')
        .send({
          subtotal_cents: 60000,
          total_quantity: 1,
          rule: basePctRule,
        });

      expect(res.status).toBe(200);
      expect(res.body.eligible).toBe(true);
      expect(res.body.discountAmount).toBe(12000); // 20% of 60000
      expect(res.body.remainingAmount).toBe(48000);
    });
  });
});
