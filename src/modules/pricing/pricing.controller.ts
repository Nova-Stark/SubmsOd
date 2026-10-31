import { Request, Response } from 'express';
import { CalculatePricingRequest } from './pricing.types';
import { PricingService } from './pricing.service';

export class PricingController {
  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculatePricingRequest;
    const result = PricingService.calculate(data);
    res.status(200).json(result);
  }
}
