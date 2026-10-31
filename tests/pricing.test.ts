import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { PricingService } from '../src/modules/pricing/pricing.service';

describe('Pricing Calculation Engine (Unit & Integration)', () => {
  const app = createApp();

  describe('PricingService Unit Tests', () => {
    it('calculates price for standard product without variants', () => {
      const result = PricingService.calculate({
        basePrice: 10000, // ₹100.00
        quantity: 1,
        variantAdjustments: [],
      });

      expect(result.basePrice).toBe(10000);
      expect(result.totalAdjustment).toBe(0);
      expect(result.finalUnitPrice).toBe(10000);
      expect(result.quantity).toBe(1);
      expect(result.lineAmount).toBe(10000);
    });

    it('calculates price for product with single positive variant adjustment', () => {
      // Base: $100.00 (10000 cents), Odoo variant: +$560.00 (56000 cents)
      const result = PricingService.calculate({
        basePrice: 10000,
        quantity: 2,
        variantAdjustments: [
          { name: 'Brand: Odoo', priceExtra: 56000 },
        ],
      });

      expect(result.totalAdjustment).toBe(56000);
      expect(result.finalUnitPrice).toBe(66000); // 10000 + 56000
      expect(result.lineAmount).toBe(132000); // 66000 * 2
    });

    it('calculates price with multiple variant adjustments', () => {
      const result = PricingService.calculate({
        basePrice: 20000,
        quantity: 3,
        variantAdjustments: [
          { name: 'Storage: 1TB', priceExtra: 5000 },
          { name: 'RAM: 32GB', priceExtra: 7000 },
          { name: 'Support: Priority', priceExtra: 3000 },
        ],
      });

      expect(result.totalAdjustment).toBe(15000);
      expect(result.finalUnitPrice).toBe(35000);
      expect(result.lineAmount).toBe(105000); // 35000 * 3
    });

    it('handles negative variant adjustments correctly', () => {
      const result = PricingService.calculate({
        basePrice: 10000,
        quantity: 2,
        variantAdjustments: [
          { name: 'Downgrade Discount', priceExtra: -2500 },
        ],
      });

      expect(result.totalAdjustment).toBe(-2500);
      expect(result.finalUnitPrice).toBe(7500);
      expect(result.lineAmount).toBe(15000);
    });

    it('clamps unit price to 0 when negative adjustment exceeds base price', () => {
      const result = PricingService.calculate({
        basePrice: 3000,
        quantity: 1,
        variantAdjustments: [
          { name: 'Extreme Promo', priceExtra: -5000 },
        ],
      });

      expect(result.finalUnitPrice).toBe(0);
      expect(result.lineAmount).toBe(0);
    });

    it('handles zero base price correctly', () => {
      const result = PricingService.calculate({
        basePrice: 0,
        quantity: 5,
        variantAdjustments: [
          { name: 'Add-on License', priceExtra: 1500 },
        ],
      });

      expect(result.basePrice).toBe(0);
      expect(result.finalUnitPrice).toBe(1500);
      expect(result.lineAmount).toBe(7500);
    });

    it('throws error for invalid or non-positive quantity in service', () => {
      expect(() =>
        PricingService.calculate({
          basePrice: 1000,
          quantity: 0,
          variantAdjustments: [],
        })
      ).toThrow('Quantity must be a positive integer');
    });
  });

  describe('HTTP POST /api/v1/pricing/calculate Integration', () => {
    it('accepts Go-compatible snake_case JSON and returns 200 with accurate calculation', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .send({
          base_price: 15000,
          quantity: 4,
          variant_adjustments: [
            { variant_name: 'Region: APAC', price_extra: 2500 },
            { variant_name: 'Edition: Enterprise', price_extra: 5000 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.basePrice).toBe(15000);
      expect(res.body.totalAdjustment).toBe(7500);
      expect(res.body.finalUnitPrice).toBe(22500);
      expect(res.body.quantity).toBe(4);
      expect(res.body.lineAmount).toBe(90000);
    });

    it('rejects missing base price with 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .send({
          quantity: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });
});
