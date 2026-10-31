import { Request, Response } from 'express';
import { CalculateInvoiceRequest, GenerateInvoicePdfRequest } from './invoice.types';
import { InvoiceService } from './invoice.service';
import { InvoicePdfService } from './invoice-pdf.service';

export class InvoiceController {
  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculateInvoiceRequest;
    const result = InvoiceService.calculate(data);
    res.status(200).json(result);
  }

  static async generatePdf(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as GenerateInvoicePdfRequest;
      const pdfBuffer = await InvoicePdfService.generate(data);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${data.invoiceNumber}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'PDF generation failed';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}
