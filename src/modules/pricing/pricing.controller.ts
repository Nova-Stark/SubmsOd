import { Request, Response } from 'express';
import { CalculatePricingRequest, CalculatePricingResponse } from './pricing.types';

export class PricingController {
  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculatePricingRequest;
    
    const totalAdjustment = data.variantAdjustments.reduce((sum, v) => sum + v.priceExtra, 0);
    const finalUnitPrice = Math.max(0, data.basePrice + totalAdjustment);
    const lineAmount = finalUnitPrice * data.quantity;

    const response: CalculatePricingResponse = {
      basePrice: data.basePrice,
      totalAdjustment,
      finalUnitPrice,
      quantity: data.quantity,
      lineAmount,
    };

    res.status(200).json(response);
  }
}
