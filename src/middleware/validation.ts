import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodTypeDef, ZodError } from 'zod';

export function validateBody<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = any>(
  schema: ZodType<Output, Def, Input>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: 'Invalid request body',
      });
    }
  };
}
