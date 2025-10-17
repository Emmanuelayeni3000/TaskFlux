import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next();
    return;
  }

  next(new HttpError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const defaultStatus = 500;
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof Error) {
    res.status(defaultStatus).json({ message: err.message });
    return;
  }

  res.status(defaultStatus).json({ message: 'Unexpected server error' });
};
