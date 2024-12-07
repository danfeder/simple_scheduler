import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, 'Validation Error', error.errors));
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, 'Invalid Query Parameters', error.errors));
      } else {
        next(error);
      }
    }
  };
};

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.errors
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}; 