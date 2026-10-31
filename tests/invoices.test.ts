import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { InvoiceService } from '../src/modules/invoices/invoice.service';
import { InvoicePdfService } from '../src/modules/invoices/invoice-pdf.service';

describe('Invoice Calculation & PDF Generation Engine (Hour 3-5)', () => {
  const app = createApp();

  describe('InvoiceService Unit Tests', () => {
    it('calculates invoice with multiple line items', () => {
      const result = InvoiceService.calculate({
        lines: [
          {
            productId: 'prod-1',
            productName: 'Brightloop CRM',
            basePrice: 15000,
            quantity: 2,
            variants: [],
            taxRules: [],
          },
          {
            productId: 'prod-2',
            productName: 'Brightloop ERP',
            basePrice: 25000,
            quantity: 1,
            variants: [{ name: 'Brand: Odoo', priceExtra: 56000 }],
            taxRules: [],
          },
        ],
        discounts: [],
        globalTaxRules: [],
        currency: 'INR',
      });

      expect(result.lines.length).toBe(2);
      // Line 1: 15000 * 2 = 30000
      expect(result.lines[0].lineSubtotal).toBe(30000);
      // Line 2: (25000 + 56000) * 1 = 81000
      expect(result.lines[1].lineSubtotal).toBe(81000);
      expect(result.subtotal).toBe(111000);
      expect(result.discountTotal).toBe(0);
      expect(result.taxTotal).toBe(0);
      expect(result.finalTotal).toBe(111000);
    });

    it('applies subscription-wide discount and calculates taxes together', () => {
      const result = InvoiceService.calculate({
        lines: [
          {
            productId: 'prod-1',
            productName: 'Brightloop CRM',
            basePrice: 50000, // ₹500.00
            quantity: 2,
            variants: [],
            taxRules: [],
          },
        ],
        discounts: [
          {
            id: 'disc-1',
            code: 'SAVE20',
            type: 'PERCENTAGE',
            value: 20.0,
            minQuantity: 0,
            minPurchaseAmount: 0,
            startDate: null,
            endDate: null,
            maxUses: 0,
            currentUses: 0,
            productId: null,
            isActive: true,
          },
        ],
        globalTaxRules: [
          {
            name: 'GST 18%',
            type: 'PERCENTAGE',
            ratePercentage: 18.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
        ],
        currency: 'INR',
      });

      // Subtotal: 50000 * 2 = 100000
      expect(result.subtotal).toBe(100000);
      // Discount: 20% of 100000 = 20000
      expect(result.discountTotal).toBe(20000);
      // Taxable: 100000 - 20000 = 80000
      // Tax: 18% of 80000 = 14400
      expect(result.taxTotal).toBe(14400);
      // Final: 100000 - 20000 + 14400 = 94400
      expect(result.finalTotal).toBe(94400);
      expect(result.appliedDiscounts.length).toBe(1);
      expect(result.appliedTaxes.length).toBe(1);
    });

    it('handles zero-value invoice correctly', () => {
      const result = InvoiceService.calculate({
        lines: [
          {
            productId: 'prod-free',
            productName: 'Free Trial',
            basePrice: 0,
            quantity: 1,
            variants: [],
            taxRules: [],
          },
        ],
        discounts: [],
        globalTaxRules: [],
        currency: 'INR',
      });

      expect(result.subtotal).toBe(0);
      expect(result.finalTotal).toBe(0);
    });

    it('ensures rounding consistency: no fractional paise in totals', () => {
      const result = InvoiceService.calculate({
        lines: [
          {
            productId: 'prod-1',
            productName: 'Odd-Priced Item',
            basePrice: 333,
            quantity: 3,
            variants: [],
            taxRules: [],
          },
        ],
        discounts: [],
        globalTaxRules: [
          {
            name: 'GST 18%',
            type: 'PERCENTAGE',
            ratePercentage: 18.0,
            fixedAmount: 0,
            isInclusive: false,
            isActive: true,
          },
        ],
        currency: 'INR',
      });

      // Subtotal: 333 * 3 = 999
      expect(result.subtotal).toBe(999);
      // Tax: round(999 * 0.18) = round(179.82) = 180
      expect(result.taxTotal).toBe(180);
      expect(result.finalTotal).toBe(1179);

      // Verify all values are integers
      expect(Number.isInteger(result.subtotal)).toBe(true);
      expect(Number.isInteger(result.taxTotal)).toBe(true);
      expect(Number.isInteger(result.finalTotal)).toBe(true);
      for (const line of result.lines) {
        expect(Number.isInteger(line.lineSubtotal)).toBe(true);
        expect(Number.isInteger(line.lineTax)).toBe(true);
        expect(Number.isInteger(line.lineTotal)).toBe(true);
      }
    });

    it('final total never goes negative even with large discounts', () => {
      const result = InvoiceService.calculate({
        lines: [
          {
            productId: 'prod-1',
            productName: 'Small Purchase',
            basePrice: 1000,
            quantity: 1,
            variants: [],
            taxRules: [],
          },
        ],
        discounts: [
          {
            id: 'disc-big',
            code: 'BIGOFF',
            type: 'FIXED',
            value: 999999, // way more than subtotal
            minQuantity: 0,
            minPurchaseAmount: 0,
            startDate: null,
            endDate: null,
            maxUses: 0,
            currentUses: 0,
            productId: null,
            isActive: true,
          },
        ],
        globalTaxRules: [],
        currency: 'INR',
      });

      // Discount capped at subtotal (1000)
      expect(result.discountTotal).toBe(1000);
      expect(result.finalTotal).toBe(0);
      expect(result.finalTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HTTP POST /api/v1/invoices/calculate Integration', () => {
    it('accepts Go-compatible payload and returns full invoice breakdown', async () => {
      const res = await request(app)
        .post('/api/v1/invoices/calculate')
        .send({
          lines: [
            {
              product_id: 'prod-erp',
              product_name: 'Brightloop ERP',
              base_price: 10000,
              quantity: 5,
              variant_adjustments: [
                { variant_name: 'Brand: Odoo', price_extra: 56000 },
              ],
            },
          ],
          tax_rules: [
            { name: 'GST', rate_percentage: 18.0, is_active: true },
          ],
          currency: 'INR',
        });

      expect(res.status).toBe(200);
      // (10000 + 56000) * 5 = 330000
      expect(res.body.subtotal).toBe(330000);
      // 18% of 330000 = 59400
      expect(res.body.taxTotal).toBe(59400);
      // 330000 + 59400 = 389400
      expect(res.body.finalTotal).toBe(389400);
    });

    it('rejects invoice with no lines as 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/invoices/calculate')
        .send({ lines: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Invoice PDF Generation', () => {
    it('generates a valid PDF buffer from InvoicePdfService', async () => {
      const pdfBuffer = await InvoicePdfService.generate({
        invoiceNumber: 'INV-2026-001',
        issueDate: '2026-10-31',
        dueDate: '2026-11-15',
        customer: {
          name: 'Aadi Dahiya',
          email: 'thisisaadid@gmail.com',
          address: 'New Delhi, India',
          taxId: 'GSTIN1234567890',
        },
        lines: [
          {
            productName: 'Brightloop ERP (Odoo)',
            unitPrice: 66000,
            quantity: 5,
            lineAmount: 330000,
          },
        ],
        subtotal: 330000,
        discountTotal: 0,
        taxTotal: 59400,
        finalTotal: 389400,
        currency: 'INR',
        notes: 'Thank you for your business!',
      });

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');
    });

    it('POST /api/v1/invoices/pdf returns a PDF binary with correct headers', async () => {
      const res = await request(app)
        .post('/api/v1/invoices/pdf')
        .send({
          invoiceNumber: 'INV-2026-002',
          issueDate: '2026-10-31',
          dueDate: '2026-11-15',
          customer: {
            name: 'Test Customer',
            email: 'test@example.com',
          },
          lines: [
            {
              productName: 'Test Product',
              unitPrice: 10000,
              quantity: 1,
              lineAmount: 10000,
            },
          ],
          subtotal: 10000,
          discountTotal: 0,
          taxTotal: 1800,
          finalTotal: 11800,
          currency: 'INR',
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('invoice-INV-2026-002.pdf');
      // Body is the raw PDF
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(100);
    });
  });
});
