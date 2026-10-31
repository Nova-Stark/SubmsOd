import { Request, Response } from 'express';
import {
  ValidateDiscountRequest,
  CalculateDiscountRequest,
} from './discount.types';
import { DiscountService } from './discount.service';

export class DiscountController {
  static async validate(req: Request, res: Response): Promise<void> {
    const data = req.body as ValidateDiscountRequest;
    const result = DiscountService.validate(data);
    res.status(200).json(result);
  }

  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculateDiscountRequest;
    const result = DiscountService.calculate(data);
    res.status(200).json(result);
  }
}
