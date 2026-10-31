import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { MoneyUtil } from '../src/utils/money';

describe('Hour 0-1: Integration Contracts & Data Models', () => {
  const app = createApp();

  describe('Health Check Endpoint', () => {
    it('should return 200 OK with service metadata', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('brightloop-business-logic');
    });
  });

  describe('Pricing API Contract & Validation', () => {
    it('should accept valid snake_case payload from Go and return calculated price', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .send({
          base_price: 10000,
          quantity: 2,
          variant_adjustments: [
            { variant_name: 'Brand: Odoo', price_extra: 56000 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.basePrice).toBe(10000);
      expect(res.body.totalAdjustment).toBe(56000);
      expect(res.body.finalUnitPrice).toBe(66000);
      expect(res.body.quantity).toBe(2);
      expect(res.body.lineAmount).toBe(132000);
    });

    it('should reject invalid or negative quantity with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .send({
          base_price: 10000,
          quantity: -1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject missing base price with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/pricing/calculate')
        .send({
          quantity: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Tax API Contract & Validation', () => {
    it('should accept valid tax calculation payload', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({
          taxable_amount: 10000,
          tax_rules: [
            { name: 'GST', rate_percentage: 18.0, is_active: true },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.taxableAmount).toBe(10000);
    });

    it('should reject negative taxable amount with 400', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({
          taxable_amount: -500,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Discount API Contract & Validation', () => {
    it('should accept valid discount validation payload matching Go model', async () => {
      const res = await request(app)
        .post('/api/v1/discounts/validate')
        .send({
          code: 'SAVE20',
          total_quantity: 2,
          subtotal_cents: 50000,
        });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('SAVE20');
      expect(res.body.originalAmount).toBe(50000);
    });

    it('should reject empty code with 400', async () => {
      const res = await request(app)
        .post('/api/v1/discounts/validate')
        .send({
          code: '',
          subtotal_cents: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Invoice Calculation Contract & Validation', () => {
    it('should accept invoice calculation request and return response', async () => {
      const res = await request(app)
        .post('/api/v1/invoices/calculate')
        .send({
          lines: [
            {
              product_id: 'prod-1',
              product_name: 'Brightloop CRM',
              base_price: 15000,
              quantity: 2,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.lines.length).toBe(1);
      expect(res.body.subtotal).toBe(30000);
    });

    it('should reject invoice with empty lines', async () => {
      const res = await request(app)
        .post('/api/v1/invoices/calculate')
        .send({
          lines: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Monetary Precision Utilities', () => {
    it('should round deterministically', () => {
      expect(MoneyUtil.round(123.49)).toBe(123);
      expect(MoneyUtil.round(123.50)).toBe(124);
      expect(MoneyUtil.round(123.51)).toBe(124);
    });

    it('should calculate percentages accurately on minor units', () => {
      // 18% of 10000 paise ($100.00 / INR 100.00) = 1800 paise
      expect(MoneyUtil.calculatePercentage(10000, 18)).toBe(1800);
      // 5% of 999 paise = 49.95 -> 50 paise
      expect(MoneyUtil.calculatePercentage(999, 5)).toBe(50);
    });

    it('should extract inclusive taxes correctly', () => {
      // Gross: 11800 paise with 18% VAT:
      // Tax = 11800 * 18 / 118 = 1800 paise, Net = 10000 paise
      const { taxAmount, netAmount } = MoneyUtil.extractInclusiveTax(11800, 18);
      expect(taxAmount).toBe(1800);
      expect(netAmount).toBe(10000);
      expect(taxAmount + netAmount).toBe(11800);
    });

    it('should calculate exclusive taxes correctly', () => {
      // Net: 10000 paise with 18% VAT:
      // Tax = 1800 paise, Gross = 11800 paise
      const { taxAmount, grossAmount } = MoneyUtil.calculateExclusiveTax(10000, 18);
      expect(taxAmount).toBe(1800);
      expect(grossAmount).toBe(11800);
    });

    it('should prevent negative amounts', () => {
      expect(MoneyUtil.clampNonNegative(-1500)).toBe(0);
      expect(MoneyUtil.clampNonNegative(2500)).toBe(2500);
    });

    it('should format minor units properly', () => {
      expect(MoneyUtil.format(10000, 'INR')).toBe('₹100.00');
      expect(MoneyUtil.format(56000, 'USD')).toBe('USD 560.00');
    });
  });
});
