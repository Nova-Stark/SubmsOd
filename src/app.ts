import express, { Application, Request, Response } from 'express';
import { validateBody } from './middleware/validation';
import { errorHandler } from './middleware/error-handler';
import { CalculatePricingRequestSchema } from './modules/pricing/pricing.types';
import { PricingController } from './modules/pricing/pricing.controller';
import { CalculateTaxRequestSchema } from './modules/tax/tax.types';
import { TaxController } from './modules/tax/tax.controller';
import {
  ValidateDiscountRequestSchema,
  CalculateDiscountRequestSchema,
} from './modules/discounts/discount.types';
import { DiscountController } from './modules/discounts/discount.controller';
import {
  CalculateInvoiceRequestSchema,
  GenerateInvoicePdfRequestSchema,
} from './modules/invoices/invoice.types';
import { InvoiceController } from './modules/invoices/invoice.controller';

export function createApp(): Application {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'brightloop-business-logic',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API v1 Routing
  const apiV1 = express.Router();

  // Pricing
  apiV1.post(
    '/pricing/calculate',
    validateBody(CalculatePricingRequestSchema),
    PricingController.calculate
  );

  // Tax
  apiV1.post(
    '/tax/calculate',
    validateBody(CalculateTaxRequestSchema),
    TaxController.calculate
  );

  // Discounts
  apiV1.post(
    '/discounts/validate',
    validateBody(ValidateDiscountRequestSchema),
    DiscountController.validate
  );
  apiV1.post(
    '/discounts/calculate',
    validateBody(CalculateDiscountRequestSchema),
    DiscountController.calculate
  );

  // Invoices
  apiV1.post(
    '/invoices/calculate',
    validateBody(CalculateInvoiceRequestSchema),
    InvoiceController.calculate
  );
  apiV1.post(
    '/invoices/pdf',
    validateBody(GenerateInvoicePdfRequestSchema),
    InvoiceController.generatePdf
  );

  app.use('/api/v1', apiV1);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
