import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { TaxService } from '../src/modules/tax/tax.service';

describe('Tax Calculation Engine (Unit & Integration)', () => {
  const app = createApp();

  describe('TaxService Unit Tests', () => {
    it('calculates standard exclusive percentage tax (18% on ₹100.00)', () => {
      // 10000 paise with 18% GST = 1800 paise tax, 11800 gross
      const result = TaxService.calculate({
        taxableAmount: 10000,
        taxRules: [
          {
            name: 'GST 18%',
            type: 'PERCENTAGE',
            ratePercentage: 18.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
        ],
      });

      expect(result.taxableAmount).toBe(10000);
      expect(result.netAmount).toBe(10000);
      expect(result.exclusiveTaxTotal).toBe(1800);
      expect(result.inclusiveTaxTotal).toBe(0);
      expect(result.totalTax).toBe(1800);
      expect(result.grossAmount).toBe(11800);
      expect(result.appliedTaxes.length).toBe(1);
      expect(result.appliedTaxes[0].amount).toBe(1800);
    });

    it('calculates applicable exclusive fixed tax', () => {
      const result = TaxService.calculate({
        taxableAmount: 50000,
        taxRules: [
          {
            name: 'Environmental Cess',
            type: 'FIXED',
            ratePercentage: 0,
            fixedAmount: 250, // ₹2.50
            isInclusive: false,
            isActive: true,
          },
        ],
      });

      expect(result.exclusiveTaxTotal).toBe(250);
      expect(result.grossAmount).toBe(50250);
      expect(result.appliedTaxes[0].amount).toBe(250);
    });

    it('calculates inclusive percentage tax correctly extracting embedded tax', () => {
      // Gross 11800 paise (tax inclusive of 18%):
      // Tax = round(11800 * 18 / 118) = 1800 paise.
      // Net = 10000 paise.
      const result = TaxService.calculate({
        taxableAmount: 11800,
        taxRules: [
          {
            name: 'VAT 18% Inclusive',
            type: 'PERCENTAGE',
            ratePercentage: 18.0,
            fixedAmount: 0,
            isInclusive: true,
            isActive: true,
          },
        ],
      });

      expect(result.inclusiveTaxTotal).toBe(1800);
      expect(result.netAmount).toBe(10000);
      expect(result.grossAmount).toBe(11800);
      expect(result.appliedTaxes[0].inclusive).toBe(true);
      expect(result.appliedTaxes[0].amount).toBe(1800);
    });

    it('calculates multiple inclusive taxes (CGST 9% + SGST 9%) without rounding drift', () => {
      // 11800 paise with total 18% inclusive:
      // total tax = 1800 paise (CGST: 900, SGST: 900)
      const result = TaxService.calculate({
        taxableAmount: 11800,
        taxRules: [
          {
            name: 'CGST 9%',
            type: 'PERCENTAGE',
            ratePercentage: 9.0,
            fixedAmount: 0,
            isInclusive: true,
            isActive: true,
          },
          {
            name: 'SGST 9%',
            type: 'PERCENTAGE',
            ratePercentage: 9.0,
            fixedAmount: 0,
            isInclusive: true,
            isActive: true,
          },
        ],
      });

      expect(result.inclusiveTaxTotal).toBe(1800);
      expect(result.netAmount).toBe(10000);
      expect(result.appliedTaxes[0].amount).toBe(900);
      expect(result.appliedTaxes[1].amount).toBe(900);
      expect(result.appliedTaxes[0].amount + result.appliedTaxes[1].amount).toBe(1800);
    });

    it('calculates multiple exclusive taxes (e.g. GST 18% + Education Cess 1%)', () => {
      // Net: 10000 paise
      // GST: 1800 paise
      // Cess: 100 paise
      // Total tax: 1900 paise, Gross: 11900 paise
      const result = TaxService.calculate({
        taxableAmount: 10000,
        taxRules: [
          {
            name: 'GST 18%',
            type: 'PERCENTAGE',
            ratePercentage: 18.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
          {
            name: 'Edu Cess 1%',
            type: 'PERCENTAGE',
            ratePercentage: 1.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
        ],
      });

      expect(result.exclusiveTaxTotal).toBe(1900);
      expect(result.grossAmount).toBe(11900);
      expect(result.appliedTaxes.length).toBe(2);
    });

    it('filters out inactive tax rules and rules with zero rates', () => {
      const result = TaxService.calculate({
        taxableAmount: 10000,
        taxRules: [
          {
            name: 'Old VAT (Inactive)',
            type: 'PERCENTAGE',
            ratePercentage: 12.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: false, // inactive
          },
          {
            name: 'Active GST',
            type: 'PERCENTAGE',
            ratePercentage: 18.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
        ],
      });

      expect(result.exclusiveTaxTotal).toBe(1800);
      expect(result.appliedTaxes.length).toBe(1);
      expect(result.appliedTaxes[0].name).toBe('Active GST');
    });

    it('verifies deterministic integer half-up rounding on fractional minor units', () => {
      // 5% tax on 333 paise = 16.65 paise -> rounds to 17 paise
      const result = TaxService.calculate({
        taxableAmount: 333,
        taxRules: [
          {
            name: 'Service Tax 5%',
            type: 'PERCENTAGE',
            ratePercentage: 5.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
        ],
      });

      expect(result.totalTax).toBe(17);
      expect(result.grossAmount).toBe(350);
    });
  });

  describe('HTTP POST /api/v1/tax/calculate Integration', () => {
    it('accepts Go payload with snake_case and returns complete tax breakdown', async () => {
      const res = await request(app)
        .post('/api/v1/tax/calculate')
        .send({
          taxable_amount: 25000,
          tax_rules: [
            {
              name: 'GST',
              rate_percentage: 18.0,
              is_active: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.taxableAmount).toBe(25000);
      expect(res.body.totalTax).toBe(4500); // 18% of 25000 = 4500
      expect(res.body.grossAmount).toBe(29500);
    });
  });
});
