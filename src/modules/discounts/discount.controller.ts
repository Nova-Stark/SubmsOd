import { Request, Response } from 'express';
import {
  ValidateDiscountRequest,
  ValidateDiscountResponse,
  CalculateDiscountRequest,
  CalculateDiscountResponse,
} from './discount.types';

export class DiscountController {
  static async validate(req: Request, res: Response): Promise<void> {
    const data = req.body as ValidateDiscountRequest;

    const response: ValidateDiscountResponse = {
      valid: true,
      code: data.code,
      discountCents: 0,
      originalAmount: data.subtotalCents,
      finalAmount: data.subtotalCents,
    };

    res.status(200).json(response);
  }

  static async calculate(req: Request, res: Response): Promise<void> {
    const data = req.body as CalculateDiscountRequest;

    const response: CalculateDiscountResponse = {
      eligible: true,
      code: data.rule.code,
      type: data.rule.type,
      discountAmount: 0,
      eligibleAmount: data.subtotalCents,
      remainingAmount: data.subtotalCents,
      reasons: [],
    };

    res.status(200).json(response);
  }
}
