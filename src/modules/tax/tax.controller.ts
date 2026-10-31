import { Request, Response } from 'express';
import { CalculateTaxRequest, CalculateTaxResponse } from './tax.types';

export class TaxController {
  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculateTaxRequest;
    
    // Stub implementation honoring the contract for Hour 0-1
    const response: CalculateTaxResponse = {
      taxableAmount: data.taxableAmount,
      inclusiveTaxTotal: 0,
      exclusiveTaxTotal: 0,
      totalTax: 0,
      netAmount: data.taxableAmount,
      grossAmount: data.taxableAmount,
      appliedTaxes: [],
    };

    res.status(200).json(response);
  }
}
