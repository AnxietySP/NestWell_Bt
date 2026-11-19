import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function errorHandler(
  err: Error & { statusCode?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode || 500;
  if (status >= 500) {
    console.error('[ServerError]', err);
  }
  res.status(status).json({
    message:
      status === 500 && env.NODE_ENV === 'production'
        ? 'An unexpected server error occurred.'
        : err.message,
  });
}
