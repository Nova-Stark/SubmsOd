import { Request, Response } from 'express';
import {
  CalculateInvoiceRequest,
  CalculateInvoiceResponse,
  GenerateInvoicePdfRequest,
} from './invoice.types';

export class InvoiceController {
  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculateInvoiceRequest;

    const subtotal = data.lines.reduce((sum, line) => {
      const extra = line.variants.reduce((acc, v) => acc + v.priceExtra, 0);
      return sum + (line.basePrice + extra) * line.quantity;
    }, 0);

    const response: CalculateInvoiceResponse = {
      lines: data.lines.map((line) => {
        const extra = line.variants.reduce((acc, v) => acc + v.priceExtra, 0);
        const unitPrice = line.basePrice + extra;
        const lineSubtotal = unitPrice * line.quantity;
        return {
          productId: line.productId,
          productName: line.productName,
          basePrice: line.basePrice,
          variantExtra: extra,
          unitPrice,
          quantity: line.quantity,
          lineSubtotal,
          lineDiscount: 0,
          taxableAmount: lineSubtotal,
          lineTax: 0,
          lineTotal: lineSubtotal,
        };
      }),
      subtotal,
      discountTotal: 0,
      taxTotal: 0,
      finalTotal: subtotal,
      currency: data.currency,
      appliedDiscounts: [],
      appliedTaxes: [],
    };

    res.status(200).json(response);
  }

  static async generatePdf(req: Request, res: Response): Promise<void> {
    const data = req.body as GenerateInvoicePdfRequest;

    // Hour 0-1 stub response for contract validation
    res.status(200).json({
      success: true,
      invoiceNumber: data.invoiceNumber,
      message: 'PDF generation contract verified',
    });
  }
}
