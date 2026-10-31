import { Request, Response } from 'express';
import { CalculateTaxRequest } from './tax.types';
import { TaxService } from './tax.service';

export class TaxController {
  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculateTaxRequest;
    const result = TaxService.calculate(data);
    res.status(200).json(result);
  }
}
